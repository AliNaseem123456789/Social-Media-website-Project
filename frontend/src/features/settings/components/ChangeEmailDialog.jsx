import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MailCheck, X } from "lucide-react";
import { getErrorMessage, getFieldErrors } from "../../../lib/apiClient";
import { tokens } from "../../../theme/tokens";
import { useAuth } from "../../auth/context/AuthContext";
import { authService } from "../../auth/services/authService";
import PasswordField from "../../auth/components/PasswordField";

export default function ChangeEmailDialog({ open, onClose }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(null);
  const hasPassword = user?.hasPassword !== false;

  const request = useMutation({
    mutationFn: () => authService.requestEmailChange({ email: email.trim(), password: hasPassword ? password : undefined }),
    onSuccess: (result) => {
      setErrors({});
      setSent({ pendingEmail: result?.pendingEmail ?? email.trim(), expiresInHours: result?.expiresInHours });
    },
    onError: (err) => {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length) return setErrors(fields);
      const code = err?.response?.data?.error?.code;
      const message = getErrorMessage(err);
      if (code === "EMAIL_TAKEN") return setErrors({ email: message });
      if (/password/i.test(message)) return setErrors({ password: message });
      setErrors({ form: message });
    },
  });

  const close = () => {
    if (request.isPending) return;
    setEmail("");
    setPassword("");
    setErrors({});
    setSent(null);
    onClose();
  };

  const submit = (event) => {
    event.preventDefault();
    setErrors({});
    request.mutate();
  };

  const ready = email.trim().length > 0 && (!hasPassword || password.length > 0);

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle component="div">
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          {sent ? "Check your new inbox" : "Change email"}
          <IconButton onClick={close} disabled={request.isPending} aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>

      {sent ? (
        <>
          <DialogContent>
            <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", pt: 0.5 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "18px",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: tokens.signalTint,
                  color: tokens.signal,
                }}
              >
                <MailCheck size={24} strokeWidth={1.8} />
              </Box>
              <Typography sx={{ fontWeight: 650, wordBreak: "break-all" }}>{sent.pendingEmail}</Typography>
              <Typography variant="body2" color="text.secondary">
                We sent a confirmation link there. Your address stays {user?.email} until you open that link, and
                confirming signs you out on every other device.
              </Typography>
              {sent.expiresInHours && (
                <Typography variant="caption">
                  The link works for {sent.expiresInHours} {sent.expiresInHours === 1 ? "hour" : "hours"}.
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="contained" onClick={close}>
              Done
            </Button>
          </DialogActions>
        </>
      ) : (
        <Box component="form" onSubmit={submit}>
          <DialogContent>
            <Stack spacing={2}>
              {errors.form && <Alert severity="error">{errors.form}</Alert>}
              <Typography variant="body2" color="text.secondary">
                You are signed in as {user?.email}. We send a confirmation link to the new address, and the change
                only takes effect once you open it.
              </Typography>
              <TextField
                label="New email address"
                type="email"
                autoComplete="email"
                value={email}
                error={Boolean(errors.email)}
                helperText={errors.email}
                onChange={(event) => setEmail(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              {hasPassword && (
                <PasswordField
                  label="Current password"
                  autoComplete="current-password"
                  value={password}
                  error={errors.password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="outlined" onClick={close} disabled={request.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={!ready || request.isPending}>
              {request.isPending ? "Sending..." : "Send confirmation link"}
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}
