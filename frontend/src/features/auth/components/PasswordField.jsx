import { useState } from "react";
import { Box, IconButton, InputAdornment, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import { tokens } from "../../../theme/tokens";

export function passwordStrength(value = "") {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

const LABELS = ["Too weak", "Weak", "Okay", "Good", "Strong"];
const COLORS = [tokens.danger, tokens.danger, "#d98b1f", tokens.signal, tokens.signal];

export default function PasswordField({ error, helperText, showStrength = false, value, ...props }) {
  const [visible, setVisible] = useState(false);
  const score = passwordStrength(value);

  return (
    <Box>
      <TextField
        type={visible ? "text" : "password"}
        value={value}
        error={Boolean(error)}
        helperText={error || helperText}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setVisible((v) => !v)} edge="end" aria-label={visible ? "Hide password" : "Show password"} size="small">
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        {...props}
      />
      {showStrength && value && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 1 }}>
          <LinearProgress variant="determinate" value={(score / 4) * 100} sx={{ flex: 1, height: 5, "& .MuiLinearProgress-bar": { bgcolor: COLORS[score] } }} />
          <Typography variant="caption" sx={{ color: COLORS[score], minWidth: 56, textAlign: "right" }}>
            {LABELS[score]}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
