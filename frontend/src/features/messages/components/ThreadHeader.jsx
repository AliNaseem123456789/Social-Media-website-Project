import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Box, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { ArrowLeft, Bell, BellOff, LogOut, MoreVertical, Pencil, Phone, UserPlus, Users, Video } from "lucide-react";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { tokens } from "../../../theme/tokens";
import { useLeaveGroup, useSetMuted } from "../hooks";
import ConversationAvatar from "./ConversationAvatar";
import AddMembersDialog from "./AddMembersDialog";
import EditGroupDialog from "./EditGroupDialog";
import MemberRosterDialog from "./MemberRosterDialog";

export default function ThreadHeader({ conversation, myId, statusLine, statusAccent, canCall, onCall }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [roster, setRoster] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leave = useLeaveGroup(conversation?.id);
  const setMuted = useSetMuted(conversation?.id);

  const isGroup = conversation?.type === "group";
  const isAdmin = conversation?.myRole === "admin";
  const muted = Boolean(conversation?.muted);
  const partner = conversation?.partner;

  const runAndClose = (action) => {
    setAnchor(null);
    action();
  };

  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", px: { xs: 1, sm: 2 }, py: 1.5, borderBottom: `1px solid ${tokens.line}` }}>
      <IconButton onClick={() => navigate("/messages")} sx={{ display: { md: "none" } }} aria-label="Back to conversations">
        <ArrowLeft size={18} />
      </IconButton>

      {conversation && (
        <>
          {partner ? (
            <RouterLink to={`/u/${partner.id}`} aria-label={`${partner.username}'s profile`}>
              <ConversationAvatar conversation={conversation} size={40} />
            </RouterLink>
          ) : (
            <ConversationAvatar conversation={conversation} size={40} />
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 700 }}>
                {conversation.title}
              </Typography>
              {muted && (
                <Box role="img" aria-label="Notifications muted" sx={{ display: "flex", color: tokens.inkFaint, flexShrink: 0 }}>
                  <BellOff size={14} />
                </Box>
              )}
            </Stack>
            <Typography variant="caption" noWrap component="p" sx={{ color: statusAccent ?? tokens.inkFaint }}>
              {statusLine}
            </Typography>
          </Box>

          {!isGroup && partner && (
            <>
              <Tooltip title="Voice call">
                <IconButton onClick={() => onCall(false)} disabled={!canCall} aria-label="Start voice call">
                  <Phone size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Video call">
                <IconButton onClick={() => onCall(true)} disabled={!canCall} aria-label="Start video call">
                  <Video size={19} />
                </IconButton>
              </Tooltip>
            </>
          )}

          <Tooltip title={isGroup ? "Group options" : "Conversation options"}>
            <IconButton
              onClick={(event) => setAnchor(event.currentTarget)}
              aria-label={isGroup ? "Group options" : "Conversation options"}
            >
              <MoreVertical size={18} />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem
              onClick={() => runAndClose(() => setMuted.mutate(!muted))}
              disabled={setMuted.isPending}
            >
              <ListItemIcon>{muted ? <Bell size={16} /> : <BellOff size={16} />}</ListItemIcon>
              {muted ? "Unmute notifications" : "Mute notifications"}
            </MenuItem>

            {isGroup && <Divider />}
            {isGroup && (
              <MenuItem onClick={() => runAndClose(() => setRoster(true))}>
                <ListItemIcon>
                  <Users size={16} />
                </ListItemIcon>
                Members
              </MenuItem>
            )}
            {isGroup && isAdmin && (
              <MenuItem onClick={() => runAndClose(() => setEditing(true))}>
                <ListItemIcon>
                  <Pencil size={16} />
                </ListItemIcon>
                Rename group
              </MenuItem>
            )}
            {isGroup && isAdmin && (
              <MenuItem onClick={() => runAndClose(() => setAdding(true))}>
                <ListItemIcon>
                  <UserPlus size={16} />
                </ListItemIcon>
                Add people
              </MenuItem>
            )}
            {isGroup && (
              <MenuItem onClick={() => runAndClose(() => setLeaving(true))} sx={{ color: tokens.danger }}>
                <ListItemIcon sx={{ color: "inherit" }}>
                  <LogOut size={16} />
                </ListItemIcon>
                Leave group
              </MenuItem>
            )}
          </Menu>
        </>
      )}

      {editing && <EditGroupDialog open conversation={conversation} onClose={() => setEditing(false)} />}
      {adding && <AddMembersDialog open conversation={conversation} onClose={() => setAdding(false)} />}
      {roster && <MemberRosterDialog open conversation={conversation} myId={myId} onClose={() => setRoster(false)} />}
      <ConfirmDialog
        open={leaving}
        title="Leave this group?"
        description="You will stop receiving its messages. An admin has to add you back to rejoin."
        confirmLabel="Leave"
        destructive
        loading={leave.isPending}
        onClose={() => setLeaving(false)}
        onConfirm={() => leave.mutate(myId, { onSuccess: () => setLeaving(false) })}
      />
    </Stack>
  );
}
