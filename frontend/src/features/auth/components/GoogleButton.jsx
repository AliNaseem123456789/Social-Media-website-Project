import { GoogleLogin } from "@react-oauth/google";
import { Box, Divider, Typography } from "@mui/material";
import { env } from "../../../config/env";
import { tokens } from "../../../theme/tokens";

export default function GoogleButton({ onCredential, onError, text = "continue_with" }) {
  if (!env.googleClientId) {
    if (env.isDev) console.warn("Google sign-in is hidden: set VITE_GOOGLE_CLIENT_ID in frontend/.env and restart the dev server.");
    return null;
  }
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", "& > div": { width: "100%" } }}>
        <GoogleLogin
          onSuccess={(res) => onCredential(res.credential)}
          onError={() => onError?.("Google sign-in was cancelled or failed")}
          text={text}
          shape="pill"
          size="large"
          width="360"
        />
      </Box>
      <Divider sx={{ my: 2.5 }}>
        <Typography
          sx={{
            fontFamily: tokens.fontMono,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "text.disabled",
          }}
        >
          or
        </Typography>
      </Divider>
    </>
  );
}
