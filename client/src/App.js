// MyApp.js
import React from 'react';
import { Board2 } from './components/MainBoard';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

const MyApp = () => {

  return (
    <>
      <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App" style={{  height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: `black`, backgroundSize: 'cover' }}>

        <Board2>

        </Board2>
        </div>
      </ThemeProvider>
    </>

  );
};

export default MyApp;
