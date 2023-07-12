import gym
from gym import spaces
import numpy as np
import random

class DebugPrint:
    def __init__(self, enabled=True):
        self.enabled = enabled

    def print(self, *args, **kwargs):
        if self.enabled:
            print(*args, **kwargs)

debug_print = DebugPrint(enabled=True)


class Player:
    def __init__(self, handicap = 0):
        self.score = handicap
        self.data = 5
        self.processing = 5


class Action:
    def __init__(self, score_delta=0, data_delta=0, processing_delta=0):
        self.score_delta = score_delta
        self.data_delta = data_delta
        self.processing_delta = processing_delta

    def can_execute(self, player):
        return (player.score + self.score_delta >= 0 and
                player.data + self.data_delta >= 0 and
                player.processing + self.processing_delta >= 0)

    def execute(self, player, opponent, round_number):
        debug_print.print(f"PLAYTING CARD data_delta={self.data_delta}")
        player.score += self.score_delta
        player.data += self.data_delta
        player.processing += self.processing_delta
        debug_print.print(f"Played - Current data={self.data_delta} ")



class Card:
    def __init__(self, free_action, paid_action, card_id):
        self.free_action = free_action
        self.paid_action = paid_action
        self.id = card_id


def create_card(free_values, paid_values, card_id):
    free_action = Action(*free_values)
    paid_action = Action(*paid_values)
    return Card(free_action, paid_action, card_id)


def create_deck():
    unique_card_1 = create_card([4, 20, 5], [7, -2, 0], card_id=0)
    unique_card_2 = create_card([5, 20, 1], [8, -3, 1], card_id=1)
    unique_card_3 = create_card([0, 56, 2], [9, -4, 2], card_id=2)
    unique_card_4 = create_card([2, 47, 5], [1, -5, 1], card_id=3)
    identical_cards = [create_card([1, 20, 2], [41, -30, 1], card_id=i) for i in range(4, 20)]
    deck = [unique_card_1, unique_card_2, unique_card_3, unique_card_4] + identical_cards
    random.shuffle(deck)
    return deck





class SingularityGameEnv(gym.Env):
    def __init__(self):
        super().__init__()
        
        self.round_number = 0
        self.initial_deck = create_deck()  
        self.deck = self.initial_deck.copy() 
        self.player = Player()
        self.opponent = Player(15)
        self.player_hand = [-1, -1]
        self.opponent_hand = [-1, -1]
        self.final_reward = 0  
        self.action_space = spaces.Discrete(4)
        debug_print.print(self.deck)
        self.observation_space = spaces.Dict({
            'player_score': spaces.Box(low=-float('inf'), high=float('inf'), shape=(1,)),
            'player_data': spaces.Box(low=-float('inf'), high=float('inf'), shape=(1,)),
            'player_processing': spaces.Box(low=-float('inf'), high=float('inf'), shape=(1,)),
            'opponent_score': spaces.Box(low=-float('inf'), high=float('inf'), shape=(1,)),
            'opponent_data': spaces.Box(low=-float('inf'), high=float('inf'), shape=(1,)),
            'opponent_processing': spaces.Box(low=-float('inf'), high=float('inf'), shape=(1,)),
            'round_number': spaces.Box(low=0, high=10, shape=(1,)),
            'player_hand': spaces.Box(low=-1, high=20, shape=(2,), dtype=np.int)

        })

    def step(self, action):
        debug_print.print(f"\n----- New step {self.round_number} -----")
        self._draw_cards()
        hand_position = action // 2
        reward = self._execute_action(self.player, action)
        self._execute_random_opponent_action()
        self._update_round()
        debug_print.print("---------------------")
        if self._is_done():  # The game is over
            return self._get_observation(), self.final_reward, True, {}  # Return the final reward
        return self._get_observation(), reward, False, {}

    def _draw_cards(self):
        debug_print.print("Drawing cards...")
        if len(self.deck) > 0:
            self.player_hand = self.add_to_hand(self.player_hand, self.deck.pop().id)
            self.opponent_hand = self.add_to_hand(self.opponent_hand, self.deck.pop().id)
        debug_print.print(f"Player hand: {self.player_hand}")
        debug_print.print(f"Opponent hand: {self.opponent_hand}")

    def _execute_action(self, player, action):
        debug_print.print(f"Player action: {action}")
        reward = 0
        card_index = action // 2
        action_type = action % 2
        debug_print.print(f"card_index {card_index} action_type {action_type}")
        debug_print.print(f"self.player_hand[card_index]  {self.player_hand[card_index]} ")
        if card_index >= len(self.player_hand) or self.player_hand[card_index] == -1:
            # Trying to play a non-existent card. Fallback to free action of card 1 and give a negative reward.
            debug_print.print("Player tried to play a non-existent card. Falling back to card 1 free action.")
            reward = -1
            card_index = 0  # Fallback to card at index 0 (card 1)
            action_type = 0  # Fallback to free action

        card_id = self.player_hand[card_index]
        card = self.get_card_from_deck(self.initial_deck, card_id)
        
        if card is not None:
            debug_print.print(card)
            if action_type == 0 or not card.paid_action.can_execute(player):
                debug_print.print("playing free action")
                debug_print.print(card.free_action)
                card.free_action.execute(player, self.opponent, self.round_number)
            else:
                debug_print.print("playing paid action")
                debug_print.print( card.paid_action)
                
                card.paid_action.execute(player, self.opponent, self.round_number)
            self.player_hand = self.remove_from_hand(self.player_hand, card_id)
            #if len(self.deck) > 0:  # Draw new card if available
            #    self.player_hand = self.add_to_hand(self.player_hand, self.deck.pop().id)
        debug_print.print(f"Player state after action: score={player.score}, data={player.data}, processing={player.processing}")
        return reward

    def _execute_random_opponent_action(self):
        debug_print.print("Opponent action...")
        action = random.randint(0, 3)  # Randomly choose one of the 4 actions
        card_index = action // 2
        action_type = action % 2

        if card_index >= len(self.opponent_hand) or self.opponent_hand[card_index] == -1:
            # Trying to play a non-existent card. Fallback to free action of card 1.
            debug_print.print("Opponent tried to play a non-existent card. Falling back to card 1 free action.")
            card_index = 0  # Fallback to card at index 0 (card 1)
            action_type = 0  # Fallback to free action

        card_id = self.opponent_hand[card_index]
        card = self.get_card_from_deck(self.initial_deck, card_id)
        
        if card is not None:
            if action_type == 0 or not card.paid_action.can_execute(self.opponent):
                card.free_action.execute(self.opponent, self.player, self.round_number)
            else:
                card.paid_action.execute(self.opponent, self.player, self.round_number)
            self.opponent_hand = self.remove_from_hand(self.opponent_hand, card_id)
           # if len(self.deck) > 0:  # Draw new card if available
          #    self.opponent_hand = self.add_to_hand(self.opponent_hand, self.deck.pop().id)
        debug_print.print(f"Opponent state after action: score={self.opponent.score}, data={self.opponent.data}, processing={self.opponent.processing}")

    def _update_round(self):
        #debug_print.print(f"End of round {self.round_number}")
        self.round_number += 1



    def add_to_hand(self, hand, card_id):
        if -1 in hand:
            index = hand.index(-1)
            hand[index] = card_id
        return hand
    
    def get_card_from_deck(self, deck, card_id):
        for card in deck:
            if card.id == card_id:
                return card
        return None
    
    def remove_from_hand(self, hand, card_id):
        if card_id in hand:
            index = hand.index(card_id)
            hand[index] = -1
        return hand
    





    def get_legal_actions(self, card_id):
        card = self.get_card_from_deck(self.deck, card_id)
        if card is not None:
            return [i for i, action in enumerate([card.free_action, card.paid_action]) if card and action.can_execute(self.player)]
        else:
            return [0]  # If no card is available, only the "do nothing" action is legal


    def _update_round(self):
        self.round_number += 1


    def _get_observation(self):
        return {
            'player_score': np.array([self.player.score]).reshape((1,)),
            'player_data': np.array([self.player.data]).reshape((1,)),
            'player_processing': np.array([self.player.processing]).reshape((1,)),
            'opponent_score': np.array([self.opponent.score]).reshape((1,)),
            'opponent_data': np.array([self.opponent.data]).reshape((1,)),
            'opponent_processing': np.array([self.opponent.processing]).reshape((1,)),
            'round_number': np.array([self.round_number]).reshape((1,)),
            'player_hand': np.array(self.player_hand)
        }


    def _is_done(self):
        
        if self.round_number >= 10:  # Game over
            debug_print.print("GAME OVER")
            debug_print.print('PLAYER:   Score = {0}: Data = {1} Proc= {2}'.format(self.player.score, self.player.data, self.player.processing))
            debug_print.print('OPPONENT: Score = {0}: Data = {1} Proc= {2}'.format(self.opponent.score, self.opponent.data, self.opponent.processing))
            if self.player.score > self.opponent.score:  # Player wins
                self.final_reward = 100 + self.player.score
            elif self.player.score < self.opponent.score:  # Player loses
                self.final_reward = -100 + self.player.score
            else:  # Tie
                self.final_reward = self.player.score
            return True
        return False

    def reset(self):
        self.round_number = 0
        self.deck = create_deck()
        self.player = Player()
        self.opponent = Player(15)
        self.final_reward = 0  
        self.player_hand = self.add_to_hand([-1, -1], self.deck.pop().id)
        self.opponent_hand = self.add_to_hand([-1, -1], self.deck.pop().id)
        return self._get_observation()

    def render(self, mode='human'):
        debug_print.print(f"Round: {self.round_number}")
        debug_print.print(f"Player Score: {self.player.score}, Data: {self.player.data}, Processing: {self.player.processing}")
        debug_print.print(f"Opponent Score: {self.opponent.score}, Data: {self.opponent.data}, Processing: {self.opponent.processing}")
        debug_print.print(f"Player Hand: {self.player_hand}")
        debug_print.print(f"Opponent Hand: {self.opponent_hand}")
