import * as tf from '@tensorflow/tfjs';
import React, { useState } from 'react';


export const BettingGameContainer = () => {
    const [model, setModel] = useState(null);
    const [traningData, setTrainigData] = useState(null);
    // Train or continue training model
    async function generateRandomTrainingData(numRandomGames) {
        const gameHistories = await runGames(randomPlayer, randomPlayer, numRandomGames);
        console.log(gameHistories);
        setTrainigData(gameHistories);
    }


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

    async function trainWithModel(numGames, numEpochs, model = null) {
        const gameHistories = await runGamesWithModel(numGames);
        const trainedModel = await trainModel(gameHistories, numEpochs, model);
        setModel(trainedModel);
        console.log("MODEL TRAINED");
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
        return aiGameHistories;
    }

    return (
        <div>
            <h1>BETTING GAME</h1>
            <button onClick={() => generateRandomTrainingData(3)}>Generate Training Data</button>
            <button onClick={() => train(50, 50)}>Train New Model</button>
            <button onClick={() => train(100, 30, model)}>Continue Training Model</button>
            <button onClick={() => trainWithModel(50, 50, model)}>Training Model on its own data</button>
            <button onClick={saveModel}>Save Model</button>
            <button onClick={loadModel}>Load Model</button>
            <button onClick={() => runGamesWithModel(10, "ai")}>Run Games</button>
        </div>
    );
}

export default BettingGameContainer;


const preprocess = (games) => {
    let inputData = [];
    let outputData = [];

    games.forEach(game => {
        game.history.forEach((round, index) => {
            let input = [
                round.state.player1Money,
                round.state.player2Money,
                round.state.player1Wins,
                round.state.player2Wins,
                round.state.round,
                round.player1Bet,  // Include the bet in the input
            ];
            inputData.push(input);

            let output = round.player1Bet > round.player2Bet ? 1 : 0;  // 1 if player 1 won, 0 otherwise
            outputData.push(output);
        });
    });

    // Convert to tensors
    const xs = tf.tensor2d(inputData, [inputData.length, inputData[0].length]);
    const ys = tf.tensor2d(outputData, [outputData.length, 1]);
    return [xs, ys];
}


async function trainModel(games) {
    const [xs, ys] = preprocess(games);
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [6] }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy' });
    await model.fit(xs, ys, {
        epochs: 100,
        validationSplit: 0.3,
    });
    return model;
}



// // Flip game state for player 2
// function flipGameState(gameState) {
//     const flippedState = {
//       round: gameState.round,
//       player1Money: gameState.player2Money, // Swap player 1 and player 2 money
//       player2Money: gameState.player1Money,
//       player1Wins: gameState.player2Wins,
//       player2Wins: gameState.player1Wins,
//     };
//    // console.log('Original state:', gameState);
//    // console.log('Flipped state:', flippedState);
//     return flippedState;
//   }


// AI Player
async function aiPlayer(model, gameState, player) {
    const playerMoney = gameState.player1Money;
    let bestBet = 0;
    let bestBetProbability = 0;
   // console.log("ROUND ______________________ "+  gameState.round)
    for (let possibleBet = 0; possibleBet <= playerMoney; possibleBet++) {
        let input = [
            gameState.player1Money,
            gameState.player2Money,
            gameState.player1Wins,
            gameState.player2Wins,
            gameState.round,
            possibleBet,
        ];

        let prediction = model.predict(tf.tensor2d([input]));
        let winProbability = prediction.dataSync()[0];
       // console.log("Bet "+ possibleBet+ " has chance "+winProbability)

        if (winProbability > bestBetProbability) {
            bestBet = possibleBet;
            bestBetProbability = winProbability;
        }
    }

    return bestBet;
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
            if (this.player2Money == 0 && this.player2Wins < 3) {
                winner = 1;
                forfit = true;
            }
            if (this.player1Money == 0 && this.player1Wins < 3) {
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
        if (!forfit) {
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
