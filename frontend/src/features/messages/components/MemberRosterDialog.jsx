import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { LogOut, MoreHorizontal, ShieldCheck, ShieldMinus, UserMinus, X } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { getErrorMessage } from "../../../lib/apiClient";
import { tokens } from "../../../theme/tokens";
import { useLeaveGroup, useRemoveMember, useSetMemberRole } from "../hooks";

const byRoleThenName = (a, b) => {
  if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
  return (a.username ?? "").localeCompare(b.username ?? "");
};

export default function MemberRosterDialog({ open, conversation, myId, onClose }) {
  const [menu, setMenu] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const setRole = useSetMemberRole(conversation?.id);
  const removeMember = useRemoveMember(conversation?.id);
  const leave = useLeaveGroup(conversation?.id);

  const members = useMemo(() => [...(conversation?.members ?? [])].sort(byRoleThenName), [conversation?.members]);
  const adminCount = members.filter((member) => member.role === "admin").length;
  const isAdmin = conversation?.myRole === "admin";
  const busy = setRole.isPending || removeMember.isPending || leave.isPending;
  const failure = setRole.error || removeMember.error;

  const close = () => {
    if (busy) return;
    onClose();
  };

  const openMenu = (event, member) => setMenu({ anchor: event.currentTarget, member });
  const closeMenu = () => setMenu(null);

  const act = (next) => {
    closeMenu();
    setRole.reset();
    removeMember.reset();
    setConfirm(next);
  };

  const changeRole = (member, role) => {
    closeMenu();
    removeMember.reset();
    setRole.mutate({ userId: member.id, role });
  };

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === "leave") return leave.mutate(myId);
    removeMember.mutate(confirm.member.id, { onSettled: () => setConfirm(null) });
  };

  const menuMember = menu?.member;
  const menuIsSelf = menuMember?.id === myId;
  const lastAdmin = menuIsSelf && menuMember?.role === "admin" && adminCount <= 1;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle component="div">
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1">Members</Typography>
            <Typography variant="caption" component="p">
              {members.length} {members.length === 1 ? "person" : "people"} in this group
            </Typography>
          </Box>
          <IconButton onClick={close} disabled={busy} aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {failure && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {getErrorMessage(failure, "Couldn't apply that change")}
          </Alert>
        )}
        <Stack divider={<Divider flexItem />}>
          {members.map((member) => {
            const isSelf = member.id === myId;
            const canAct = isSelf || isAdmin;
            return (
              <Stack key={member.id} direction="row" spacing={1.5} sx={{ py: 1.25, alignItems: "center", minWidth: 0 }}>
                <RouterLink to={`/u/${member.id}`} aria-label={`${member.username}'s profile`}>
                  <UserAvatar user={member} size={40} online={member.online} />
                </RouterLink>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
                    <Link
                      component={RouterLink}
                      to={`/u/${member.id}`}
                      underline="hover"
                      noWrap
                      sx={{ color: tokens.ink, fontWeight: 650, fontSize: "0.92rem" }}
                    >
                      {member.username}
                    </Link>
                    {isSelf && (
                      <Typography variant="caption" sx={{ flexShrink: 0 }}>
                        (you)
                      </Typography>
                    )}
                  </Stack>
                  {member.role === "admin" && (
                    <Chip
                      size="small"
                      label="Admin"
                      sx={{ mt: 0.25, height: 20, bgcolor: tokens.emberTint, color: tokens.emberInk, fontWeight: 600 }}
                    />
                  )}
                </Box>
                {canAct && (
                  <Tooltip title={isSelf ? "Your options" : `Options for ${member.username}`}>
                    <IconButton
                      size="small"
                      onClick={(event) => openMenu(event, member)}
                      disabled={busy}
                      aria-label={isSelf ? "Your options" : `Options for ${member.username}`}
                      sx={{ flexShrink: 0 }}
                    >
                      <MoreHorizontal size={17} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            );
          })}
        </Stack>

        <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={closeMenu}>
          {isAdmin && menuMember?.role !== "admin" && (
            <MenuItem onClick={() => changeRole(menuMember, "admin")}>
              <ListItemIcon>
                <ShieldCheck size={16} />
              </ListItemIcon>
              Make admin
            </MenuItem>
          )}
          {isAdmin && menuMember?.role === "admin" && (
            <MenuItem
              onClick={() => changeRole(menuMember, "member")}
              disabled={lastAdmin}
              sx={{ "&.Mui-disabled": { opacity: 0.55 } }}
            >
              <ListItemIcon>
                <ShieldMinus size={16} />
              </ListItemIcon>
              {menuIsSelf ? "Step down as admin" : "Remove admin"}
            </MenuItem>
          )}
          {lastAdmin && (
            <Typography variant="caption" component="p" sx={{ px: 2, pb: 1, maxWidth: 240 }}>
              Promote someone else before stepping down.
            </Typography>
          )}
          {menuIsSelf ? (
            <MenuItem onClick={() => act({ kind: "leave" })} sx={{ color: tokens.danger }}>
              <ListItemIcon sx={{ color: "inherit" }}>
                <LogOut size={16} />
              </ListItemIcon>
              Leave group
            </MenuItem>
          ) : (
            isAdmin && (
              <MenuItem onClick={() => act({ kind: "remove", member: menuMember })} sx={{ color: tokens.danger }}>
                <ListItemIcon sx={{ color: "inherit" }}>
                  <UserMinus size={16} />
                </ListItemIcon>
                Remove from group
              </MenuItem>
            )
          )}
        </Menu>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={close} disabled={busy}>
          Close
        </Button>
      </DialogActions>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === "leave" ? "Leave this group?" : `Remove ${confirm?.member?.username ?? "this person"}?`}
        description={
          confirm?.kind === "leave"
            ? "You will stop receiving its messages. An admin has to add you back to rejoin."
            : "They stop receiving new messages here. An admin can add them back later."
        }
        confirmLabel={confirm?.kind === "leave" ? "Leave" : "Remove"}
        destructive
        loading={leave.isPending || removeMember.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
    </Dialog>
  );
}
