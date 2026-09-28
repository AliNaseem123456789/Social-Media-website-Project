import { useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Alert, Button, Link, Stack } from "@mui/material";
import AuthLayout from "../components/AuthLayout";
import PasswordField from "../components/PasswordField";
import { authService } from "../services/authService";
import { getErrorMessage, getFieldErrors } from "../../../lib/apiClient";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(token ? "" : "This reset link is missing its token. Request a new one.");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useDocumentTitle("Choose a new password");

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirm) return setErrors({ confirm: "Passwords don't match" });
    setSubmitting(true);
    setErrors({});
    setError("");
    try {
      await authService.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={done ? "Password updated" : "Choose a new password"}
      subtitle={done ? "You've been signed out of all devices. Log in with your new password." : "Make it something you haven't used before."}
    >
      {done ? (
        <Button component={RouterLink} to="/login" variant="contained" size="large" fullWidth>
          Log in
        </Button>
      ) : (
        <Stack component="form" spacing={2} onSubmit={submit}>
          {error && (
            <Alert severity="error" action={<Link component={RouterLink} to="/forgot-password" sx={{ fontWeight: 650, whiteSpace: "nowrap" }}>New link</Link>}>
              {error}
            </Alert>
          )}
          <PasswordField label="New password" autoComplete="new-password" autoFocus showStrength value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <PasswordField label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
          <Button type="submit" variant="contained" size="large" disabled={submitting || !token || !password}>
            {submitting ? "Saving..." : "Update password"}
          </Button>
        </Stack>
      )}
    </AuthLayout>
  );
}
