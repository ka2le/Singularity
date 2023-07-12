import gym
from gym import spaces
import random
import numpy as np
import config as conf



class Card:
    def __init__(self, id, actions):
        self.actions = actions  # a list of action function tuples
        self.id = id

    def perform_action(self, action_index, player):
        player_copy = player.copy()
        action = self.actions[action_index]
        #print(f"action {action} action_index {action_index} id {self.id}")
        player['score'] = max(0, action[0](player_copy))
        player['data'] = max(0, action[1](player_copy))
        player['processing'] = max(0, action[2](player_copy))

def create_card(id, *actions):
    action_funcs = []
    for action in actions:
        score, data, processing = action
        if not callable(score):
            score_value = score
            score = lambda player: max(0, player['score'] + score_value)
        if not callable(data):
            data_value = data
            data = lambda player: max(0, player['data'] + data_value)
        if not callable(processing):
            processing_value = processing
            processing = lambda player: max(0, player['processing'] + processing_value)
        action_funcs.append((score, data, processing))
    
    return Card(id,action_funcs)


def get_all_cards(player):
    all_cards = [
        create_card(0,(-10, 0, 0)),
        create_card(1,(12, 0, 0)),
        create_card(2,(-10, 0, 0)),
        create_card(3,(12, 0, 0)),
        create_card(4,(-10, 0, 0)),
        create_card(5,(-10, 0, 0)),
        create_card(6,(12, 0, 0)),
        create_card(7,(-10, 0, 0)),
        create_card(8,(15, 0, 0)),
        create_card(9,(10, 0, 0)),

      
    ]
    return all_cards



class SimpleCardGameEnv(gym.Env):
    """
    A simple card game environment.
    This game has a single player, who can choose one of four actions: 
    +1, +2, +3 and +4.
    The game lasts for three rounds, and the player's score at the end of each round 
    is the sum of their actions.
    """
    metadata = {'render.modes': ['human']}
    def __init__(self):
        super(SimpleCardGameEnv, self).__init__()

        self.current_round = 0  # to keep track of the round
        self.card_ids = list(range(conf.NUMBER_OF_CARDS))
        self.card_play_status = [-1]*conf.NUMBER_OF_CARDS
        
        # We now keep the player state in a dictionary:
        self.player = {
            'score': 0,
            'data': 10,
            'processing': 10,
            'hand': [-1,-1,-1,-1],
            'last_action': [-1,-1,-1],
            'played_card': -1
        }
        self.all_cards = get_all_cards(self.player)
        self.shuffle_new_deck()
        self.draw_cards(conf.INITAL_DRAW)

        # Define action and observation space
        # They must be gym.spaces objects

        # The action space is the card id's
        self.action_space = spaces.Discrete(conf.NUMBER_OF_CARDS)

        # The observation space is just the current round number and the player's score
        self.observation_space = spaces.Dict({
            'current_round': spaces.Box(low=0, high=conf.NUMBER_OF_ROUNDS, shape=(1,)),
            'player_score': spaces.Box(low=0, high=1000, shape=(1,)),
            #'card_play_status': spaces.Box(low=-1, high=1, shape=(conf.NUMBER_OF_CARDS,)),
            'player_data': spaces.Box(low=0, high=500, shape=(1,)),
            'player_processing': spaces.Box(low=0, high=500, shape=(1,)),
            'player_hand': spaces.Box(low=0, high=conf.NUMBER_OF_CARDS, shape=(conf.CARDS_IN_HAND,)),
        })

    def valid_action_mask(self):
        #Returns a binary mask of shape (NUMBER_OF_CARDS,) where an entry will be 1 if the action corresponding to that entry is valid and 0 otherwise.
        mask = np.zeros(conf.NUMBER_OF_CARDS, dtype=np.int32)
        for card_id in self.player['hand']:
            if card_id != -1:
                mask[card_id] = 1
        return mask 
       
    def reset(self):
        #Reset the state of the environment to an initial state.
        self.current_round = 0
        self.player['score'] = 0
        self.player['data'] = 10
        self.player['processing'] = 10
        self.player['hand'] = [-1,-1,-1,-1]
        self.shuffle_new_deck()
        self.draw_cards(conf.INITAL_DRAW)
        self.card_play_status = [-1]*conf.NUMBER_OF_CARDS
        return self._get_obs()
    
    def finish_step(self, action_reward = 0):
        reward = action_reward 
        if self.current_round > conf.NUMBER_OF_ROUNDS-1:  # if it's the end of the game
            done = True
            reward += self._get_reward()
        else:
            done = False
        return self._get_obs(), reward, done, {}

    
    def resolve_action(self, action):
        #print(f"hand {self.player['hand']} action {action}")
        #action_pos = action # // 2  # Card_pos to act on
        action_type = 0 # action % 2  # Action to perform
        #card_id = self.player['hand'][action_pos]
        card_id = action  # the action now gives the card ID directly

        
        reward = 0
        hand_pos = 0
        #print(f"Action_pos {action_pos} is action {action} in hand {self.player['hand']}")
        if card_id in self.player['hand']:
            hand_pos = self.player['hand'].index(card_id)
        else:
            reward = -10
        card_id =  self.player['hand'][hand_pos]       
        self.player['played_card'] = card_id
        self.player["last_action"] =[card_id, card_id,card_id]
        self.remove_card(hand_pos)
        card = self.all_cards[card_id]
        card.perform_action(action_type, self.player)
        return reward
    

    def remove_card(self,hand_pos):
        card_id_to_remove =  self.player['hand'][hand_pos]
        if card_id_to_remove == -1:
           for i in range(len(self.player['hand'])):
               if self.player['hand'][i] != -1:
                   card_id_to_remove = self.player['hand'][i]
                   self.player['hand'][i] = -1
                   break
        self.card_play_status[card_id_to_remove] = 1
        self.player['hand'][hand_pos] = -1

    def shuffle_new_deck(self):
        random.shuffle(self.card_ids)
        self.deck = self.card_ids[:]
    
    def draw_cards(self, number_of_cards=1):
        for _ in range(number_of_cards):
            if self.deck:
                card_to_draw = self.deck.pop()
                for i in range(len(self.player['hand'])):
                    if self.player['hand'][i] == -1:
                        self.player['hand'][i] = card_to_draw
                        break
            else:
                #print("Deck is empty. Cannot draw more cards.")
                break  # stop trying to draw cards if the deck is empty

    def step(self, action):
        #Execute one time step within the environment.
        debug_print.print(f"Round {self.current_round} Action {action}")
        if self.current_round >= conf.NUMBER_OF_ROUNDS:  # if it's the end of the game
            self.finish_step()
        action_reward = self.resolve_action(action)
        self.draw_cards()
        self.current_round += 1
        return self.finish_step(action_reward)
    



    def _get_obs(self):
        # Get the current observation.
        return {
            'current_round': np.array([self.current_round]),  # This results in shape (1,)
            'player_score': np.array([self.player['score']]),    # This results in shape (1,)
            #'card_play_status': np.array(self.card_play_status, dtype=np.int32),    # This results in shape (NUMBER_OF_CARDS,)
            'player_data': np.array([self.player['data']]),    # This results in shape (1,)
            'player_processing': np.array([self.player['processing']]),    # This results in shape (1,)
            'player_hand': np.array(self.player['hand']),         # This results in shape (2,)
        }   
    def render(self, mode='human2'):
        render_info = {
            'round': self.current_round, 
            'score': self.player['score'], 
            'played_card': self.player['played_card'], 
            'last_action': self.player['last_action'], 
            'data': self.player['data'], 
            'processing': self.player['processing'], 
            'hand': self.player['hand'], 
            'played_cards': self.card_play_status
        }
        
        if mode == 'human':
            print(f"Round: {render_info['round']}, Score: {render_info['score']} last_action: {render_info['last_action']} Data {render_info['data']}, Processing {render_info['processing']} Hand {render_info['hand']}, Played Cards {render_info['played_cards']}")
        return render_info
    

    def _get_reward(self):
        #Compute the current reward.
        return self.player['score']+conf.REWARD_REDUCTION



class DebugPrint:
    def __init__(self, enabled=True):
        self.enabled = enabled

    def print(self, *args, **kwargs):
        if self.enabled:
            print(*args, **kwargs)

debug_print = DebugPrint(enabled=False)