const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();



const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});
let gameState = {
    players: [],
    currentPlayer: null,
    gameStarted: false,
    // more game state can be added as needed
};

io.on('connection', (socket) => {
    console.log('New client connected');

    // event for a player joining the game
    socket.on('join game', (playerName) => {
        if (gameState.players.length < 2) {
            gameState.players.push({
                id: socket.id,
                name: playerName,
                // add more player properties as needed
            });
            console.log(`${playerName} has joined the game`);
        }
    });

    // event for starting the game
    socket.on('start game', () => {
        if (gameState.players.length === 2 && !gameState.gameStarted) {
            gameState.gameStarted = true;
            // set currentPlayer to the first player
            gameState.currentPlayer = gameState.players[0].id;
            console.log('The game has started');
        }
    });

    // event for a player making a move
    socket.on('make move', (move) => {
        // check if it's the current player's turn and the game has started
        if (gameState.gameStarted && socket.id === gameState.currentPlayer) {
            console.log(`${socket.id} made a move: ${move}`);
            // here, you would update the game state based on the move

            // then, switch to the other player
            gameState.currentPlayer =
                gameState.currentPlayer === gameState.players[0].id
                    ? gameState.players[1].id
                    : gameState.players[0].id;
        }
    });

    socket.on('disconnect', () => console.log('Client disconnected'));
});
io.emit('game update', gameState);


server.listen(8000, () => console.log('Server listening on port 8000'));
