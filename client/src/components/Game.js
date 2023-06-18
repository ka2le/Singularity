import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Board from './Board';


let socket;

const Game = () => {
    const [name, setName] = useState('');
    const [gameStarted, setGameStarted] = useState(false);

    useEffect(() => {
        socket = io('http://localhost:8000');
    }, []);

    const joinGame = () => {
        socket.emit('join game', name);
    };

    const startGame = () => {
        socket.emit('start game');
        setGameStarted(true);
    };

    const makeMove = () => {
        // for now, just send a dummy move
        socket.emit('make move', 'dummy move');
    };

    return (
        <>
            <div>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                />
                <button onClick={joinGame}>Join Game</button>
                <button onClick={startGame}>Start Game</button>
                {gameStarted && <button onClick={makeMove}>Make a Move</button>}
            </div>
            <Board></Board>
        </>
    );
};

export default Game;
