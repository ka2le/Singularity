// MyApp.js
import React from 'react';
import { Board2 } from './components/MainBoard';
import { SimpleBoard } from './quickGame/SimpleBoard';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import BettingGameContainer from './betting/BettingGame';
import SimplePokerContainer from './betting/SimplePoker';

const MyApp = () => {

  return (
    <>
      <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App" style={{  height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: `black`, backgroundSize: 'cover' }}>

        <SimplePokerContainer></SimplePokerContainer>
        </div>
      </ThemeProvider>
    </>

  );
};

export default MyApp;
