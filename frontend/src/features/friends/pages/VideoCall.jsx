import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Box, Button, Typography, Paper } from "@mui/material";

// const socket = io("https://social-media-website-project.onrender.com");
const socket = io("https://localhost:5000");
const ROOM_ID = "test-room-123"; // Static room for testing

// Google's public STUN servers (help find public IP addresses)
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoCall() {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef();
  const [isCalling, setIsCalling] = useState(false);
  useEffect(() => {
    // Log to see if we are even hitting this block
    console.log("Component mounted, joining room:", ROOM_ID);

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join-room", ROOM_ID);
    });

    socket.on("offer", async (offer) => {
      console.log("Received offer...");
      await createPeerConnection();
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer),
      );
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", { answer, roomId: ROOM_ID });
    });

    socket.on("answer", async (answer) => {
      console.log("Received answer...");
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );
    });

    socket.on("ice-candidate", async (candidate) => {
      console.log("Received ICE candidate...");
      try {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate),
          );
        }
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("connect");
    };
  }, []);

  const createPeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection(configuration);

    // Get local camera stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideoRef.current.srcObject = stream;
    stream
      .getTracks()
      .forEach((track) => peerConnection.current.addTrack(track, stream));

    // When remote stream arrives, show it in remoteVideoRef
    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // When we find a network path (ICE candidate), send it to the other user
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          roomId: ROOM_ID,
        });
      }
    };
  };

  const startCall = async () => {
    setIsCalling(true);
    await createPeerConnection();
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("offer", { offer, roomId: ROOM_ID });
  };

  return (
    <Box sx={{ p: 4, textAlign: "center", mt: 8 }}>
      <Typography variant="h4">WebRTC Test</Typography>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 4 }}>
        <Paper elevation={3} sx={{ p: 1, bgcolor: "#000" }}>
          <Typography color="white">Local Video</Typography>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "300px", borderRadius: "8px" }}
          />
        </Paper>
        <Paper elevation={3} sx={{ p: 1, bgcolor: "#000" }}>
          <Typography color="white">Remote Video</Typography>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "300px", borderRadius: "8px" }}
          />
        </Paper>
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={startCall}
        disabled={isCalling}
        sx={{ mt: 4 }}
      >
        {isCalling ? "Waiting for connection..." : "Start Call"}
      </Button>
    </Box>
  );
}
