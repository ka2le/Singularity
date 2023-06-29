import * as tf from '@tensorflow/tfjs';
import React, { useState,useEffect } from 'react';

const TOTAL_ROUNDS = 10;

export const ReinforementLearning = () => {
    const [model, setModel] = useState(prepareModel());
    const [gamesPlayed, setGamesPlayed] = useState(0);
    const [gamesToPlay, setGamesToPlay] = useState(0);
    const [shouldLog, setShouldLog] = useState(false);
    async function runRandomGames(numRandomGames) {
        await runGames(randomPlayer, randomPlayer, numRandomGames);
    }
    async function runAiGames(numGames, logging = false) {
        
        setGamesToPlay(numGames);
        setGamesPlayed(0);
        setShouldLog(logging);
        runGame(aiPlayer.bind(null, model), randomPlayer)
                .then(gameState => {
                    console.log(gameState);
                    setModel(prevModel => updateModel(gameState, prevModel, 0.1, 0.9));
                    setGamesPlayed(prevGamesPlayed => prevGamesPlayed + 1);
                });
      
    }
    
    useEffect(() => {
        if (gamesPlayed < gamesToPlay) {
            runGame(aiPlayer.bind(null, model), randomPlayer)
                .then(gameState => {
                    setModel(prevModel => updateModel(gameState, prevModel, 0.1, 0.9));
                    setGamesPlayed(prevGamesPlayed => prevGamesPlayed + 1);
                });
        }else{
            if(shouldLog){
                console.log(model)
            }
        }
        
    }, [model, gamesPlayed]);

    return (
        <div>
            <h1>Reinforement Learning</h1>
            <button onClick={() => runRandomGames(1)}>Run Random Games</button>
            <button onClick={() => runAiGames(100)}>Run Ai Games</button>
            <button onClick={() => runAiGames(10, true)}>Run and Log Ai Games </button>
        </div>
    );
}



function prepareModel() {
    // The model is a simple lookup table of states to Q-values.
    // Since there are multiple possible states, it is initialized as an empty object.
    // This allows us to add new states as we encounter them.
    const model = {};

    // Initialize Q-values for each state-action pair to 0.
    for (let round = 0; round <= TOTAL_ROUNDS; round++) {
        for (let playerScore = 0; playerScore <= 50; playerScore++) {
            for (let playerMoney = 0; playerMoney <= 50; playerMoney++) {
                for (let moveType = 0; moveType <= 3; moveType++) {
                    for (let moveValue = 0; moveValue <= playerMoney; moveValue++) {
                        const state = `${round}-${playerScore}-${playerMoney}`;
                        const action = `${moveType}-${moveValue}`;

                        if (!model[state]) {
                            model[state] = {};
                        }

                        model[state][action] = 0;
                    }
                }
            }
        }
    }

    return model;
}
function updateModel(gameState, model, alpha, gamma) {
    const finalScore = gameState[gameState.length - 1].playerScore[0];

    for (let i = gameState.length - 2; i >= 0; i--) {
        const state = processGameState(gameState[i]);
        const action = `${gameState[i].playerMoves[0][0]}-${gameState[i].playerMoves[0][1]}`;

        // Ensure the state and action exist in the model.
        if (!model[state]) {
          //  console.log('State does not exist in the model:', state);
            model[state] = {};
        }
        if (!model[state][action]) {
        //    console.log('Action does not exist in the model:', action);
            model[state][action] = 0;
        }

        let maxQNext = 0;
        if (i + 1 < gameState.length) {
            const nextState = processGameState(gameState[i + 1]);
            if (model[nextState]) {
                maxQNext = Math.max(...Object.values(model[nextState]));
            } else {
          //      console.log('Next state does not exist in the model:', nextState);
            }
        }
        const QOld = model[state][action];

        model[state][action] = QOld + alpha * (finalScore + gamma * maxQNext - QOld);
    }
    return model
}


function processGameState(gameState) {
    // Convert the game state into a string format that can be used to index into the model.
    // You can adjust this to include whatever information you deem necessary for the state representation.
    const round = gameState.round;
    const playerScore = gameState.playerScore[0];
    const playerMoney = gameState.playerMoney[0];

    return `${round}-${playerScore}-${playerMoney}`;
}


// AI Player
function aiPlayer(model, roundState, playerId, gameState) {
    // We are using the epsilon-greedy strategy for action selection.
    // You can adjust the value of epsilon to trade-off between exploration and exploitation.
    const epsilon = 0.1;

    // Convert the round state into a string format that can be used to index into the model.
    const state = processGameState(roundState);
    if (!model[state]) {
        return randomPlayer(roundState, playerId, gameState);
    }

    if (Math.random() < epsilon) {
        // Exploration: Choose a random action.
        const moveType = Math.floor(Math.random() * 4);
        const moveValue = Math.floor(Math.random() * (roundState.playerMoney[playerId] + 1));
        return [moveType, moveValue];
    } else {
        // Exploitation: Choose the action with the highest Q-value.
        let bestAction;
        let bestQValue = -Infinity;

        for (const action in model[state]) {
            const QValue = model[state][action];

            if (QValue > bestQValue) {
                bestAction = action;
                bestQValue = QValue;
            }
        }

        const [moveType, moveValue] = bestAction.split('-').map(Number);
        return [moveType, moveValue];
    }
}

// Random Player
async function randomPlayer(roundState, playerId, gameState) {
    const moveType = Math.round(Math.random() * (3));
    const moveValue = Math.round(Math.random() * (roundState?.playerMoney[playerId] ?? 0));
  //  console.log(moveType, moveValue)
    return [moveType, moveValue]
}

function makeMove(currentPlayerMoves, playerId, playerMoney, playerScore) {
    const moveType = currentPlayerMoves[0];
    const moveValue = currentPlayerMoves[1];
    //console.log(moveType, moveValue)
    if (moveType == 0) {
        playerMoney[playerId] += (Math.floor(playerMoney[playerId] / 3) + 5);
    }
    if (moveType == 1) {
        playerScore[playerId] += 1;
    }
    if (moveType == 2) {
        const change = Math.min(moveValue, playerMoney[playerId]);
        playerScore[playerId] += change;
        playerMoney[playerId] -= change;
    }
    if (moveType == 3) {
        const change = Math.min(moveValue, playerScore[playerId]);
        playerScore[playerId] -= change;
        playerMoney[playerId] += change * 2;
    }

}


async function runGame(player1Function, player2Function) {
    let playerMoney = [11, 11]
    let playerScore = [5, 5]
    const totalRounds = TOTAL_ROUNDS;
    let gameState = [];
    for (var round = 0; round < totalRounds; round++) {
        let roundState = {
            playerScore: [...playerScore],
            playerMoney: [...playerMoney],
            round: round
        }
        gameState.push(roundState);

        const playerMoves = [await player1Function(roundState, 0, gameState), await player2Function(roundState, 1, gameState)]
        roundState = { ...roundState, playerMoves: [...playerMoves] }
        gameState[gameState.length - 1] = roundState;
      //  console.log(roundState)
        makeMove(playerMoves[0], 0, playerMoney, playerScore);
        makeMove(playerMoves[1], 1, playerMoney, playerScore);
    }
    const finalGameState = {
        playerScore: playerScore,
        playerMoney: playerMoney,
        round: totalRounds,
        playerMoves: [[-1, -1], [-1, -1]]
    }
    gameState.push(finalGameState);
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

    console.log("-----------TOTAL SCORE after " + numGames + " games -----------");
    console.log("Player 1 Earnings " + p1Earnings + "     Avg:" + Math.round(p1Earnings / numGames) + "   Wins:" + p1Wins + "   Ties:" + ties)
    console.log("Player 2 Earnings " + p2Earnings + "     Avg:" + Math.round(p2Earnings / numGames) + "   Wins:" + p2Wins)
    return gameStates;
}




export default ReinforementLearning;