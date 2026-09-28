import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogContent, Stack, Typography } from "@mui/material";
import { Phone, PhoneOff } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";
import { useSocket } from "../../context/SocketContext";
import { SOCKET_EVENTS } from "../../lib/socketEvents";

const RING_MS = 45000;

export default function IncomingCallDialog() {
  const { incomingCall, setIncomingCall, emit } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!incomingCall) return undefined;
    const timer = setTimeout(() => setIncomingCall(null), RING_MS);
    return () => clearTimeout(timer);
  }, [incomingCall, setIncomingCall]);

  if (!incomingCall) return null;
  const { from, roomId, video } = incomingCall;

  const decline = () => {
    emit(SOCKET_EVENTS.CALL_REJECTED, { to: from.id, roomId });
    setIncomingCall(null);
  };

  const accept = () => {
    setIncomingCall(null);
    navigate(`/call/${roomId}?peer=${from.id}&role=callee&video=${video ? 1 : 0}`);
  };

  return (
    <Dialog open onClose={decline} maxWidth="xs" fullWidth>
      <DialogContent>
        <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", py: 2 }}>
          <UserAvatar user={{ id: from.id, username: from.username }} size={84} sx={{ animation: "pulse-dot 1.6s infinite" }} />
          <Typography variant="h5">{from.username}</Typography>
          <Typography color="text.secondary">Incoming {video ? "video" : "voice"} call</Typography>
          <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
            <Button variant="outlined" color="error" startIcon={<PhoneOff size={18} />} onClick={decline}>
              Decline
            </Button>
            <Button variant="contained" color="success" startIcon={<Phone size={18} />} onClick={accept} sx={{ color: "#fff", boxShadow: "none" }}>
              Accept
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
