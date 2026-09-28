import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { MailWarning, X } from "lucide-react";
import { tokens } from "../../../theme/tokens";
import { getErrorMessage } from "../../../lib/apiClient";
import { useToast } from "../../../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("verify-banner") === "hidden");
  const resend = useMutation({
    mutationFn: authService.resendVerification,
    onSuccess: () => toast.success(`Verification email sent to ${user.email}`),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (!user || user.emailVerified || dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem("verify-banner", "hidden");
    } catch {
      return setDismissed(true);
    }
    setDismissed(true);
  };

  return (
    <Box sx={{ mb: 2.5, px: 2, py: 1.25, borderRadius: 3, bgcolor: tokens.emberTint, border: "1px solid #f6cdbd" }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <MailWarning size={18} color={tokens.emberInk} />
        <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: tokens.emberInk }}>
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Confirm your email <strong>{user.email}</strong> to secure your account.
          </Box>
          <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
            Please confirm your email.
          </Box>
        </Typography>
        <Button size="small" onClick={() => resend.mutate()} disabled={resend.isPending} sx={{ color: tokens.emberInk, fontWeight: 700 }}>
          {resend.isPending ? "Sending..." : "Resend"}
        </Button>
        <IconButton size="small" onClick={dismiss} aria-label="Dismiss" sx={{ color: tokens.emberInk }}>
          <X size={16} />
        </IconButton>
      </Stack>
    </Box>
  );
}
