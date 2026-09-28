import { Box, CircularProgress } from "@mui/material";
import Logo from "./Logo";

export default function LoadingScreen() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <Logo size={26} />
        <CircularProgress size={22} thickness={5} sx={{ color: "text.secondary" }} />
      </Box>
    </Box>
  );
}
