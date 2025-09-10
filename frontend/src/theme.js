import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',           // sets MUI dark mode
    background: {
      default: '#1e1e1e',   // background everywhere
      paper: '#2c2c2c',     // cards, panels
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
    },
  },
});

export default theme;
