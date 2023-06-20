import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Player } from './Player';
import './styles.css';
import * as tf from '@tensorflow/tfjs';


const TensorTest = ({ players, deckState }) => {
  const [finalResult, setResult] = useState();
  useEffect(() => {
    // Create the input vector for Player 2
    const player2 = players[1];
    const player2Score = player2.score;
    const player2Data = player2.data;
    const player2ProcessingPower = player2.processingPower;
    // One-hot encode the hand and the deck
    const player2Hand = player2.hand.map(card => cards.findIndex(deckCard => deckCard.title === card.title));
    const deckStateEncoded = deckState.map(card => cards.findIndex(deckCard => deckCard.title === card.title));

    const inputVector = [player2Score, player2Data, player2ProcessingPower, ...player2Hand, ...deckStateEncoded];
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 1, inputShape: [inputVector.length] }));


    model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });
    const xs = tf.tensor2d([inputVector], [1, inputVector.length]);
    const targetValue = 2;
    const ys = tf.tensor2d([targetValue], [1, 1]);



    // Train the model using the data.
    model.fit(xs, ys, { epochs: 100 }).then(() => {
      let predictVector = new Array(inputVector.length).fill(5);
      model.predict(tf.tensor2d(predictVector, [1, inputVector.length])).print();
    });

  }, []);
  const test = "testString";
  return (
    <>
      TENSOR TEST {JSON.stringify(finalResult)}
    </>
  );
};

function TensorTestComponent() {
  const [model, setModel] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const inputDataLenght = 70;
  let traningDataInput = [];
  let traningDataAnswers = [];
  for(var i = 0; i<inputDataLenght; i++){
    var x1 = Math.floor(Math.random() * 10);
    var x2 = Math.floor(Math.random() * 10);
    var y = x1*2+x2;
    traningDataInput.push([x1,x2]);
    traningDataAnswers.push(y);
  }

  // Training data for x1 and x2
  const xs = tf.tensor2d(traningDataInput, [inputDataLenght, 2]);
  // Training data for y
  const ys = tf.tensor2d(traningDataAnswers, [inputDataLenght, 1]);

  // Create and train model
  useEffect(() => {
    async function createAndTrainModel() {
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 1, inputShape: [2] }));
      model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

      await model.fit(xs, ys, { epochs: 10 });

      setModel(model);
    }

    createAndTrainModel();
  }, []);

  // Predict
  useEffect(() => {
    if (model) {
      const output = model.predict(tf.tensor2d([[2, 8],[9, 1]], [2, 2]));

      setPrediction(output.dataSync()[0] + " " +output.dataSync()[1]);
    }
  }, [model]);

  return (
    <div>
      {prediction && <p>Prediction for input of [9, 1]: {prediction}</p>}
    </div>
  );
}




const gameToTensor = (gameState) => {
  console.log(gameState)
  let currentPlayerIndex = gameState.players.findIndex(player => player.name === gameState.currentPlayer);
  let currentPlayer = gameState.players[currentPlayerIndex];

  let score = currentPlayer.score;
  let data = currentPlayer.data;
  let processingPower = currentPlayer.processingPower;

  let playedCardId = gameState.cardId;
  // one-hot encode the cards in hand and in deck
  let playerHand = currentPlayer.hand.map(card => cards.findIndex(deckCard => deckCard.title === card.title));
  let deckState = gameState.deckState.map(card => cards.findIndex(deckCard => deckCard.title === card.title));
  const actionType = gameState.actionType == "invest" ? 1 :0;

  // Combine these into a single array
  let tensorArray = [playedCardId, score, data,actionType, processingPower,gameState.investment, ...playerHand, ...deckState];

  // Turn the array into a 2D tensor
  let tensor = tf.tensor2d(tensorArray, [1, tensorArray.length]);
  console.log(tensor)
  return tensor;
};

const rewardToTensor = (reward) => {
  console.log(reward);
  let tensor = tf.tensor2d([1], [1, 1]);
  console.log(tensor)
  return  tensor
}




// helper function
const updatePlayerStats = (player, scoreChange = 0, dataChange = 0, processingChange = 0) => {
  player.score += scoreChange;
  player.data += dataChange;
  player.processingPower += processingChange;
};
// helper function
function buyEffect(player, card) {
  const cost = card.price;
  const currency = card.currency;

  if (player[currency] >= cost) {
    player[currency] -= cost;
    return true;
  } else {
    return false;
  }
}

const cards = [
  {
    title: 'Card 1',
    description: "PLAY: +1 Score +1 Data. INVEST: cost 2 Processing, +4 Processing +2 Score",
    playEffect: (player, card) => {
      updatePlayerStats(player, 1, 1); // +1 score, +1 data
    },
    investEffect: (player, card) => {
      if (buyEffect(player, card)) {
        updatePlayerStats(player, 2, 0, 4); // +2 score, +4 processing
      }
    },
    price: 2,
    currency: "processingPower",
    id: 1,
  },
  {
    title: 'Card 2',
    description: "PLAY: +4 Score. INVEST: Price any processing, +(cost)*2 Score",
    playEffect: (player, card) => {
      updatePlayerStats(player, 4); // +roundsLeft score
    },
    investEffect: (player, card, investment) => {
      card.price = investment; // Set the price to the investment for this card's turn
      if (buyEffect(player, card)) {
        updatePlayerStats(player, investment * 2); // score increases by the processing cost
      }
    },
    price: 'variable',
    currency: "processingPower",
    id:2,
  },
  {
    title: 'Card 3',
    description: "PLAY: +1 processing. INVEST: Price 1 Data, +4 Score",
    playEffect: (player, card) => {
      updatePlayerStats(player, 0, 0, 1); // +1 processing
    },
    investEffect: (player, card) => {
      if (buyEffect(player, card)) {
        updatePlayerStats(player, 4); // +4 score
      }
    },
    price: 1,
    currency: "data",
    id:3,
  }
];






export const SimpleBoard = () => {
  const [players, setPlayers] = useState([
    { name: "Player 1", score: 0, data: 5, processingPower: 5, hand: [cards[0]] },
    { name: "Player 2", score: 0, data: 5, processingPower: 5, hand: [cards[0]] },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [deckState, setDeckState] = useState([cards[2], cards[1], cards[1], cards[2]]);
  const [history, setHistory] = useState([]);
  const currentPlayer = players[currentPlayerIndex];
  const totalRounds = deckState.length + 2;
  const [currentRound, setCurrentRound] = useState(0);



  const playOrInvest = (title, type, investment = 0) => {
    let cardIndex = currentPlayer.hand.findIndex((card) => card.title === title);
    const scoreBeforePlay =  players.find(player => player.name === currentPlayer.name).score
    if (cardIndex !== -1) {
      let cardToUse = currentPlayer.hand[cardIndex];
      currentPlayer.hand.splice(cardIndex, 1);
      if (type === 'play') {
        cardToUse.playEffect(currentPlayer, cardToUse);
      } else if (type === 'invest') {
        cardToUse.investEffect(currentPlayer, cardToUse, investment);
      }

      // Record the current game state and result
      const gameState = {
        players,
        currentPlayer: currentPlayer.name,
        deckState,
        cardUsed: cardToUse.title,
        actionType: type,
        investment,
        cardId: cardToUse.id
      };

      // Calculate the "reward" as the difference in the current player's score
      const reward =  currentPlayer.score - scoreBeforePlay ;

      const historyEntry = { gameState, reward };
      console.log(historyEntry);  // log the history entry
      setHistory([...history, historyEntry]);

      switchCurrentPlayer();
    } else {
      alert("Card not in hand");
    }
  };


  const drawCard = () => {
    if (deckState.length > 0) {
      const newCard = { ...deckState.pop() }; // create a deep copy of the card
      currentPlayer.hand.push(newCard);
      setDeckState(deckState);
      setPlayers([...players]);
    }
  };
  const switchCurrentPlayer = () => {
    setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
    setCurrentRound(currentRound + 1);
  };


  useEffect(() => {
    drawCard();
  }, [currentPlayerIndex]);
    
  useEffect(() => {
    if(history && history.length> 0){
      rewardToTensor(history[history.length-1].reward)
      gameToTensor(history[history.length-1].gameState);
    }
    
  }, [history]);

  

  useEffect(() => {
    if (currentRound >= totalRounds + 3) {
      alert(`Game over, player ${players[0].score > players[1].score ? 1 : 2} won!`);
    }
  }, [currentRound]);

  return (


    <div className="board">
      <TensorTestComponent/>
      <TensorTest players={players} deckState={deckState} />
      <h2>Round {currentRound + 1}. {currentPlayer.name}'s turn</h2>
      {players.map((player, index) => (
        <div key={index} className='player-container'>
          <Player player={player} />
          {player.hand.map((card, cardIndex) => (
            <Card
              key={cardIndex}
              card={card}
              playOrInvest={playOrInvest}
              currentPlayer={player}
            />
          ))}
        </div>
      ))}
      <div>
        {history.map((entry, index) => (
          <div key={index}>
            {entry.player} {entry.type === 'play' ? 'played' : 'invested in'} {entry.card} {entry.type === 'invest' ? 'with ' + entry.investment + ' processing' : ''}
          </div>
        ))}
      </div>
    </div>
  );
};
