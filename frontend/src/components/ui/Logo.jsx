import { Box } from "@mui/material";
import { Link } from "react-router-dom";
import { tokens } from "../../theme/tokens";

export default function Logo({ to = "/", size = 20, compact = false, inverted = false }) {
  const color = inverted ? tokens.paper : tokens.ink;
  return (
    <Box
      component={Link}
      to={to}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        textDecoration: "none",
        color,
        fontFamily: tokens.fontDisplay,
        fontWeight: 650,
        fontSize: size,
        letterSpacing: "-0.03em",
      }}
    >
      <Box
        component="span"
        sx={{
          position: "relative",
          width: size * 1.25,
          height: size * 1.25,
          borderRadius: "50%",
          border: `${Math.max(3, size * 0.18)}px solid ${color}`,
          flexShrink: 0,
          "&::after": {
            content: '""',
            position: "absolute",
            top: -size * 0.22,
            right: -size * 0.22,
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: "50%",
            bgcolor: tokens.ember,
          },
        }}
      />
      {!compact && "Circle"}
    </Box>
  );
}
