import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Button, Link, Stack, TextField, Typography } from "@mui/material";
import AuthLayout from "../components/AuthLayout";
import { authService } from "../services/authService";
import { getErrorMessage } from "../../../lib/apiClient";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useDocumentTitle("Reset password");

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={sent ? `If an account exists for ${email}, we sent a link to reset your password. It expires in 30 minutes.` : "Enter your email and we'll send you a reset link."}
      footer={
        <Link component={RouterLink} to="/login" variant="body2" sx={{ fontWeight: 650 }}>
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Didn't get it? Check spam, or try again in a minute.
          </Typography>
          <Button variant="outlined" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </Stack>
      ) : (
        <Stack component="form" spacing={2} onSubmit={submit}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" variant="contained" size="large" disabled={submitting || !email}>
            {submitting ? "Sending..." : "Send reset link"}
          </Button>
        </Stack>
      )}
    </AuthLayout>
  );
}
