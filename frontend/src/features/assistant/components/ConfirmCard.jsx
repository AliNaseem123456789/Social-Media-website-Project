import { Box, Button, Stack, Typography } from "@mui/material";
import { tokens } from "../../../theme/tokens";

/**
 * The gate in front of every write.
 *
 * The assistant proposes; this is where a person agrees. It shows the *exact* payload — the post text as
 * it will be posted, the message as it will be sent — because "Post this?" with the text hidden is not
 * consent, it is a dialog someone clicks through.
 */

const DESCRIPTIONS = {
  create_post: "This will publish a post on your profile.",
  save_draft: "This will save a draft. Nothing is published.",
  follow_person: "This will follow this account.",
  send_message: "This will send the message.",
  save_post: "This will add the post to your saved list.",
  like_post: "This will like the post.",
};

/** The field worth reading before agreeing, per tool. */
function preview(tool, args) {
  if (tool === "create_post" || tool === "save_draft") return args.content;
  if (tool === "send_message") return args.text;
  return null;
}

export default function ConfirmCard({ write, onDecide }) {
  if (!write) return null;

  const text = preview(write.tool, write.arguments ?? {});
  const when = write.arguments?.scheduled_for;

  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: `${tokens.radius.md}px`,
        bgcolor: tokens.surface,
        border: `1px solid ${tokens.ember}`,
        boxShadow: tokens.shadow.card,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {write.label ?? "Go ahead?"}
      </Typography>

      <Typography variant="caption" sx={{ color: tokens.inkSoft, display: "block", mb: text ? 1 : 1.5 }}>
        {DESCRIPTIONS[write.tool] ?? "This will change something on your account."}
        {when ? ` Scheduled for ${new Date(when).toLocaleString()}.` : ""}
      </Typography>

      {text ? (
        <Box
          sx={{
            p: 1.25,
            mb: 1.5,
            borderRadius: `${tokens.radius.sm}px`,
            bgcolor: tokens.surfaceMuted,
            border: `1px solid ${tokens.lineSoft}`,
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {text}
          </Typography>
        </Box>
      ) : null}

      <Stack direction="row" spacing={1}>
        <Button size="small" variant="contained" onClick={() => onDecide(true)}>
          {write.label ?? "Go ahead"}
        </Button>
        <Button size="small" variant="text" onClick={() => onDecide(false)} sx={{ color: tokens.inkSoft }}>
          No, leave it
        </Button>
      </Stack>
    </Box>
  );
}
