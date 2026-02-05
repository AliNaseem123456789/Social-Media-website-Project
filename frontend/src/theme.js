import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#1e1e1e",
      paper: "#2c2c2c",
    },
    text: {
      primary: "#ffffff",
      secondary: "#cccccc",
    },
  },
});

export default theme;
