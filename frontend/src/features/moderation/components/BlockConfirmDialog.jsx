import { Box, Typography } from "@mui/material";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { tokens } from "../../../theme/tokens";

const BLOCK_EFFECTS = [
  "They can't message you, call you or follow you.",
  "They can't see your posts, comments or profile.",
  "You stop seeing their posts and comments too.",
  "Any follows between you are removed, and so is your friendship.",
];

const UNBLOCK_EFFECTS = [
  "They can follow you, message you and see your posts again.",
  "The follows and friendship you had before are not restored.",
];

function Effects({ lines }) {
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.75, p: 0, display: "grid", gap: 1 }}>
      {lines.map((line) => (
        <Box component="li" key={line} sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
          <Box
            component="span"
            sx={{ flexShrink: 0, width: 5, height: 5, mt: "7px", borderRadius: "50%", bgcolor: tokens.inkFaint }}
          />
          <Typography variant="body2" sx={{ color: tokens.ink }}>
            {line}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function BlockConfirmDialog({ open, user, blocked = false, loading = false, onClose, onConfirm }) {
  const name = user?.username ? `@${user.username}` : "this account";

  return (
    <ConfirmDialog
      open={open}
      title={blocked ? `Unblock ${name}?` : `Block ${name}?`}
      description={
        blocked
          ? "Unblocking takes effect right away."
          : "Blocking takes effect right away, and they are not told about it."
      }
      confirmLabel={blocked ? "Unblock" : "Block"}
      destructive={!blocked}
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <Effects lines={blocked ? UNBLOCK_EFFECTS : BLOCK_EFFECTS} />
      <Typography variant="caption" component="p" sx={{ mt: 1.75 }}>
        {blocked
          ? "You can block them again at any time."
          : "You can undo this from Settings, under Blocked accounts."}
      </Typography>
    </ConfirmDialog>
  );
}
