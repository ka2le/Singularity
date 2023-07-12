import tensorflow as tf
tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.ERROR)
import math
import numpy as np
from collections import defaultdict
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from tf_agents.environments import suite_gym
from tf_agents.networks import q_network
from tf_agents.agents.dqn import dqn_agent
from tf_agents.utils import common
from tf_agents.environments import gym_wrapper
from tf_agents.environments import tf_py_environment
from tf_agents.policies import random_tf_policy
from tf_agents.policies import tf_policy
from tf_agents.trajectories import policy_step
from tf_agents.replay_buffers import tf_uniform_replay_buffer
from tf_agents.trajectories import trajectory
from tf_agents.drivers import dynamic_step_driver
from tf_agents.networks import network
from singularity import SingularityGameEnv
from singularitySprint import SingularitySprintEnv
from simple import SimpleCardGameEnv
import config as conf
from tf_agents.networks import encoding_network
from tf_agents.keras_layers import inner_reshape
from tf_agents.policies import policy_saver
import psutil
import time

def timer_decorator(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        print("Time taken by the function is: %s minutes" % ((end_time - start_time) / 60))
        return result
    return wrapper

p = psutil.Process()
p.nice(psutil.HIGH_PRIORITY_CLASS)


class OneHotEncodingLayer(tf.keras.layers.Layer):
    def __init__(self, depth, **kwargs):
        super(OneHotEncodingLayer, self).__init__(**kwargs)
        self.depth = depth

    def call(self, input_data):
        input_data = tf.cast(input_data, tf.int32)  # Cast to integer
        one_hot_cards = [tf.one_hot(input_data[:, i], depth=self.depth, dtype=tf.float32) for i in range(input_data.shape[1])]
        return tf.concat(one_hot_cards, axis=-1)

    def get_config(self):
        config = super(OneHotEncodingLayer, self).get_config()
        config.update({"depth": self.depth})
        return config


       
def compute_avg_return(environment, policy, num_episodes=10):

    total_return = 0.0
    for _ in range(num_episodes):

        time_step = environment.reset()
        episode_return = 0.0

        while not time_step.is_last():
            action_step = policy.action(time_step)
            time_step = environment.step(action_step.action)
            episode_return += time_step.reward
        total_return += episode_return

    avg_return = total_return / num_episodes
    return avg_return.numpy()[0]



def collect_episode(environment, policy, buffer):
    episode_reward = 0
    time_step = environment.reset()
    while not time_step.is_last():
        action_step = policy.action(time_step)
        next_time_step = environment.step(action_step.action)
        traj = trajectory.from_transition(time_step, action_step, next_time_step)
        buffer.add_batch(traj)
        episode_reward += next_time_step.reward
        time_step = next_time_step
    return episode_reward

class MaskedPolicy(tf_policy.TFPolicy):
    def __init__(self, policy, q_network, env):
        super(MaskedPolicy, self).__init__(
            policy.time_step_spec,
            policy.action_spec,
            policy.policy_state_spec,
            policy.info_spec
        )
        self._policy = policy
        self._q_network = q_network
        self._env = env

    def _variables(self):
        return self._policy.variables()

    def _distribution(self, time_step, policy_state):
        # We won't change the distribution, so just delegate to the original policy.
        return self._policy.distribution(time_step, policy_state)

    def _action(self, time_step, policy_state, seed):
        # Get the unmasked action from the original policy.
        unmasked_action = self._policy.action(time_step, policy_state, seed)

        # Get the mask from the environment.
        action_mask = self._env.pyenv.envs[0].valid_action_mask()

        # If the unmasked action is invalid, choose the best valid action instead.
        if action_mask[unmasked_action.action[0]] == 0:  # check if the action is valid
            # Get Q values for all actions.
            q_values, _ = self._q_network(time_step.observation)

           # Create a mask tensor from the action mask.
            mask_tensor = tf.convert_to_tensor(action_mask, dtype=tf.bool)

            # Mask invalid actions by setting their Q values to a large negative number.
            masked_q_values = tf.where(mask_tensor, q_values, -np.inf)

            # Choose the action with the highest Q value.
            action = tf.argmax(masked_q_values, axis=1)

            # Create a new policy step with the masked action.
            action_step = policy_step.PolicyStep(action=action, state=unmasked_action.state, info=unmasked_action.info)
        else:
            # If the unmasked action is valid, use it as is.
            action_step = unmasked_action

        return action_step




class MyQNetwork(network.Network):
    def __init__(self, num_actions, fc_layer_params, observation_spec, name=None):
        super(MyQNetwork, self).__init__(
            input_tensor_spec=observation_spec,
            state_spec=(),
            name=name or 'MyQNetwork')

        # Define preprocessing layers.
        self.preprocessing_layers = {
            'current_round': tf.keras.layers.Dense(2),
            'player_score': tf.keras.layers.Dense(3),
            'player_data': tf.keras.layers.Dense(3),
            'card_play_status': tf.keras.layers.Dense(conf.NUMBER_OF_CARDS),
            'player_processing': tf.keras.layers.Dense(3),
            'player_hand': tf.keras.layers.Dense(num_actions),
            
        }

        # Define combiner.
        self.preprocessing_combiner = tf.keras.layers.Concatenate(axis=-1)

        # Define fully connected layers.
        self.fc_layers = []
        for num_units in fc_layer_params:
            self.fc_layers.append(tf.keras.layers.Dense(num_units, activation='relu'))

        # Define output layer.
        self.output_layer = tf.keras.layers.Dense(num_actions)

    def call(self, inputs, step_type=None, network_state=()):
        # Apply preprocessing layers to the appropriate inputs.
        preprocessed_inputs = []
        for key, layer in self.preprocessing_layers.items():
            preprocessed_inputs.append(layer(inputs[key]))

        # Combine the preprocessed inputs.
        combined_inputs = self.preprocessing_combiner(preprocessed_inputs)

        # Pass the combined inputs through the fully connected layers.
        fc_output = combined_inputs
        for layer in self.fc_layers:
            fc_output = layer(fc_output)

        # Get Q-values for all actions from the output layer.
        q_values = self.output_layer(fc_output)

        return q_values, network_state
    
@timer_decorator
def main(TOTAL_ITERATIONS=conf.DEFAULT_TOTAL_ITERATIONS, MODE=conf.DEFAULT_MODE):
    #gym_env = SimpleCardGameEnv()
    gym_env = SingularitySprintEnv()
    env =  gym_wrapper.GymWrapper(gym_env)
    train_env = tf_py_environment.TFPyEnvironment(env)
    eval_env = tf_py_environment.TFPyEnvironment(env)

    fc_layer_params = (conf.DEFAULT_NETWORK_WIDTH,) * conf.DEFAULT_NETWORK_DEPTH
    q_net = MyQNetwork(conf.NUMBER_OF_CARDS, fc_layer_params, train_env.observation_spec())
    optimizer = tf.compat.v1.train.AdamOptimizer(learning_rate=conf.LEARNING_RATE)
    train_step_counter = tf.Variable(0)
    epsilon_fn = tf.keras.optimizers.schedules.PolynomialDecay(
        initial_learning_rate=1.0, # initial ε
        decay_steps=TOTAL_ITERATIONS // 2,
        end_learning_rate=0.01) # final ε
    
    agent = dqn_agent.DqnAgent(
        train_env.time_step_spec(),
        train_env.action_spec(),
        q_network=q_net,
        optimizer=optimizer,
        gamma=conf.DISCOUNT_FACTOR,
        epsilon_greedy=lambda: epsilon_fn(train_step_counter), 
        td_errors_loss_fn=common.element_wise_squared_loss,
        train_step_counter=train_step_counter)
    agent.initialize()

    collect_policy = agent.collect_policy  # The original collect policy
    #collect_policy = MaskedPolicy(base_collect_policy, q_net, train_env)  # The masked collect policy
    policy =agent.policy

    replay_buffer = tf_uniform_replay_buffer.TFUniformReplayBuffer(
        data_spec=agent.collect_data_spec,
        batch_size=train_env.batch_size,
        max_length=100000)

    random_policy = random_tf_policy.RandomTFPolicy(train_env.time_step_spec(),
                                                    train_env.action_spec())

    def collect_step(environment, policy, buffer):
        time_step = environment.current_time_step()
        action_step = policy.action(time_step)
        next_time_step = environment.step(action_step.action)
        traj = trajectory.from_transition(time_step, action_step, next_time_step)
        if MODE == 'human':
            environment.pyenv.envs[0].render()

        buffer.add_batch(traj)

    def collect_data(env, policy, buffer, steps):
        for _ in range(steps):
            collect_step(env, policy, buffer)

    collect_data(train_env, random_policy, replay_buffer, steps=500)
    dataset = replay_buffer.as_dataset(
        num_parallel_calls=8, 
        sample_batch_size=conf.BATCH_SIZE, 
        num_steps=2).prefetch(100)

    iterator = iter(dataset)

    num_iterations = TOTAL_ITERATIONS 
    log_interval = math.floor(TOTAL_ITERATIONS/10)



    for _ in range(num_iterations):
        # Collect one episode and get the total reward.
        episode_reward = collect_episode(train_env, collect_policy, replay_buffer)
        # Create a trajectory from the replay buffer.
        experience, unused_info = next(iterator)
        # Train the agent with this trajectory.
        train_loss = agent.train(experience).loss
        if tf.math.is_nan(train_loss) or tf.math.is_inf(train_loss):
            print(f'Loss is NaN or inf at iteration {_}. Stopping training...')
            break
        if _ % log_interval == 0:
            print(f'Episode = {_}: Loss = {train_loss}, Reward = {episode_reward}')
    
    avg_return = compute_avg_return(eval_env, policy, 50)
    print('Average Return = ', avg_return)

    return agent
    

def test_agent(py_env, tf_env, agent, num_episodes=5):
    episode_rewards = []
    episode_actions = []
    episode_scores = []
    max_action = 1
    max_card = conf.NUMBER_OF_CARDS-1
    max_round_num = conf.NUMBER_OF_ROUNDS-1
    round_card_actions = [[[0 for _ in range(max_action+1)] for _ in range(max_card+1)] for _ in range(max_round_num+1)]
    for episode in range(num_episodes):
        time_step = tf_env.reset()
        cumulative_reward = 0
        actions = []
        scores = []
        
        while not time_step.is_last():
            py_env.render()  # Visualize Python environment
            action_step = agent.policy.action(time_step)
            render_data = py_env.render("plot")  # Assume the render function returns a dict containing score
            time_step = tf_env.step(action_step.action)
            round_num = render_data['round']
            card = render_data['played_card']
            action_type = 0#render_data['last_action'][-1]
            chosen_action = render_data['last_action'][0]
            round_card_actions[round_num][card][action_type] += 1
            cumulative_reward += time_step.reward.numpy()
            actions.append(chosen_action)
            scores.append(render_data['score'])  # Assume the score is returned from the render function
        episode_rewards.append(cumulative_reward)
        episode_actions.append(actions[0]+1)
        episode_scores.append(scores)
    return episode_rewards, episode_actions, episode_scores, round_card_actions

def visualize_agent_performance(episode_rewards, episode_actions, episode_scores, round_card_actions):
    plt.figure(figsize=(15, 5))

    plt.subplot(1, 2, 1)
    plt.plot(episode_rewards)
    plt.title('Episode Rewards')

    # plt.subplot(1, 3, 2)
    # counts = np.bincount(episode_actions)
    # x = np.arange(len(counts))
    # plt.bar(x, counts)
    # plt.xticks(x)
    # plt.title('Frequency of numbers in the array')
    # plt.xlabel('Number')
    # plt.ylabel('Frequency')


    plt.subplot(1, 2, 2)
    #plt.figure(figsize=(10, 5))
    print(round_card_actions)

    max_action = 1
    max_card = conf.NUMBER_OF_CARDS-1
    max_round_num = conf.NUMBER_OF_ROUNDS-1

    # Assume that max_action, max_card, max_round_num are predefined
    cards = list(range(max_card+1))
    actions = list(range(max_action+1))

    bar_bottoms = [0 for _ in cards]
    colormaps = [cm.get_cmap('viridis'), cm.get_cmap('inferno')]  # Provide as many colormaps as there are action types

    for action in actions:
        colormap = colormaps[action]
        for round_num in range(max_round_num+1):
            color = colormap(round_num / max(max_round_num,1))  # Get color corresponding to round number
            counts = [round_card_actions[round_num][card][action] for card in cards]
            plt.bar(cards, counts, bottom=bar_bottoms, color=color)
            for card in cards:
                bar_bottoms[card] += counts[card]

    plt.title('Card Action Counts')
    plt.xlabel('Card')
    plt.ylabel('Count')
    plt.show()

def train():
    main()

def trainAndTest(num_train, num_test = 5):
    trained_agent = main(num_train)
    gym_env = SingularitySprintEnv()
    test_env = gym_wrapper.GymWrapper(gym_env)
    tf_test_env = tf_py_environment.TFPyEnvironment(test_env)
    episode_rewards, episode_actions, episode_scores, round_card_actions = test_agent(gym_env, tf_test_env, trained_agent, num_test)
    visualize_agent_performance(episode_rewards, episode_actions, episode_scores, round_card_actions)


if __name__ == "__main__":
    trained_agent = main()
    gym_env = SingularitySprintEnv()
    test_env = gym_wrapper.GymWrapper(gym_env)
    tf_test_env = tf_py_environment.TFPyEnvironment(test_env)
    test_agent(gym_env, tf_test_env, trained_agent)





