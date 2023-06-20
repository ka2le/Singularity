import * as tf from '@tensorflow/tfjs';
import React, { useState } from 'react';


export const SimplePokerContainer = () => {
    const [model, setModel] = useState(null);
    const [traningData, setTrainigData] = useState(null);
    //runTheGame
    async function runRandomGames(numRandomGames) {
        const gameHistories = await runGames(randomPlayer, randomPlayer, numRandomGames);
        console.log(gameHistories);
        setTrainigData(gameHistories);
    }
    // Train or continue training model
    async function train(numRandomGames, numEpochs, model = null) {
        const gameHistories = await runGames(randomPlayer, randomPlayer, numRandomGames);
        const trainedModel = await trainModel(gameHistories, numEpochs, model);
        setModel(trainedModel);
        console.log("MODEL TRAINED");
    }
    async function trainFixed(numRandomGames, numEpochs, model = null) {
        const gameHistories = await runGames(fixedPlayer, randomPlayer, numRandomGames);
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

    async function trainWithModelAiVsAi(numGames, numEpochs, model = null) {
        const gameHistories = await runGamesWithModel(numGames, "ai","ai");
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
            <h1>SIMPLE POKER GAME</h1>
            <button onClick={() => train(3000, 40)}>Train New Model - Random Vs Random</button>
            <button onClick={() => trainFixed(300, 40)}>Train New Model - Fixed Vs Random</button><br></br><br></br>
            <button onClick={() => train(200, 50, model)}>Continue Training Model - Random Vs Random</button>
            <button onClick={() => trainWithModel(200, 50, model)}>Continue Training Model - Ai vs Random</button>
            <button onClick={() => trainWithModelAiVsAi(50, 50, model)}>Continue Training Model - Ai vs Ai</button><br></br><br></br>
            <button onClick={saveModel}>Save Model</button>
            <button onClick={loadModel}>Load Model</button><br></br><br></br>
            <button onClick={() => runRandomGames(1000)}>Run Random Games</button>
            <button onClick={() => runGamesWithModel(5, "ai")}>Run Games</button> 
            <button onClick={() => runGamesWithModel(100, "ai", "ai")}>Run Games Ai vs Ai</button> 
        </div>
    );
}




const preprocess = (gameStates) => {
    let inputData = [];
    let outputData = [];
    gameStates.forEach(gameState => {
        let input = [
            gameState.p1Hand,
            gameState.p1Bet,
            //gameState.p1Money,
        ]
        inputData.push(input);
        let output = gameState.p1Result - 10;  
        outputData.push(output);
    });
    //console.log(inputData);
    //console.log(outputData);
    const xs = tf.tensor2d(inputData, [inputData.length, inputData[0].length]);
    const ys = tf.tensor2d(outputData, [outputData.length, 1]);
    return [xs, ys, inputData[0].length];
}


async function trainModel(games, numEpochs, model = null) {
    const [xs, ys, inputLenght] = preprocess(games);
    
    model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [inputLenght], kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), biasRegularizer: tf.regularizers.l2({ l2: 0.01 })  }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    await model.fit(xs, ys, {
        epochs: numEpochs,
        validationSplit: 0.3,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
              const logInterval = Math.floor(numEpochs / 6); // Calculate the interval for logging
              if (epoch === 0 || epoch === numEpochs - 1 || epoch % logInterval === 0) {
                console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
              }
            }
          }
    });
    return model;
}



// AI Player
async function aiPlayer(model, gameState, player) {
    const maxBet = player == 1 ? gameState.p1Money : gameState.p2Money;
    const currentHand = player == 1 ? gameState.p1Hand : gameState.p2Hand
    let bestBet = 0;
    let bestBetProbability = 0;
    for (let possibleBet = 0; possibleBet <= maxBet; possibleBet++) {
        let input = [
            currentHand,
            possibleBet,
            
        ];

        let prediction = model.predict(tf.tensor2d([input]));
        let winProbability = prediction.dataSync()[0];
       console.log("Bet:"+possibleBet +"  p1Hand:" + gameState.p1Hand,"  WinPredic:" + winProbability)

        if (winProbability > bestBetProbability) {
            bestBet = possibleBet;
            bestBetProbability = winProbability;
        }
    }
     console.log("CurrentHand  " + currentHand )
     console.log("BETTING  " + bestBet);
     console.log("bestBetProbability  " + bestBetProbability);
    return bestBet
}

// Fixed Player
async function fixedPlayer(gameState, player) {
    const hand = player == 1 ? gameState.p1Hand : gameState.p2Hand;
    let bet = 0;
    if(hand > 5) {
        bet = hand
    } 
    return bet
}


// Random Player
async function randomPlayer(gameState, player) {
    return Math.floor(Math.random() * 11)
}

function getRandom1to10() {
    return Math.floor(Math.random() * 10) + 1;
}
async function runGame(player1Function, player2Function) {
    let p1Money = 10;
    let p2Money = 10;
    const p1Hand = getRandom1to10();
    const p2Hand = getRandom1to10();
    let gameState = {
        p1Money,
        p2Money,
        p1Hand,
        p2Hand,
    }
    let p1Bet = await player1Function(gameState, 1);
    p1Bet = Math.min(p1Bet, p1Money);
    let p2Bet = await player2Function(gameState, 2);
    p2Bet = Math.min(p2Bet, p2Money);
    gameState = { ...gameState, p1Bet, p2Bet }
    if (p1Hand > p2Hand) {
        p1Money += p1Bet
        p2Money -= p2Bet
    } else  if(p1Hand < p2Hand) {
        p2Money += p2Bet
        p1Money -= p1Bet
    }
    gameState = { ...gameState, p1Result: p1Money, p2Result: p2Money }
    return gameState
}

async function runGames(player1Function, player2Function, numGames) {
    const gameStates = []
    let p1Wins = 0;
    let p2Wins = 0;
    let p1Earnings = 0;
    let p2Earnings = 0;
    let ties = 0;
    for (let i = 0; i < numGames; i++) {
        const gameState = await runGame(player1Function, player2Function)
        if (gameState.p1Result > gameState.p2Result) {
            p1Wins++
        } else if (gameState.p1Result < gameState.p2Result) {
            p2Wins++
        } else {
            ties++;
        }
        p1Earnings += gameState.p1Result;
        p2Earnings += gameState.p2Result;
        gameStates.push(gameState)
    }
    console.log("Player 1 Earnings " + p1Earnings + "     Avg:" + Math.round(p1Earnings/numGames) + "   Wins:" +p1Wins + "   Ties:" +ties)
    console.log("Player 2 Earnings " + p2Earnings + "     Avg:" + Math.round(p2Earnings/numGames) + "   Wins:" +p2Wins)
    console.log(gameStates);
    return gameStates;
}




export default SimplePokerContainer;