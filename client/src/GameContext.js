import React from 'react';

const GameContext = React.createContext();


const initialState =  {
    "Test":"hej"
}

const gameReducer = (state, action) => {
  // Handle actions and update state
};

export const GameProvider = ({ children }) => {
  const [state, dispatch] = React.useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = React.useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
