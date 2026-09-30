import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Link, Stack, TextField, Typography } from "@mui/material";
import AuthLayout from "../components/AuthLayout";
import GoogleButton from "../components/GoogleButton";
import PasswordField from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../../../lib/apiClient";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useDocumentTitle("Log in");

  const redirect = () => navigate(location.state?.from?.pathname || "/home", { replace: true });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      redirect();
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't sign you in"));
    } finally {
      setSubmitting(false);
    }
  };

  const withGoogle = async (credential) => {
    setError("");
    try {
      await googleLogin(credential);
      redirect();
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-in failed"));
    }
  };

  return (
    <AuthLayout
      title="Log in"
      subtitle="Your threads, your groups, and whatever you missed while you were out."
      footer={
        <Typography variant="body2" color="text.secondary">
          First time here?{" "}
          <Link component={RouterLink} to="/signup" sx={{ fontWeight: 650 }}>
            Make an account
          </Link>
        </Typography>
      }
    >
      <GoogleButton onCredential={withGoogle} onError={setError} />
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Box>
          <PasswordField label="Password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Box sx={{ textAlign: "right", mt: 1 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ fontWeight: 600 }}>
              Forgot password?
            </Link>
          </Box>
        </Box>
        <Button type="submit" variant="contained" size="large" disabled={submitting || !form.email || !form.password}>
          {submitting ? "Signing you in…" : "Log in"}
        </Button>
      </Stack>
    </AuthLayout>
  );
}
