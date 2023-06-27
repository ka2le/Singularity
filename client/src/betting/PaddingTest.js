import * as tf from '@tensorflow/tfjs';
import React, { useState } from 'react';


export const PaddingTest = () => {
    const [model, setModel] = useState(null);

    async function runRandomGames(numRandomGames) {
        const gameHistories = await runGames(randomPlayer, randomPlayer, numRandomGames);
        console.log(gameHistories);
    }
    // Train or continue training model
    async function train(numRandomGames, numEpochs, model = null) {
        const gameHistories = await runGames(randomPlayer, randomPlayer, numRandomGames);
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
            <h1>SIMPLE AI GAME</h1>
            <button onClick={() => train(200, 100)}>Train New Model - Random Vs Random</button>
            <button onClick={() => runGamesWithModel(5, "ai")}>Run Games</button>
            <button onClick={() => runRandomGames(1)}>Run Random Games</button>
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
            gameState.p1Money,
            gameState.round
        ]
        inputData.push(input);
        let output = gameState.p1Result;
        outputData.push(output);
    });

    const xs = tf.tensor2d(inputData, [inputData.length, inputData[0].length]);
    const ys = tf.tensor2d(outputData, [outputData.length, 1]);
    return [xs, ys, inputData[0].length];
}


async function trainModel(games, numEpochs, model = null) {
    const [xs, ys, inputLenght] = preprocess(games);

    model = tf.sequential();
    model.add(tf.layers.dense({ units: 5, activation: 'relu', inputShape: [inputLenght], kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
    model.add(tf.layers.dense({ units: 20, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
    model.add(tf.layers.dense({ units: 20, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
    model.add(tf.layers.dense({ units: 20, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }), biasRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    const patience = 20;
    const min_delta = 0.1;
    let bestValLoss = Number.MAX_VALUE;
    let count = 0;
    const logInterval = Math.floor(numEpochs / 6);

    for (let epoch = 0; epoch < numEpochs; epoch++) {
        const history = await model.fit(xs, ys, {
            epochs: 1,
            validationSplit: 0.2,
        });
        const valLoss = history.history.val_loss[0];
        if (valLoss < bestValLoss - min_delta) {
            bestValLoss = valLoss;
            count = 0;
        } else {
            count++;
        }
        if (epoch === 0 || epoch === numEpochs - 1 || epoch % logInterval === 0) {
            console.log(`Epoch ${epoch}: loss = ${history.history.loss}, val_loss = ${valLoss}`);
        }
        if (count >= patience) {
            console.log('Early stopping ' + epoch);
            break;
        }
    }

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
            maxBet,
            gameState.round
        ];

        let prediction = model.predict(tf.tensor2d([input]));
        let winProbability = prediction.dataSync()[0];
        // console.log("Bet:" + possibleBet + "  p1Hand:" + gameState.p1Hand, "  WinPredic:" + winProbability)

        if (winProbability > bestBetProbability) {
            bestBet = possibleBet;
            bestBetProbability = winProbability;
        }
    }
    return bestBet
}



const cards = [
    {
        id: 0,
        cost: 4,
        score: 3,
    }, {
        id: 1,
        cost: 0,
        score: 2,
    }
]

// Random Player
async function randomPlayer(gameState, player, round) {
    const roundState = gameState[round];
    let cardIds = [roundState[player * 2], roundState[player * 2 + 1]]
    let playerMoney = roundState[player * 1 + 4]
    const playableCards = []
    cardIds.forEach(cardId => {
        if (cardId > 0) {
            if(isCardPlayable(playerMoney, cards[cardId].cost)){
                playableCards.push(cardId);
            }
        }
    });
    const cardToPlayId = Math.round(Math.random()*(playableCards.length-1));
    return cardToPlayId;
}


function isCardPlayable(money, cost) {
    if (money >= cost) {
        return true;
    }
    return false;
}


async function runGame(player1Function, player2Function) {
    const playerHands = [[cards[0]], [cards[0]]]
    let playerMoney = [5, 5]
    let playerScore = [5, 5]
    const totalRounds = 2;
    let gameState = [
        [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    ];
    function playCard(id, player) {
        playerScore[player] += cards[id].score;
        playerMoney[player] -= cards[id].cost;

    }
    for (var round = 0; round < totalRounds; round++) {
        console.log("Starting round " + round)
        playerHands[0].push(cards[1])
        playerHands[1].push(cards[1])
        const roundState = [
            playerHands[0][0].id ?? -1,
            playerHands[0][1].id ?? -1,
            playerHands[1][0].id ?? -1,
            playerHands[1][1].id ?? -1,
            playerMoney[0],
            playerMoney[1],
            playerScore[0],
            playerScore[1],
            -1,
            -1,
        ]
        console.log("RoundState:")
        console.log( roundState)
        gameState[round] = roundState;
        const playerMoves = [await randomPlayer(gameState, 0, round), await randomPlayer(gameState, 1, round)]
        console.log("playerMoves" + playerMoves[0] +", "+playerMoves[1])
        roundState[8] = playerMoves[0];
        roundState[9] = playerMoves[1];
        gameState[round] = roundState;
        playCard( playerMoves[0], 0);
        playCard( playerMoves[1], 1);
    }
    const roundState = [
        playerHands[0][0].id ?? -1,
        playerHands[0][1].id ?? -1,
        playerHands[1][0].id ?? -1,
        playerHands[1][1].id ?? -1,
        playerMoney[0],
        playerMoney[1],
        playerScore[0],
        playerScore[1],
        -1,
        -1,
    ]
    gameState[totalRounds] = roundState;
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
        const gameStateMultipleRounds = await runGame(player1Function, player2Function)
        const finalGameState = gameStateMultipleRounds[gameStateMultipleRounds.length - 1];

        gameStates.push(...gameStateMultipleRounds)
    }
    console.log("Player 1 Earnings " + p1Earnings + "     Avg:" + Math.round(p1Earnings / numGames) + "   Wins:" + p1Wins + "   Ties:" + ties)
    console.log("Player 2 Earnings " + p2Earnings + "     Avg:" + Math.round(p2Earnings / numGames) + "   Wins:" + p2Wins)
    console.log(gameStates);
    return gameStates;
}




export default PaddingTest;