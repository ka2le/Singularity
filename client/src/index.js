import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameProvider } from './GameContext';
import App from './App';


const root = document.getElementById('root');

ReactDOM.createRoot(root).render(
    <GameProvider>
      <App />
    </GameProvider>
);
