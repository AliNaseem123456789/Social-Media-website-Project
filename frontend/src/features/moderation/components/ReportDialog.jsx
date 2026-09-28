import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Check, X } from "lucide-react";
import { tokens } from "../../../theme/tokens";
import { reasonHint, reasonLabel, subjectNoun } from "../reasons";
import { useReport, useReportReasons } from "../hooks";

const MAX_DETAILS = 1000;

const rowSx = (selected) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 1.25,
  px: 1.25,
  py: 1.1,
  borderRadius: `${tokens.radius.sm}px`,
  border: `1px solid ${selected ? tokens.ink : tokens.line}`,
  bgcolor: selected ? tokens.wash.ink : "transparent",
  cursor: "pointer",
  transition: "border-color .15s, background-color .15s",
  "&:hover": { borderColor: selected ? tokens.ink : tokens.inkFaint, bgcolor: tokens.wash.ink },
  "&:focus-within": { outline: `2px solid ${tokens.ink}`, outlineOffset: 2 },
});

export default function ReportDialog({ subjectType, subjectId, subjectLabel, open, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(null);

  const reasons = useReportReasons({ enabled: open });
  const report = useReport();
  const noun = subjectNoun(subjectType);
  const pending = report.isPending;

  const close = () => {
    if (pending) return;
    setReason("");
    setDetails("");
    setSent(null);
    onClose();
  };

  const submit = (event) => {
    event.preventDefault();
    if (!reason || pending) return;
    report.mutate(
      { subjectType, subjectId, reason, details: details.trim() || undefined },
      { onSuccess: (result) => setSent(result) },
    );
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="report-dialog-title">
      <DialogTitle component="div" id="report-dialog-title">
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {sent ? (sent.alreadyReported ? "Already reported" : "Report sent") : `Report this ${noun}`}
            </Typography>
            {subjectLabel && (
              <Typography variant="caption" component="p" noWrap sx={{ mt: 0.25 }}>
                {subjectLabel}
              </Typography>
            )}
          </Box>
          <IconButton onClick={close} disabled={pending} aria-label="Close" sx={{ mt: -0.5, mr: -0.5 }}>
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        {sent ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: 38,
                  height: 38,
                  borderRadius: "12px",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: tokens.signalTint,
                  color: tokens.ink,
                }}
              >
                <Check size={18} strokeWidth={2.4} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: tokens.ink }}>
                  {sent.message}
                </Typography>
                <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
                  The person you reported is not told who reported them.
                </Typography>
              </Box>
            </Stack>
            <Button variant="contained" onClick={close} sx={{ alignSelf: "flex-end" }}>
              Done
            </Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={submit}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Pick the closest reason. Reports are private, and a moderator reads every one.
            </Typography>

            {reasons.isLoading && (
              <Stack spacing={1}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={58} sx={{ borderRadius: `${tokens.radius.sm}px` }} />
                ))}
              </Stack>
            )}

            {reasons.isError && (
              <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
                <Typography variant="body2" color="text.secondary">
                  The reason list didn&apos;t load.
                </Typography>
                <Button variant="outlined" size="small" onClick={() => reasons.refetch()}>
                  Try again
                </Button>
              </Stack>
            )}

            {!reasons.isLoading && !reasons.isError && (
              <>
                <RadioGroup
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  aria-label={`Reason for reporting this ${noun}`}
                  sx={{ gap: 0.75 }}
                >
                  {(reasons.data ?? []).map((key, index) => {
                    const selected = reason === key;
                    const hint = reasonHint(key);
                    return (
                      <Box component="label" key={key} sx={rowSx(selected)}>
                        <Radio
                          value={key}
                          size="small"
                          autoFocus={index === 0}
                          slotProps={{ input: { "aria-describedby": hint ? `reason-hint-${key}` : undefined } }}
                          sx={{ p: 0.25, color: tokens.inkFaint, "&.Mui-checked": { color: tokens.ink } }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: tokens.ink }}>
                            {reasonLabel(key)}
                          </Typography>
                          {hint && (
                            <Typography id={`reason-hint-${key}`} variant="caption" component="p">
                              {hint}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </RadioGroup>

                <Box sx={{ mt: 2 }}>
                  <TextField
                    label="Anything else we should know? (optional)"
                    multiline
                    minRows={3}
                    maxRows={6}
                    value={details}
                    onChange={(event) => setDetails(event.target.value.slice(0, MAX_DETAILS))}
                    disabled={pending}
                    slotProps={{ htmlInput: { maxLength: MAX_DETAILS } }}
                  />
                  <Typography
                    variant="caption"
                    component="p"
                    aria-live="polite"
                    sx={{ mt: 0.5, textAlign: "right", color: details.length >= MAX_DETAILS ? tokens.danger : undefined }}
                  >
                    {details.length}/{MAX_DETAILS}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
                  <Button variant="outlined" onClick={close} disabled={pending}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!reason || pending}
                    startIcon={pending ? <CircularProgress size={14} thickness={5} color="inherit" /> : undefined}
                  >
                    {pending ? "Sending..." : "Send report"}
                  </Button>
                </Stack>
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
