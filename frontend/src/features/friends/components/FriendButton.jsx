import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, ListItemIcon, Menu, MenuItem, Skeleton, Stack } from "@mui/material";
import { Check, ChevronDown, MessageCircle, UserMinus, UserPlus, UserRoundCheck, X } from "lucide-react";
import { queryKeys } from "../../../lib/queryClient";
import { friendsService } from "../services/friendsService";
import { useCancelRequest, useRespondToRequest, useSendFriendRequest, useUnfriend } from "../hooks";

export default function FriendButton({ userId, size = "medium", initialStatus, showMessage = false }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const statusQuery = useQuery({
    queryKey: queryKeys.friendStatus(userId),
    queryFn: () => friendsService.status(userId),
    initialData: initialStatus,
    enabled: Boolean(userId),
  });
  const send = useSendFriendRequest();
  const respond = useRespondToRequest();
  const cancel = useCancelRequest();
  const unfriend = useUnfriend();

  if (statusQuery.isLoading) return <Skeleton variant="rounded" width={110} height={size === "small" ? 32 : 40} sx={{ borderRadius: 999 }} />;

  const { status, requestId } = statusQuery.data ?? { status: "none" };
  const busy = send.isPending || respond.isPending || cancel.isPending || unfriend.isPending;
  if (status === "self") return null;

  const message = showMessage && (
    <Button size={size} variant="outlined" startIcon={<MessageCircle size={16} />} onClick={() => navigate(`/messages/with/${userId}`)}>
      Message
    </Button>
  );

  if (status === "incoming") {
    return (
      <Stack direction="row" spacing={1}>
        <Button size={size} variant="contained" startIcon={<Check size={16} />} disabled={busy} onClick={() => respond.mutate({ userId, requestId, action: "accept" })}>
          Accept
        </Button>
        <Button size={size} variant="outlined" startIcon={<X size={16} />} disabled={busy} onClick={() => respond.mutate({ userId, requestId, action: "reject" })}>
          Decline
        </Button>
      </Stack>
    );
  }

  if (status === "outgoing") {
    return (
      <Stack direction="row" spacing={1}>
        <Button size={size} variant="outlined" disabled={busy} onClick={() => cancel.mutate({ userId, requestId })}>
          Requested
        </Button>
        {message}
      </Stack>
    );
  }

  if (status === "friends") {
    return (
      <Stack direction="row" spacing={1}>
        <Button size={size} variant="outlined" startIcon={<UserRoundCheck size={16} />} endIcon={<ChevronDown size={14} />} disabled={busy} onClick={(e) => setAnchor(e.currentTarget)}>
          Friends
        </Button>
        {message}
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem onClick={() => { setAnchor(null); navigate(`/messages/with/${userId}`); }}>
            <ListItemIcon><MessageCircle size={16} /></ListItemIcon>
            Send message
          </MenuItem>
          <MenuItem onClick={() => { setAnchor(null); unfriend.mutate({ userId }); }} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit" }}><UserMinus size={16} /></ListItemIcon>
            Unfriend
          </MenuItem>
        </Menu>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1}>
      <Button size={size} variant="contained" color="secondary" startIcon={<UserPlus size={16} />} disabled={busy} onClick={() => send.mutate({ userId })}>
        Add friend
      </Button>
      {message}
    </Stack>
  );
}
