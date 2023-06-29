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
            <button onClick={() => train(100, 100)}>Train New Model - Random Vs Random</button>
            <button onClick={() => trainWithModel(500, 100, model)}>Continue Training Model - Ai vs Random</button>
            <button onClick={() => runGamesWithModel(100, "ai")}>Run Games</button>
            <button onClick={() => runRandomGames(1)}>Run Random Games</button>
        </div>
    );
}



async function trainModel(games, numEpochs, model = null) {
    const [xs, ys, gameLengt,] = preprocess(games);

    model = tf.sequential();
    model.add(tf.layers.dense({ units: gameLengt, activation: 'elu', inputShape: [gameLengt] }));
    model.add(tf.layers.dense({ units: gameLengt, activation: 'elu', }));
    model.add(tf.layers.dense({ units: gameLengt, activation: 'elu', }));
    model.add(tf.layers.dense({ units: gameLengt, activation: 'elu', }));
    model.add(tf.layers.dense({ units: gameLengt, activation: 'elu', }));
    model.add(tf.layers.dense({ units: gameLengt, activation: 'elu', }));
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
    console.log(inputData);
    const xs = tf.tensor2d(inputData, [inputData.length, inputData[0].length]);
    const ys = tf.tensor2d(outputData, [outputData.length, outputData[0].length]);
    return [xs, ys, inputData[0].length];
}

function getOneHotEncodedOutcome(result) {
    if (result === -1) return [1, 0, 0]; // Player 2 wins
    if (result === 0) return [0, 1, 0]; // Tie
    if (result === 1) return [0, 0, 1]; // Player 1 wins
}

function preproceseGameState(gameState, currentRound = null, action = [-1, -1]) {
    let flatGameState = [];
    const inputData = [];
    const outputData = [];
    let currentRoundInputData = []
    gameState.forEach(roundState => {
        let currentRoundTotalState = []
        const roundStateArray = [
            action[0] > -1 ? action[0] : roundState.playerMoves[0][0] ?? -1,
            action[1] > -1 ? action[1] : roundState.playerMoves[0][1] ?? -1,
            roundState.playerMoves[1][0] ?? -1,
            roundState.playerMoves[1][1] ?? -1,
            ...roundState.playerData,
            ...roundState.playerProcessing,
            ...roundState.playerScore,
            roundState.playerHands[0][0]?.id ?? -1,
            roundState.playerHands[0][1]?.id ?? -1,
            roundState.playerHands[1][1]?.id ?? -1,
            roundState.playerHands[1][1]?.id ?? -1,
            roundState.round,
        ]
        flatGameState = [...flatGameState, ...roundStateArray];
        currentRoundTotalState = [...flatGameState]
        let indexToHide = (roundState.round * roundStateArray.length) + 2;
        currentRoundTotalState[indexToHide] = -1;
        currentRoundTotalState[indexToHide + 1] = -1;
        const paddingArray = []
        for (var i = 0; i < roundStateArray.length; i++) {
            paddingArray.push(-1);
        }
        for (let round = roundState.round; round < TOTAL_ROUNDS; round++) {
            currentRoundTotalState = [...currentRoundTotalState, ...paddingArray];
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
    const round = roundState.round;
    let playerData = roundState.playerData[player];
    let playerProcessing = roundState.playerProcessing[player];
    let playableActions = []
    cards.forEach(card => {
        if (card.id > -1) {
            playableActions = [...playableActions, ...getPlayableActions(playerData, playerProcessing, card)]
        }
    });

    let bestMove = playableActions[0] ?? [-1, -1]
    let bestBetProbability = -1;
    playableActions.forEach(action => {
        const [inputData, , modelInput] = preproceseGameState(gameState, round, action)
        let prediction = model.predict(tf.tensor2d([inputData[inputData.length - 1]]));
        let winProbability = prediction.dataSync()[2]; // Index 2 is the probability of Player 1 winning

        //  console.log("Checking  "  + cardId +" winProbability "+winProbability )
        if (winProbability > bestBetProbability) {
            bestMove = action;
            bestBetProbability = winProbability;
        }
    })


    return bestMove;
}



// Random Player
async function randomPlayer(roundState, player, gameState) {
    let cards = roundState.playerHands[player];
    let playerData = roundState.playerData[player];
    let playerProcessing = roundState.playerProcessing[player];
    let playableActions = []
    cards.forEach(card => {
        if (card.id > -1) {
            playableActions = [...playableActions, ...getPlayableActions(playerData, playerProcessing, card)]
        }
    });
    const actionIndex = Math.round(Math.random() * (playableActions.length - 1));
    return playableActions[actionIndex];
}


function getPlayableActions(data, processing, card) {
    const freeAction = [card.id, 0]
    if (data >= -1 * card.paid.dataChange && processing >= -1 * card.paid.processingChange) {
        return [freeAction, [card.id, 1]];
    }
    return [freeAction];
}


const cards = [];


function createCard(description, [freeDataChange, freeProcessingChange, freeScore], [paidDataChange, paidProcessingChange, paidScore], paidFunction = ()=>{}, freeFunction = ()=>{}) {


    let card = {
        id: cards.length,
        description,
        free: {
            dataChange: freeDataChange,
            processingChange: freeProcessingChange,
            score: freeScore,
            function: freeFunction,
        },
        paid: {
            dataChange: paidDataChange,
            processingChange: paidProcessingChange,
            score: paidScore,
            function: paidFunction,
        }
    }
    cards.push(card);
}

function opponent(player){
    if(player==0){return 1}else{return 0}
}


createCards();
    function createCards() {

        for (var i = 0; i < 8; i++) {
            createCard(
                "Dubble Score",
                [0, 1, 2],
                [1, 1, 2],
                (player, playerScore, playerData, playerProcessing, round) => {
                    playerScore[player] = playerScore[player] * 2;
                }
            );
        }
        createCard(
            "Processing gives processing",
            [0, 2, 0],
            [, 0, 3],
            ()=>{},
            (player, playerScore, playerData, playerProcessing, round) => {
                playerProcessing[player] += Math.floor(playerProcessing[player] / 4) * 2;
            }
        );
        createCard(
            "Pay 1/2 processing for score",
            [0, 2, 0],
            [1, 0, 3],
            (player, playerScore, playerData, playerProcessing, round) => {
                playerScore[player] += Math.floor(playerProcessing[player] / 2);
                playerProcessing[player] -= Math.floor(playerProcessing[player] / 2);
            },

        );
        createCard(
            "Pay All Data for score",
            [0, 2, 0],
            [0, 0, 0],
            (player, playerScore, playerData, playerProcessing, round) => {
                playerScore[player] += Math.floor(playerData[player] / 2);
                playerProcessing[player] = 0;
            },

        );
        createCard(
            "Steal 1/2 Data",
            [5, 1, 0],
            [-2, -3, 0],
            (player, playerScore, playerData, playerProcessing, round) => {
                playerData[player] += Math.floor(playerData[opponent(player)] / 2);
                playerData[opponent(player)] -= Math.floor(playerData[opponent(player)] / 2);
            },
        );
        createCard(
            "Steal up to 6 Processing",
            [0, 0, 3],
            [-8, -1, -1],
            (player, playerScore, playerData, playerProcessing, round) => {
                const stealAmount = Math.max(6, playerProcessing[opponent(player)]);
                playerProcessing[player] += stealAmount;
                playerProcessing[opponent(player)] -= stealAmount;
            },
        );
        for (var i = 0; i < 8; i++) {
            createCard(
                "Data Gives Data",
                [4, 0, 0],
                [-4, -2, 6],
                ()=>{},
                (player, playerScore, playerData, playerProcessing, round) => {
                    playerData[player] += Math.floor(playerData[player] / 3) * 2;
                }
            );
        }

        for (var i = cards.length; i < TOTAL_ROUNDS * 2; i++) {
            createCard(
                "Get 5 Score or pay 10 data to double score",
                [0, 1, 5],
                [-10, -1, 1],
                (player, playerScore, playerData, playerProcessing, round) => {
                    playerScore[player] = playerScore[player] * 2;
                }
            );
        }

    }


async function runGame(player1Function, player2Function) {
    //console.log("????????????? NEW  ??????? GAME  ???????????????????")
    
    let deck = [...cards];
    let playerHands = [[drawCard()], [drawCard()]]
    let playerData = [11, 11]
    let playerProcessing = [9, 9]
    let playerScore = [5, 5]
    const totalRounds = TOTAL_ROUNDS;
    let gameState = [];
    
    function drawCard(id = null) {
        let cardIndex = Math.round(Math.random() * (deck.length - 1));
        if (id != null) {
            cardIndex = deck.indexOf(card => card.id == id) ?? cardIndex
        }
        if (cardIndex > -1) {
            const drawnCard = { ...deck[cardIndex] };
            deck.splice(cardIndex, 1)
            return drawnCard;
        } else {
            console.log("Cant Draw card");
        }
    }

    for (var round = 0; round < totalRounds; round++) {
        function playCard(action, player) {
            const currentId = action[0]
            const currentAction = action[1] == 0 ? cards[currentId]?.free : cards[currentId]?.paid;
            playerScore[player] += currentAction?.score;
            playerData[player] += currentAction?.dataChange;
            playerProcessing[player] += currentAction?.processingChange;
            const cardIndexInHand = playerHands[player].findIndex(card => card.id == currentId);
            if (player == 0) {
                // console.log("Removing " + currentId + "at" + cardIndexInHand + " in hand")
                // console.log(...playerHands[player])

            }
            if (cardIndexInHand !== -1) {
                playerHands[player].splice(cardIndexInHand, 1);
            }
            currentAction?.function(player, playerScore, playerData, playerProcessing, round);
        }
        if (round < totalRounds - 1) {
            if (playerHands[0].length < 2) {
                playerHands[0].push(drawCard())
            }
            if (playerHands[1].length < 2) {
                playerHands[1].push(drawCard())
            }
        }
        let roundState = {
            playerHands: [...playerHands],
            playerData: [...playerData],
            playerProcessing: [...playerProcessing],
            playerScore: [...playerScore],
            playerMoves: [-1, -1],
            round: round
        }
        gameState.push(roundState);
        const playerMoves = [await player1Function(roundState, 0, gameState), await player2Function(roundState, 1, gameState)]
        roundState = { ...roundState, playerMoves: [...playerMoves] }
        gameState[gameState.length - 1] = roundState;
        playCard(playerMoves[0], 0);
        playCard(playerMoves[1], 1);
        //  console.log(...playerMoves[0])
        //  console.log(...playerHands[0])
    }
    const finalGameState = {
        playerHands: playerHands,
        playerData: playerData,
        playerProcessing: playerProcessing,
        playerScore: playerScore,
        round: totalRounds,
        playerMoves: [[-1, -1], [-1, -1]]
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

    console.log(gameStates);
    const finalGame = gameStates[gameStates.length - 1];
    console.log("-----------FINAL GAME-----------");
    finalGame.forEach(roundState => {
        console.log("***************ROUND " + (roundState.round + 1) + "**************");
        console.log("Player 1 -- Processing: " + roundState.playerProcessing[0] + " Data: " + roundState.playerData[0] + " Score: " + roundState.playerScore[0] + " Move: '" + cards[roundState.playerMoves[0][0]]?.description  + "'"+roundState.playerMoves[0][1]+" Card1: " + roundState.playerHands[0][0]?.id + " Card2: " + roundState.playerHands[1][0]?.id)
        console.log("Player 2 -- Processing: " + roundState.playerProcessing[1] + " Data: " + roundState.playerData[1] + " Score: " + roundState.playerScore[1] + " Move: '" + cards[roundState.playerMoves[1][0]]?.description  + "'"+roundState.playerMoves[1][1]+" Card1: " + roundState.playerHands[1][0]?.id + " Card2: " + roundState.playerHands[1][0]?.id)

    })
    console.log("-----------TOTAL SCORE after " + numGames + " games -----------");
    console.log("Player 1 Earnings " + p1Earnings + "     Avg:" + Math.round(p1Earnings / numGames) + "   Wins:" + p1Wins + "   Ties:" + ties)
    console.log("Player 2 Earnings " + p2Earnings + "     Avg:" + Math.round(p2Earnings / numGames) + "   Wins:" + p2Wins)

    return gameStates;
}




export default PaddingTest;