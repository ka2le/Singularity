import { createTheme } from '@mui/material/styles';


export const themeOptions = {
    palette: {
        type: 'dark',
        primary: {
            main: '#23a2c7',
            dark: '#006f8e',
        },
        secondary: {
            main: '#fff484',
        },
        background: {
            default: '#252222',
            paper: 'rgba(89,205,255,0.43)',
        },
        text: {
            primary: '#bffbf4',
            secondary: 'rgba(239,235,147,0.7)',
        },
        error: {
            main: '#ffbcb7',
        },
    },
    typography: {
        fontFamily: 'Orbit',
    },
};


const theme = createTheme(themeOptions);


export default theme;
