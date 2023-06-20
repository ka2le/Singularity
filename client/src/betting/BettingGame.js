import * as tf from '@tensorflow/tfjs';
import React, { useState } from 'react';


export const BettingGameContainer = () => {
    const [model, setModel] = useState(null);

    // Train or continue training model
    async function train(numRandomGames, numEpochs, model = null) {
        const gameHistories = await runGames(randomPlayer, randomPlayer, numRandomGames);
        const trainedModel = await trainModel(gameHistories, numEpochs, model);
        setModel(trainedModel);
        console.log("MODEL TRAINED");
    }

    // Save model
    async function saveModel() {
        if (model === null) {
            console.log("Please train the model first.");
            return;
        }
        await model.save('localstorage://my-model');
        console.log("MODEL SAVED");
    }

    // Load model
    async function loadModel() {
        const loadedModel = await tf.loadLayersModel('localstorage://my-model');
        loadedModel.compile({ loss: 'meanSquaredError', optimizer: 'adam' }); // Compile the model
        setModel(loadedModel);
        console.log("MODEL LOADED");
    }

    // Run games
    async function runGamesWithModel(numAiGames, player1 = "ai", player2 = "random") {
        if (model === null) {
            console.log("Please train the model first.");
            return;
        }
        const player1Function = player1 == "ai" ? aiPlayer.bind(null, model) : randomPlayer;
        const player2Function = player2 == "ai" ? aiPlayer.bind(null, model) : randomPlayer;
        const aiGameHistories = await runGames(player1Function, player2Function, numAiGames);
        console.log(aiGameHistories[aiGameHistories?.length - 1]);
    }

    return (
        <div>
            <h1>BETTING GAME</h1>
            <button onClick={() => train(40, 10)}>Train New Model</button>
            <button onClick={() => train(40, 10, model)}>Continue Training Model</button>
            <button onClick={saveModel}>Save Model</button>
            <button onClick={loadModel}>Load Model</button>
            <button onClick={() => runGamesWithModel(1, "ai")}>Run Games</button>
        </div>
    );
}

export default BettingGameContainer;




// Define a reward function
function rewardFunction(gameResult) {
    return gameResult === 1 ? 1 : -1; // Reward of 1 for winning, -1 for losing
}
// Preprocess game histories
function preprocess(gameHistories) {
    const inputs = [];
    const outputs = [];
    for (const gameHistory of gameHistories) {
        const gameResult = gameHistory.gameResult;
        const reward = rewardFunction(gameResult);
        const tempInputs = [];
        for (const { state, player1Bet } of gameHistory.history) {
            tempInputs.push([...Object.values(state), player1Bet]);
        }
        // Assign the reward to all states now that we have the game result
        for (const input of tempInputs) {
            inputs.push(input);
            outputs.push([input[input.length-1], reward]);
        }
    }
    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor2d(outputs);
    return { xs, ys };
}



async function trainModel(gameHistories, numEpochs, model = null) {
    const { xs, ys } = preprocess(gameHistories);
    const discount_factor = 1;
    // Create model if none is provided
    if (model === null) {
        model = tf.sequential();
        model.add(tf.layers.dense({
            units: 50,
            inputShape: [6],
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), // Add L2 regularization to the weights
            biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) // Add L2 regularization to the biases
        }));
        model.add(tf.layers.dense({
            units: 50,
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), // Add L2 regularization to the weights
            biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) // Add L2 regularization to the biases
        }));
        model.add(tf.layers.dense({
            units: 50,
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), // Add L2 regularization to the weights
            biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) // Add L2 regularization to the biases
        }));
        model.add(tf.layers.dense({
            units: 2,
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), // Add L2 regularization to the weights
            biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) // Add L2 regularization to the biases
        }));
        model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });
    }

    // Train model
for (let epoch = 0; epoch < numEpochs; epoch++) {
    for (const gameHistory of gameHistories) {
        const gameResult = gameHistory.gameResult;
        const reward = rewardFunction(gameResult);
        const tempInputs = [];
        for (const { state, player1Bet } of gameHistory.history) {
            tempInputs.push([...Object.values(state), player1Bet]);
        }
        for (const input of tempInputs) {
            const currentQValues = model.predict(tf.tensor2d([input], [1, 6])).dataSync();

            const newQValue = reward + discount_factor * Math.max(...currentQValues);
            currentQValues[input[input.length-1]] = newQValue;
            await model.fit(tf.tensor2d([input], [1, 6]), tf.tensor2d([currentQValues], [1, 2]), { epochs: 1 });

        }
    }
    console.log(`Epoch ${epoch} completed`);
}

    return model;
}


// Flip game state for player 2
function flipGameState(gameState) {
    const flippedState = {
      round: gameState.round,
      player1Money: gameState.player2Money, // Swap player 1 and player 2 money
      player2Money: gameState.player1Money,
      player1Wins: gameState.player2Wins,
      player2Wins: gameState.player1Wins,
    };
   // console.log('Original state:', gameState);
   // console.log('Flipped state:', flippedState);
    return flippedState;
  }
  

  // AI Player
async function aiPlayer(model, gameState, player) {
    if (player === 2) {
        gameState = flipGameState(gameState); // Flip game state if AI is player 2
    }
    const playerMoney = gameState.player1Money; // AI always sees itself as player 1

    let maxReward = -Infinity;
    let bestBet = 0;
    console.log("ROUND___ " +gameState.round)
    // Loop through all possible bets
    for (let bet = 0; bet <= playerMoney; bet++) {
        // Create a copy of the game state and set the bet
        const testGameState = { ...gameState, player1Bet: bet };
        // Predict the expected reward for this bet
        const prediction = model.predict(tf.tensor2d([Object.values(testGameState)], [1, 6]));
        const expectedReward = prediction.dataSync()[1]; // The second output of the model is the expected reward
        console.log(bet)
        console.log(expectedReward)
        // If this bet has a higher expected reward than the current best bet, update the best bet
        if (expectedReward > maxReward) {
            maxReward = expectedReward;
            bestBet = bet;
        }
    }
    
    return Math.min(Math.max(Math.round(bestBet), 0), playerMoney);;
}

// Random Player
async function randomPlayer(gameState, player) {
    const playerMoney = player == 1 ? gameState.player1Money : gameState.player2Money; // or gameState.player2Money, depending on which player this function is used for
    return Math.floor(Math.random() * (playerMoney + 1)); // returns a random number between 0 and playerMoney, inclusive
}



// Game
class Game {
    constructor(player1Func, player2Func) {
        this.player1Func = player1Func;
        this.player2Func = player2Func;
        this.player1Money = 100;
        this.player2Money = 100;
        this.player1Wins = 0;
        this.player2Wins = 0;
        this.round = 0;
        this.history = [];
    }

    async playGame() {
        let winner = 1;
        let forfit = false;
        while (this.round < 5) {
            const player1Bet = await this.player1Func(this.getState(), 1);
            const player2Bet = await this.player2Func(this.getState(), 2);

            this.player1Money -= player1Bet;
            this.player2Money -= player2Bet;

            if (player1Bet > player2Bet) {
                this.player1Wins++;
            } else if (player2Bet > player1Bet) {
                this.player2Wins++;
            }
            if(  this.player2Money == 0 &&  this.player2Wins < 3) {
                winner = 1;
                forfit = true;
            }
            if(  this.player1Money == 0 &&  this.player1Wins < 3) {
                winner = 2;
                forfit = true;
            }
            

            this.history.push({
                state: this.getState(),
                player1Bet,
                player2Bet
            });

            this.round++;
        }
        if (!forfit){
            winner = this.player1Wins > this.player2Wins ? 1 : 2;
        }
        

        return {
            winner,
            history: this.history
        };
    }

    getState() {
        return {
            player1Money: this.player1Money,
            player2Money: this.player2Money,
            player1Wins: this.player1Wins,
            player2Wins: this.player2Wins,
            round: this.round
        };
    }
}

// Run Games
async function runGames(player1Func, player2Func, numGames) {
    let player1Wins = 0;
    let player2Wins = 0;
    const gameHistories = [];

    for (let i = 0; i < numGames; i++) {
        const game = new Game(player1Func, player2Func);
        const gameResult = await game.playGame();

        if (gameResult.winner === 1) {
            player1Wins++;
        } else if (gameResult.winner === 2) {
            player2Wins++;
        }

        // Include the game result in the game history
        gameHistories.push({ gameResult: gameResult.winner, history: gameResult.history });
    }

    console.log(`Player 1 won ${player1Wins} games`);
    console.log(`Player 2 won ${player2Wins} games`);

    return gameHistories;
}
