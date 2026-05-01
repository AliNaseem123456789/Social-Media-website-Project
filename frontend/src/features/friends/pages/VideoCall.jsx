import React, { useEffect, useRef, useState } from "react";
import { Box, IconButton, Typography, Paper, Stack } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import CallEndIcon from "@mui/icons-material/CallEnd";
import { socket } from "../services/chatService";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function VideoCall({
  roomId,
  currentUserId,
  recipientName,
  onEndCall,
}) {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const [useScreenShare, setUseScreenShare] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const localStreamRef = useRef();
  const [isInitiator, setIsInitiator] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const createPeerConnection = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    const pc = new RTCPeerConnection(configuration);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        socket.emit("ice-candidate", { candidate: event.candidate, roomId });
      }
    };
    pc.ontrack = (event) => {
      console.log("Received remote track");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    peerConnection.current = pc;
    return pc;
  };
  const startLocalStream = async () => {
    try {
      let stream;

      if (useScreenShare) {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        stream.getVideoTracks()[0].onended = () => {
          setUseScreenShare(false);
          setTimeout(() => startLocalStream(), 100);
        };
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraEnabled,
          audio: micEnabled,
        });
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      localStreamRef.current = stream;
      if (peerConnection.current) {
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });
        if (
          isInitiator &&
          !callStarted &&
          peerConnection.current.signalingState === "stable"
        ) {
          createAndSendOffer();
        }
      }
    } catch (err) {
      console.error("Error accessing media:", err);
    }
  };
  const createAndSendOffer = async () => {
    if (!peerConnection.current || !localStreamRef.current) return;
    console.log("Creating offer as initiator");
    setCallStarted(true);
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("offer", { offer, roomId });
  };

  const toggleScreenShare = async () => {
    setUseScreenShare(!useScreenShare);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setTimeout(() => startLocalStream(), 100);
  };
  const toggleCamera = () => {
    setCameraEnabled(!cameraEnabled);
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) videoTrack.enabled = !cameraEnabled;
  };
  const toggleMic = () => {
    setMicEnabled(!micEnabled);
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = !micEnabled;
  };
  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    onEndCall();
  };
  useEffect(() => {
    console.log("VideoCall mounted for room:", roomId);
    const parts = roomId.split("_");
    const userA = parts[1];
    const isFirstUser = String(currentUserId) === String(userA);
    setIsInitiator(isFirstUser);
    socket.emit("join-room", roomId);
    createPeerConnection();
    startLocalStream();
    const handleOffer = async (offer) => {
      console.log("Received offer");
      if (!peerConnection.current) {
        createPeerConnection();
      }
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer),
      );
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", { answer, roomId });
      setCallStarted(true);
    };
    const handleAnswer = async (answer) => {
      console.log("Received answer");
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
      }
    };
    const handleIceCandidate = async (candidate) => {
      console.log("📡 Received ICE candidate", candidate);
      try {
        if (peerConnection.current && candidate) {
          const iceCandidate = new RTCIceCandidate(candidate);
          await peerConnection.current.addIceCandidate(iceCandidate);
        }
      } catch (e) {
        console.error("Error adding ICE candidate", e);
      }
    };
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    if (isFirstUser) {
      const timer = setTimeout(() => {
        if (localStreamRef.current && !callStarted) {
          createAndSendOffer();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUserId]);
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#1a1a1a",
      }}
    >
      <Box sx={{ flex: 1, position: "relative", bgcolor: "#000" }}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
        {!remoteVideoRef.current?.srcObject && (
          <Box
            sx={{
              position: "absolute",
              top: 20,
              left: 0,
              right: 0,
              textAlign: "center",
              color: "white",
              bgcolor: "rgba(0,0,0,0.5)",
              p: 1,
            }}
          >
            <Typography variant="body2">
              {!callStarted && isInitiator && "Starting call..."}
              {!callStarted && !isInitiator && "Waiting for incoming call..."}
              {callStarted &&
                !remoteVideoRef.current?.srcObject &&
                "Connecting..."}
            </Typography>
          </Box>
        )}

        <Paper
          elevation={3}
          sx={{
            position: "absolute",
            bottom: 80,
            right: 16,
            width: 200,
            height: 150,
            overflow: "hidden",
            borderRadius: 2,
            border: "2px solid white",
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Paper>
      </Box>

      <Paper sx={{ p: 2, bgcolor: "#2a2a2a", borderRadius: 0 }}>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          alignItems="center"
        >
          <IconButton
            onClick={toggleScreenShare}
            sx={{
              bgcolor: useScreenShare ? "#4caf50" : "#3a3a3a",
              color: "#fff",
            }}
          >
            <ScreenShareIcon />
          </IconButton>

          <IconButton
            onClick={toggleCamera}
            sx={{
              bgcolor: "#3a3a3a",
              color: cameraEnabled ? "#fff" : "#f44336",
            }}
          >
            {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
          <IconButton
            onClick={toggleMic}
            sx={{ bgcolor: "#3a3a3a", color: micEnabled ? "#fff" : "#f44336" }}
          >
            {micEnabled ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
          <IconButton
            onClick={endCall}
            sx={{
              bgcolor: "#f44336",
              color: "#fff",
              "&:hover": { bgcolor: "#d32f2f" },
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Stack>
      </Paper>
    </Box>
  );
}
