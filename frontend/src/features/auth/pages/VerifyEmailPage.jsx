import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { CircleCheck, CircleX } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../../../lib/apiClient";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { tokens } from "../../../theme/tokens";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const isChange = params.get("change") === "1";
  const { isAuthenticated, reloadSession } = useAuth();
  const [state, setState] = useState({ status: token ? "verifying" : "error", message: token ? "" : "This link is missing its token." });
  const [signedOut, setSignedOut] = useState(false);
  const started = useRef(false);
  useDocumentTitle(isChange ? "Confirm email change" : "Verify email");

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    const confirm = isChange ? authService.confirmEmailChange(token) : authService.verifyEmail(token);
    confirm
      .then((result) => setState({ status: "done", email: result?.email }))
      .catch((err) => setState({ status: "error", message: getErrorMessage(err) }));
  }, [token, isChange]);

  /**
   * Confirming an email change signs out every session, so a refresh that fails here means this browser
   * was one of them and needs to log in again rather than being nudged back into the app.
   */
  useEffect(() => {
    if (state.status !== "done" || !isAuthenticated) return;
    reloadSession().catch(() => setSignedOut(true));
  }, [state.status, isAuthenticated, reloadSession]);

  const needsLogin = signedOut || !isAuthenticated;

  return (
    <AuthLayout title={isChange ? "Email change" : "Email verification"}>
      <Stack spacing={2.5} sx={{ alignItems: "center", textAlign: "center", mt: 3 }}>
        {state.status === "verifying" && (
          <>
            <CircularProgress size={28} />
            <Typography color="text.secondary">{isChange ? "Confirming your new email..." : "Confirming your email..."}</Typography>
          </>
        )}
        {state.status === "done" && (
          <>
            <Box sx={{ color: tokens.signal }}>
              <CircleCheck size={48} />
            </Box>
            {isChange ? (
              <>
                <Typography variant="h6">Your email is updated</Typography>
                <Typography color="text.secondary" sx={{ wordBreak: "break-all" }}>
                  You'll sign in with {state.email ?? "your new address"} from now on.
                </Typography>
                <Typography variant="caption" sx={{ maxWidth: 320 }}>
                  {needsLogin
                    ? "Every session was signed out for security, including this one."
                    : "Every other session was signed out for security."}
                </Typography>
                <Button component={RouterLink} to={needsLogin ? "/login" : "/settings"} variant="contained" size="large">
                  {needsLogin ? "Log in again" : "Back to settings"}
                </Button>
              </>
            ) : (
              <>
                <Typography variant="h6">Your email is verified</Typography>
                <Button component={RouterLink} to={isAuthenticated ? "/home" : "/login"} variant="contained" size="large">
                  {isAuthenticated ? "Go to your feed" : "Log in"}
                </Button>
              </>
            )}
          </>
        )}
        {state.status === "error" && (
          <>
            <Box sx={{ color: tokens.danger }}>
              <CircleX size={48} />
            </Box>
            <Typography variant="h6">{isChange ? "We couldn't confirm your new email" : "We couldn't verify your email"}</Typography>
            <Typography color="text.secondary">{state.message}</Typography>
            {isChange ? (
              <Button component={RouterLink} to={isAuthenticated ? "/settings" : "/login"} variant="outlined">
                {isAuthenticated ? "Try again from Settings" : "Log in to try again"}
              </Button>
            ) : (
              <Button component={RouterLink} to={isAuthenticated ? "/settings" : "/login"} variant="outlined">
                {isAuthenticated ? "Send a new link from Settings" : "Log in to request a new link"}
              </Button>
            )}
          </>
        )}
      </Stack>
    </AuthLayout>
  );
}
