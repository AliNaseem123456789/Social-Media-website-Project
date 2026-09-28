import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { SOCKET_EVENTS } from "../../../lib/socketEvents";
import { useSocket } from "../../../context/SocketContext";
import { profileService } from "../../profile/services/profileService";
import { callService } from "../services/callService";

const RING_TIMEOUT_MS = 45000;
const RETURN_DELAY_MS = 1500;
const RETURN_DELAY_WITH_HINT_MS = 6000;
const FALLBACK_ICE = [{ urls: "stun:stun.l.google.com:19302" }];
const STRICT_NETWORK_HINT =
  "No relay server is configured, so calls can fail on strict or mobile networks. Try again on another connection.";

function ControlButton({ title, active = true, danger, onClick, children }) {
  return (
    <Tooltip title={title}>
      <IconButton
        onClick={onClick}
        aria-label={title}
        sx={{
          width: 56,
          height: 56,
          color: "#fff",
          bgcolor: danger ? "#e0431f" : active ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.9)",
          ...(active || danger ? {} : { color: "#16140f" }),
          "&:hover": { bgcolor: danger ? "#c93a19" : active ? "rgba(255,255,255,.24)" : "#fff", color: danger || active ? "#fff" : "#16140f" },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

export default function CallPage() {
  const { roomId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const peerId = Number(params.get("peer"));
  const role = params.get("role") === "callee" ? "callee" : "caller";
  const wantsVideo = params.get("video") !== "0";
  const { emit, on, connected } = useSocket();
  const peer = useQuery({ queryKey: queryKeys.profile(peerId), queryFn: () => profileService.get(peerId), enabled: Boolean(peerId) });
  const ice = useQuery({ queryKey: queryKeys.iceServers, queryFn: callService.iceServers, staleTime: 60_000, gcTime: 60_000 });
  useDocumentTitle("Call");

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const localStream = useRef(null);
  const pendingCandidates = useRef([]);
  const [status, setStatus] = useState(role === "caller" ? "Calling..." : "Connecting...");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(wantsVideo);
  const [sharing, setSharing] = useState(false);
  const [remoteActive, setRemoteActive] = useState(false);
  const [hint, setHint] = useState("");
  const ended = useRef(false);
  const joined = useRef(false);

  /**
   * TURN credentials are minted per request, so the query's data changes identity every refetch. The
   * peer connection reads them through a ref instead of a dependency, which keeps a live call from
   * being torn down and rebuilt just because fresh credentials arrived.
   */
  const iceRef = useRef(null);
  const iceReady = !ice.isPending;
  useEffect(() => {
    if (ice.data) iceRef.current = ice.data;
  }, [ice.data]);

  const cleanup = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  const finish = useCallback(
    (message, notifyPeer = true, delay = RETURN_DELAY_MS) => {
      if (ended.current) return;
      ended.current = true;
      if (notifyPeer) emit(SOCKET_EVENTS.CALL_END, { to: peerId, roomId });
      cleanup();
      setStatus(message);
      setTimeout(() => navigate(peerId ? `/messages/with/${peerId}` : "/messages", { replace: true }), delay);
    },
    [cleanup, emit, navigate, peerId, roomId],
  );

  useEffect(() => {
    if (!connected || !roomId || !iceReady) return undefined;
    let cancelled = false;
    ended.current = false;
    joined.current = false;

    const iceServers = iceRef.current?.iceServers?.length ? iceRef.current.iceServers : FALLBACK_ICE;
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    pc.onicecandidate = (e) => e.candidate && emit(SOCKET_EVENTS.CALL_ICE, { roomId, data: e.candidate });
    pc.ontrack = (e) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0];
      setRemoteActive(true);
      setStatus("");
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        const strictNetwork = iceRef.current?.turnConfigured === false;
        if (strictNetwork) setHint(STRICT_NETWORK_HINT);
        finish("Connection lost", true, strictNetwork ? RETURN_DELAY_WITH_HINT_MS : RETURN_DELAY_MS);
      }
      if (pc.connectionState === "disconnected") setStatus("Reconnecting...");
      if (pc.connectionState === "connected") setStatus("");
    };

    const flushCandidates = async () => {
      for (const candidate of pendingCandidates.current.splice(0)) await pc.addIceCandidate(candidate).catch(() => {});
    };

    const offCallJoin = on(SOCKET_EVENTS.CALL_JOIN, async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emit(SOCKET_EVENTS.CALL_OFFER, { roomId, data: offer });
    });
    const offOffer = on(SOCKET_EVENTS.CALL_OFFER, async ({ data }) => {
      await pc.setRemoteDescription(data);
      await flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emit(SOCKET_EVENTS.CALL_ANSWER, { roomId, data: answer });
    });
    const offAnswer = on(SOCKET_EVENTS.CALL_ANSWER, async ({ data }) => {
      await pc.setRemoteDescription(data);
      await flushCandidates();
    });
    const offIce = on(SOCKET_EVENTS.CALL_ICE, async ({ data }) => {
      if (pc.remoteDescription) await pc.addIceCandidate(data).catch(() => {});
      else pendingCandidates.current.push(data);
    });
    const offRejected = on(SOCKET_EVENTS.CALL_REJECTED, ({ roomId: id }) => id === roomId && finish("Call declined", false));
    const offEnded = on(SOCKET_EVENTS.CALL_END, ({ roomId: id }) => id === roomId && finish("Call ended", false));

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: wantsVideo })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        localStream.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        joined.current = true;
        emit(SOCKET_EVENTS.CALL_JOIN, { roomId });
      })
      .catch(() => finish("Camera or microphone permission was denied"));

    const ringTimer = role === "caller" ? setTimeout(() => !pc.remoteDescription && finish("No answer"), RING_TIMEOUT_MS) : null;

    return () => {
      cancelled = true;
      clearTimeout(ringTimer);
      [offCallJoin, offOffer, offAnswer, offIce, offRejected, offEnded].forEach((off) => off());
      if (joined.current && !ended.current) {
        emit(SOCKET_EVENTS.CALL_END, { to: peerId, roomId });
        ended.current = true;
      }
      cleanup();
    };
  }, [connected, roomId, role, wantsVideo, emit, on, finish, cleanup, peerId, iceReady]);

  const toggleMic = () => {
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  };

  const toggleCam = () => {
    localStream.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn((v) => !v);
  };

  const stopSharing = async (sender) => {
    await sender.replaceTrack(localStream.current?.getVideoTracks()[0] ?? null);
    if (localVideo.current) localVideo.current.srcObject = localStream.current;
    setSharing(false);
  };

  const toggleShare = async () => {
    const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;
    if (sharing) return stopSharing(sender);
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = screen.getVideoTracks()[0];
      await sender.replaceTrack(track);
      if (localVideo.current) localVideo.current.srcObject = screen;
      track.onended = () => stopSharing(sender);
      setSharing(true);
    } catch {
      return undefined;
    }
  };

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 1400, bgcolor: "#0f0d0b", color: "#faf8f4", display: "flex", flexDirection: "column" }}>
      <Box sx={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <Box component="video" ref={remoteVideo} autoPlay playsInline sx={{ width: "100%", height: "100%", objectFit: "cover", display: remoteActive && wantsVideo ? "block" : "none" }} />
        {(!remoteActive || !wantsVideo) && (
          <Stack sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 2 }}>
            <UserAvatar user={peer.data} size={120} />
            <Typography variant="h4" sx={{ color: "#faf8f4" }}>
              {peer.data?.username ?? " "}
            </Typography>
            <Typography sx={{ color: "rgba(250,248,244,.66)" }}>{status || "Connected"}</Typography>
            {hint && (
              <Typography variant="body2" sx={{ maxWidth: 380, textAlign: "center", color: "rgba(250,248,244,.5)" }}>
                {hint}
              </Typography>
            )}
          </Stack>
        )}
        {wantsVideo && (
          <Box
            component="video"
            ref={localVideo}
            autoPlay
            playsInline
            muted
            sx={{ position: "absolute", right: 20, bottom: 20, width: { xs: 120, sm: 220 }, aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 3, border: "2px solid rgba(255,255,255,.2)", bgcolor: "#211c17", transform: sharing ? "none" : "scaleX(-1)" }}
          />
        )}
        {remoteActive && (status || hint) && (
          <Stack spacing={0.5} sx={{ position: "absolute", top: 20, left: 16, right: 16, alignItems: "center" }}>
            {status && <Typography sx={{ textAlign: "center", color: "rgba(250,248,244,.8)" }}>{status}</Typography>}
            {hint && (
              <Typography variant="body2" sx={{ maxWidth: 380, textAlign: "center", color: "rgba(250,248,244,.5)" }}>
                {hint}
              </Typography>
            )}
          </Stack>
        )}
      </Box>
      <Stack direction="row" spacing={2} sx={{ justifyContent: "center", py: 3, bgcolor: "#171310" }}>
        <ControlButton title={micOn ? "Mute" : "Unmute"} active={micOn} onClick={toggleMic}>
          {micOn ? <Mic size={22} /> : <MicOff size={22} />}
        </ControlButton>
        {wantsVideo && (
          <ControlButton title={camOn ? "Turn camera off" : "Turn camera on"} active={camOn} onClick={toggleCam}>
            {camOn ? <Video size={22} /> : <VideoOff size={22} />}
          </ControlButton>
        )}
        {wantsVideo && navigator.mediaDevices?.getDisplayMedia && (
          <ControlButton title={sharing ? "Stop sharing" : "Share screen"} active={!sharing} onClick={toggleShare}>
            <MonitorUp size={22} />
          </ControlButton>
        )}
        <ControlButton title="End call" danger onClick={() => finish("Call ended")}>
          <PhoneOff size={22} />
        </ControlButton>
      </Stack>
    </Box>
  );
}
