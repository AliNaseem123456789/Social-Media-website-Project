import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Button, Link, Stack, TextField, Typography } from "@mui/material";
import AuthLayout from "../components/AuthLayout";
import GoogleButton from "../components/GoogleButton";
import PasswordField from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, getFieldErrors } from "../../../lib/apiClient";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

function validate({ username, email, password }) {
  const errors = {};
  if (username.trim().length < 3) errors.username = "At least 3 characters";
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid email address";
  if (password.length < 8) errors.password = "At least 8 characters";
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = "Use at least one letter and one number";
  return errors;
}

export default function SignupPage() {
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useDocumentTitle("Create account");

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setError("");
    if (Object.keys(found).length) return;
    setSubmitting(true);
    try {
      await signup(form.username.trim(), form.email.trim(), form.password);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err, "Couldn't create your account"));
    } finally {
      setSubmitting(false);
    }
  };

  const withGoogle = async (credential) => {
    try {
      const user = await googleLogin(credential);
      navigate(user.onboardingCompleted ? "/home" : "/onboarding", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-up failed"));
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Takes about thirty seconds. No credit card."
      footer={
        <Typography variant="body2" color="text.secondary">
          Already have an account?{" "}
          <Link component={RouterLink} to="/login" sx={{ fontWeight: 650 }}>
            Log in
          </Link>
        </Typography>
      }
    >
      <GoogleButton onCredential={withGoogle} onError={setError} text="signup_with" />
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Name" autoComplete="name" autoFocus value={form.username} onChange={set("username")} error={Boolean(errors.username)} helperText={errors.username} slotProps={{ htmlInput: { maxLength: 30 } }} />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={Boolean(errors.email)} helperText={errors.email} />
        <PasswordField label="Password" autoComplete="new-password" showStrength value={form.password} onChange={set("password")} error={errors.password} helperText="8+ characters with a letter and a number" />
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
        <Typography variant="caption" sx={{ textAlign: "center" }}>
          By continuing you agree to our{" "}
          <Link component={RouterLink} to="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link component={RouterLink} to="/privacy">
            Privacy Policy
          </Link>
          .
        </Typography>
      </Stack>
    </AuthLayout>
  );
}
