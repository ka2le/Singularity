import gym
import tensorflow as tf
from tf_agents.policies.policy_saver import PolicySaver
from tf_agents.environments import gym_wrapper
from simple import SimpleCardGameEnv
from tf_agents.trajectories import time_step as ts



def useAgent(agent):


    print(f"Type of agent before useAgent(): {type(agent)}")
    num_episodes =10
    gym_env = SimpleCardGameEnv()
    environment =  gym_wrapper.GymWrapper(gym_env)

    total_reward = 0.0
    for _ in range(num_episodes):
        time_step = environment.reset()
        episode_reward = 0.0
        while not time_step.is_last():
            observation = {key: tf.expand_dims(value, axis=0) 
                       for key, value in time_step.observation.items()}
            current_observation = time_step.observation
            new_time_step = ts.TimeStep(time_step.step_type, time_step.reward, 
                                     time_step.discount, current_observation)
            action_step = agent.policy.action(new_time_step)
            time_step = environment.step(action_step.action)
            episode_reward += time_step.reward
        total_reward += episode_reward
    avg_reward = total_reward / num_episodes
    print(f'Average test reward over {num_episodes} episodes: {avg_reward.numpy()[0]}')