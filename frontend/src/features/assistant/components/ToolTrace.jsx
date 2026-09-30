import { Box, Stack, Typography } from "@mui/material";
import { AlertTriangle, Check, Loader } from "lucide-react";
import { tokens } from "../../../theme/tokens";

/**
 * What the assistant actually did, while it does it.
 *
 * This exists because an assistant that answers questions about someone's account without showing its
 * working is asking to be trusted on nothing. "Searched your posts — 3 results" is checkable; a confident
 * paragraph is not. It also makes a wrong answer diagnosable: if it searched for the wrong thing, you can
 * see that it searched for the wrong thing.
 */

const LABELS = {
  suggest_people: "Looked for people to follow",
  find_people: "Looked someone up",
  search_posts: "Searched posts",
  list_my_posts: "Read your recent posts",
  list_saved_posts: "Checked your saved posts",
  list_drafts: "Checked your drafts",
  trending_hashtags: "Checked what's trending",
  catch_me_up: "Checked what you missed",
  list_conversations: "Looked at your conversations",
  read_conversation: "Read the conversation",
  pending_friend_requests: "Checked your friend requests",
  open_composer: "Opened the composer",
  go_to: "Opened a page",
};

const label = (name) => LABELS[name] ?? name.replace(/_/g, " ");

export default function ToolTrace({ tools = [] }) {
  if (!tools.length) return null;

  return (
    <Stack spacing={0.5} sx={{ mb: 1 }}>
      {tools.map((tool) => {
        const running = tool.status === "running";
        const failed = tool.status === "error";
        return (
          <Stack
            key={tool.id}
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: "center",
              px: 1,
              py: 0.4,
              borderRadius: `${tokens.radius.pill}px`,
              alignSelf: "flex-start",
              maxWidth: "100%",
              bgcolor: failed ? tokens.emberTint : tokens.surfaceMuted,
              border: `1px solid ${failed ? tokens.ember : tokens.lineSoft}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                color: failed ? tokens.ember : running ? tokens.inkFaint : tokens.signal,
                // Only the spinner spins, and not at all for people who asked for less movement.
                animation: running ? "assistantSpin 900ms linear infinite" : "none",
                "@media (prefers-reduced-motion: reduce)": { animation: "none" },
              }}
            >
              {failed ? <AlertTriangle size={12} /> : running ? <Loader size={12} /> : <Check size={12} />}
            </Box>
            <Typography
              variant="caption"
              sx={{ color: tokens.inkSoft, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {label(tool.name)}
              {tool.summary ? ` — ${tool.summary}` : ""}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}
