import { useState } from "react";
import { Box, ListItemIcon, MenuItem } from "@mui/material";
import { Ban, Flag, UserCheck } from "lucide-react";
import { tokens } from "../../../theme/tokens";
import { useAuth } from "../../auth/context/AuthContext";
import { useToggleBlock } from "../hooks";
import { subjectNoun } from "../reasons";
import BlockConfirmDialog from "./BlockConfirmDialog";
import ReportDialog from "./ReportDialog";

const nameSx = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 };

/**
 * The Report and Block actions for one account, ready to drop into a menu that already exists.
 *
 * `items` goes inside the host's `Menu` and `dialogs` goes next to it, because a Menu unmounts its
 * children as it closes, which would take a dialog opened from one of these items with it.
 *
 * `subject` names what is being reported; without one the account itself is the subject.
 */
export function useModerationMenuItems({ user, subject, onClose, canBlock = true }) {
  const { user: me } = useAuth();
  const [dialog, setDialog] = useState(null);
  const toggleBlock = useToggleBlock();

  const targetId = user?.id ?? null;
  const blocked = Boolean(user?.blockedByMe);
  const target = subject ?? {
    type: "user",
    id: targetId,
    label: user?.username ? `@${user.username}` : undefined,
  };

  const openDialog = (next) => {
    setDialog(next);
    onClose?.();
  };
  const closeDialog = () => setDialog(null);

  if (!targetId || targetId === me?.id) {
    return { available: false, items: null, dialogs: null, openBlock: () => {}, blockPending: false };
  }

  const items = [
    <MenuItem key="report" onClick={() => openDialog("report")}>
      <ListItemIcon>
        <Flag size={17} />
      </ListItemIcon>
      Report {subjectNoun(target.type)}
    </MenuItem>,
  ];

  if (canBlock) {
    items.push(
      <MenuItem
        key="block"
        onClick={() => openDialog("block")}
        sx={blocked ? undefined : { color: tokens.danger }}
      >
        <ListItemIcon sx={{ color: "inherit" }}>
          {blocked ? <UserCheck size={17} /> : <Ban size={17} />}
        </ListItemIcon>
        <Box component="span" sx={nameSx}>
          {blocked ? "Unblock" : "Block"}
          {user.username ? ` @${user.username}` : ""}
        </Box>
      </MenuItem>,
    );
  }

  const dialogs = (
    <>
      {dialog === "report" && (
        <ReportDialog
          open
          subjectType={target.type}
          subjectId={target.id}
          subjectLabel={target.label}
          onClose={closeDialog}
        />
      )}
      {dialog === "block" && (
        <BlockConfirmDialog
          open
          user={user}
          blocked={blocked}
          loading={toggleBlock.isPending}
          onClose={closeDialog}
          onConfirm={() =>
            toggleBlock.mutate(
              { userId: targetId, blocked, username: user.username },
              { onSuccess: closeDialog },
            )
          }
        />
      )}
    </>
  );

  return {
    available: true,
    items,
    dialogs,
    openBlock: () => setDialog("block"),
    blockPending: toggleBlock.isPending,
  };
}

export default useModerationMenuItems;
