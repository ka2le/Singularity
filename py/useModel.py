import gym
import tensorflow as tf
from tf_agents.policies.policy_saver import PolicySaver
from tf_agents.environments import gym_wrapper
from simple import SimpleCardGameEnv
from tf_agents.trajectories import time_step as ts

def useModel():
    # Step 1: Load the trained policy from the saved folder
    restored_agent = tf.saved_model.load('my_saved_agent')
    # Print out the available keys
    restored_agent = tf.saved_model.load('my_saved_agent')

    print(restored_agent._wrapped_policy)
    print(restored_agent.signatures)



    def action_fn(time_step):
        # Need to add the batch dimension to the observations
        observation = tf.nest.map_structure(lambda x: x[None, ...], time_step.observation)
        action_step = restored_agent.action(observation)
        return action_step.action


    # Step 2: Create an instance of the OpenAI Gym environment
    gym_env = SimpleCardGameEnv()
    env =  gym_wrapper.GymWrapper(gym_env)

    # Step 3: Use the loaded policy to control the agent's actions in the environment
    observation = env.reset()
    done = False
    while not done:
        time_step = ts.restart(observation) # Create a restart timestep from the observation
        action_step = action_fn(time_step)
        observation, reward, done, _ = env.step(action_step.numpy()[0]) # convert tensor action to a scalar
        env.render() # rendering the environment
        # You can access the observation, reward, done, etc. from the step return variables

    env.close()