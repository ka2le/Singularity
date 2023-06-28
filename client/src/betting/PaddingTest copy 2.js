import * as tf from '@tensorflow/tfjs';
import React, { useState } from 'react';

const TOTAL_ROUNDS = 10;


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
            <h1>SIMPLE AI GAME</h1>
            <button onClick={() => train(300, 100)}>Train New Model - Random Vs Random</button>
            <button onClick={() => trainWithModel(500, 100, model)}>Continue Training Model - Ai vs Random</button>
            <button onClick={() => runGamesWithModel(100, "ai")}>Run Games</button>
            <button onClick={() => runRandomGames(1)}>Run Random Games</button>
        </div>
    );
}



async function trainModel(games, numEpochs, model = null) {
    const [xs, ys, gameLengt,] = preprocess(games);

    model = tf.sequential();
    model.add(tf.layers.dense({ units: 66, activation: 'elu', inputShape: [gameLengt] }));
    model.add(tf.layers.dense({ units: 80, activation: 'elu', }));
    model.add(tf.layers.dense({ units: 80, activation: 'elu', }));
    model.add(tf.layers.dense({ units: 80, activation: 'elu', }));
    model.add(tf.layers.dense({ units: 80, activation: 'elu', }));
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'], });

    const patience = 20;
    const min_delta = 0.001;
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


const preprocess = (gameStates) => {
    let inputData = [];
    let outputData = [];
    gameStates.forEach(gameState => {
        const [newInputData, newOutputData] = preproceseGameState(gameState);
        inputData = [...inputData, ...newInputData];
        outputData = [...outputData, ...newOutputData];
    });
    const xs = tf.tensor2d(inputData, [inputData.length, inputData[0].length]);
    const ys = tf.tensor2d(outputData, [outputData.length,  outputData[0].length]);
    return [xs, ys, inputData[0].length];
}

function getOneHotEncodedOutcome(result) {
    if (result === -1) return [1, 0, 0]; // Player 2 wins
    if (result === 0) return [0, 1, 0]; // Tie
    if (result === 1) return [0, 0, 1]; // Player 1 wins
}

function preproceseGameState(gameState, currentRound = null, move = -1) {
    let flatGameState = [];
    const inputData = [];
    const outputData = [];
    let currentRoundInputData = []
    gameState.forEach(roundState => {
        let currentRoundTotalState = []
        const roundStateArray = [
            move > -1 ? move : roundState.playerMoves[0] ?? -1,
            roundState.playerMoves[1] ?? -1,
            ...roundState.playerMoney,
            ...roundState.playerScore,
            roundState.playerHands[0][0]?.id ?? -1,
            roundState.playerHands[0][1]?.id ?? -1,
            roundState.playerHands[1][1]?.id ?? -1,
            roundState.playerHands[1][1]?.id ?? -1,
            roundState.round,
        ]
        flatGameState = [...flatGameState, ...roundStateArray];
        currentRoundTotalState = [...flatGameState]
        let indexToHide = (roundState.round * roundStateArray.length) + 1;
        currentRoundTotalState[indexToHide] = -1;
        for (let round = roundState.round; round < TOTAL_ROUNDS; round++) {
            currentRoundTotalState = [...currentRoundTotalState, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
        }
        if (currentRound && roundState.round == currentRound) {
            currentRoundInputData = currentRoundTotalState
        }

        inputData.push(currentRoundTotalState);
        const result = getWinnerFromGameState(gameState);
        outputData.push(getOneHotEncodedOutcome(result));
    })
    return [inputData, outputData, currentRoundInputData]
}





// AI Player
async function aiPlayer(model, roundState, player, gameState) {
    
    let cards = roundState.playerHands[player];
    let playerMoney = roundState.playerMoney[player];
    const playableCardIds = []
    const round = roundState.round;
    //console.log("AiPlayer - Round: " + round)
    cards.forEach(card => {
        //console.log(card)
        if (card.id > -1) {
            if (isCardPlayable(playerMoney, card.cost)) {
                playableCardIds.push(card.id);
            }
        }
    });
    let bestMove = playableCardIds[0] ?? -1
    let bestBetProbability = -1;
    playableCardIds.forEach(cardId => {
        const [inputData, , modelInput] = preproceseGameState(gameState, round, cardId)
        let prediction = model.predict(tf.tensor2d([inputData[inputData.length - 1]]));
        let winProbability = prediction.dataSync()[2]; // Index 2 is the probability of Player 1 winning
        
      //  console.log("Checking  "  + cardId +" winProbability "+winProbability )
        if (winProbability > bestBetProbability) {
            bestMove = cardId;
            bestBetProbability = winProbability;
        }
    })

    
    return bestMove;
}



// Random Player
async function randomPlayer(roundState, player, gameState) {
    // console.log("Player " + (player + 1))
    let cards = roundState.playerHands[player];
    let playerMoney = roundState.playerMoney[player];
    const playableCards = []
    cards.forEach(card => {
        //console.log(card)
        if (card.id > -1) {
            if (isCardPlayable(playerMoney, card.cost)) {
                playableCards.push(card.id);
            }
        }
    });
    const cardToPlayIndex = Math.round(Math.random() * (playableCards.length - 1));
    //console.log(playableCards)
    //console.log(cardToPlayIndex)
    return playableCards[cardToPlayIndex] ?? -1;
}


function isCardPlayable(money, cost) {
    if (money >= cost) {
        return true;
    }
    return false;
}



const cards = [
    {
        id: 0,
        cost: 5,
        score: 1,
        function: (player,playerScore, playerMoney, round) =>{
            console.log("Round "+ (round+1)+ " Player "+ (player+1)+ " score: "+ playerScore[player])
            console.log("Roundsleft "+ (TOTAL_ROUNDS- round-1))
            playerScore[player] = playerScore[player]*2
            console.log("Player "+ (player+1)+ "score: "+ playerScore[player])
        } 
    }, {
        id: 1,
        cost: 0,
        score: -1,
        function: (player,playerScore, playerMoney, round) =>{
            playerMoney[player] = playerMoney[player]*2
        } 
    },
    {
        id: 2,
        cost: 1,
        score: 5,
        function: () => {}
    },
    {
        id: 3,
        cost: 2,
        score: 12,
        function: () => {}

    }
]


async function runGame(player1Function, player2Function) {
    let playerHands = [[cards[0]], [cards[0]]]
    let playerMoney = [10, 10]
    let playerScore = [5, 5]
    const totalRounds = TOTAL_ROUNDS;
    let gameState = [];
    
    for (var round = 0; round < totalRounds; round++) {
        function playCard(id, player) {
            if (id > -1) {
                playerScore[player] += cards[id].score;
                playerMoney[player] -= cards[id].cost;
                const cardIndexInHand = playerHands[player].findIndex(card => card.id == id);
                playerHands[player] = cardIndexInHand !== -1 && playerHands[player].splice(cardIndexInHand, 1);
                cards[id].function(player, playerScore, playerMoney,round);
            } else {
                //console.log("No card Played")
            }
    
    
        }
        // console.log("Starting round " + round)
        if (round < totalRounds - 1) {
            if (playerHands[0].length < 2) {
                playerHands[0].push(cards[Math.round(Math.random() * (cards.length - 1))])
            }
            if (playerHands[1].length < 2) {
                playerHands[1].push(cards[Math.round(Math.random() * (cards.length - 1))])
            }
            //playerHands = [[cards[0], cards[1]], [cards[0], cards[1]]];

        }
        let roundState = {
            playerHands: [...playerHands],
            playerMoney: [...playerMoney],
            playerScore: [...playerScore],
            playerMoves: [-1, -1],
            round: round
        }
        //console.log("RoundState:")
        // console.log(roundState)
        gameState.push(roundState);
        const playerMoves = [await player1Function(roundState, 0, gameState), await player2Function(roundState, 1, gameState)]
        //   console.log("playerMoves" + playerMoves[0] + ", " + playerMoves[1])
        roundState = { ...roundState, playerMoves: [...playerMoves] }
        gameState[gameState.length - 1] = roundState;
        playCard(playerMoves[0], 0);
        playCard(playerMoves[1], 1);
    }
    const finalGameState = {
        playerHands: playerHands,
        playerMoney: playerMoney,
        playerScore: playerScore,
        round: totalRounds,
        playerMoves: [-1, -1]
    }
    gameState.push(finalGameState);
    return gameState
}

function getWinnerFromGameState(gameState) {
    const finalGameState = gameState[gameState.length - 1];
    const p1Score = finalGameState.playerScore[0];
    const p2Score = finalGameState.playerScore[1];
    if (p1Score > p2Score) {
        return 1
    } else if (p2Score > p1Score) {
        return -1;
    } else {
        return 0;
    }
}

async function runGames(player1Function, player2Function, numGames) {
    const gameStates = []
    let p1Wins = 0;
    let p2Wins = 0;
    let p1Earnings = 0;
    let p2Earnings = 0;
    let ties = 0;
    for (let i = 0; i < numGames; i++) {
       // console.log("NEW GAME " +i)
        const gameStateMultipleRounds = await runGame(player1Function, player2Function)
        const finalGameState = gameStateMultipleRounds[gameStateMultipleRounds.length - 1];
        const p1Score = finalGameState.playerScore[0];
        const p2Score = finalGameState.playerScore[1];
        if (p1Score > p2Score) {
            p1Wins++;
        } else if (p2Score > p1Score) {
            p2Wins++;
        } else {
            ties++;
        }
        p1Earnings += p1Score;
        p2Earnings += p2Score;
        gameStates.push(gameStateMultipleRounds)
    }
    console.log("Player 1 Earnings " + p1Earnings + "     Avg:" + Math.round(p1Earnings / numGames) + "   Wins:" + p1Wins + "   Ties:" + ties)
    console.log("Player 2 Earnings " + p2Earnings + "     Avg:" + Math.round(p2Earnings / numGames) + "   Wins:" + p2Wins)
    console.log(gameStates);
    return gameStates;
}




export default PaddingTest;