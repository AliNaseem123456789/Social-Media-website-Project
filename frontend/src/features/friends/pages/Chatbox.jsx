// ChatPage.jsx - COMPLETE WORKING VERSION

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Stack,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Badge,
  CircularProgress,
  Fade,
  Slide,
  Zoom,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import VideocamIcon from "@mui/icons-material/Videocam";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { chatService, socket } from "../services/chatService";
import ChatSidebar from "../components/ChatSidebar";
import VideoCall from "./VideoCall";
import { useAuth } from "../../auth/context/AuthContext";

function ChatPage() {
  const navigate = useNavigate();
  const { otherUserId } = useParams();
  
  const { user: currentUser, loading: authLoading } = useAuth();
  const currentUserId = currentUser?.id;
  const currentUsername = currentUser?.username;

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false);
  
  const NAVBAR_HEIGHT = "64px";
  const roomId = currentUserId && otherUserId 
    ? `room_${Math.min(currentUserId, otherUserId)}_${Math.max(currentUserId, otherUserId)}`
    : "";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { to: otherUserId, isTyping: true });
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typing", { to: otherUserId, isTyping: false });
    }, 1000);
  };
  
  useEffect(() => {
    if (!currentUserId || !otherUserId) return;
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    chatService.registerUser();
    
    const initializeChat = async () => {
      setLoading(true);
      try {
        const [userInfo, history] = await Promise.all([
          chatService.getRecipientInfo(otherUserId),
          chatService.getChatHistory(otherUserId),
        ]);

        setRecipient(userInfo);
        setChat(
          history.map((msg) => ({
            from: String(msg.from_user) === String(currentUserId) ? "Me" : userInfo.username,
            text: msg.message,
            timestamp: msg.created_at,
          })),
        );
      } catch (err) {
        console.error("Error initializing chat:", err);
      } finally {
        setLoading(false);
      }
    };
    
    initializeChat();
    
    socket.on("private_message", (data) => {
      if (String(data.from) === String(currentUserId)) return;
      if (String(data.from) === String(otherUserId)) {
        setChat((prev) => [
          ...prev,
          {
            from: data.username,
            text: data.message,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    });

    socket.on("typing", ({ from, isTyping: typing }) => {
      if (String(from) === String(otherUserId)) {
        setRecipientTyping(typing);
      }
    });

    socket.on("video_call_request", ({ from, roomId: callRoomId }) => {
      if (String(from) === String(otherUserId)) {
        const acceptCall = window.confirm(
          `${recipient?.username || "Someone"} is calling you. Accept video call?`
        );
        if (acceptCall) {
          setIsVideoCallOpen(true);
          setIsCallActive(true);
        } else {
          socket.emit("video_call_rejected", { to: from, roomId: callRoomId });
        }
      }
    });

    socket.on("video_call_rejected", () => {
      alert("Call was rejected");
    });

    return () => {
      socket.off("private_message");
      socket.off("typing");
      socket.off("video_call_request");
      socket.off("video_call_rejected");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      hasInitialized.current = false;
    };
  }, [currentUserId, otherUserId]);

  const sendMessage = () => {
    if (!message.trim()) return;
    
    socket.emit("private_message", {
      to: parseInt(otherUserId),
      message,
    });
    
    setChat((prev) => [...prev, { from: "Me", text: message, timestamp: new Date().toISOString() }]);
    setMessage("");
    setIsTyping(false);
    socket.emit("typing", { to: otherUserId, isTyping: false });
  };

  const startVideoCall = () => {
    setIsVideoCallOpen(true);
    setIsCallActive(true);
    socket.emit("video_call_request", {
      to: otherUserId,
      roomId,
    });
  };

  const endVideoCall = () => {
    setIsVideoCallOpen(false);
    setIsCallActive(false);
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress sx={{ color: "#1877f2" }} />
      </Box>
    );
  }

  if (!currentUserId) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Typography>Please login to continue</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          bgcolor: "#f0f2f5",
          height: `calc(100vh - ${NAVBAR_HEIGHT})`,
          width: "100vw",
          display: "flex",
          overflow: "hidden",
          position: "fixed",
          bottom: 0,
          left: 0,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: 0,
            display: "flex",
            overflow: "hidden",
          }}
        >
          <Grid container sx={{ height: "100%", flexWrap: "nowrap" }}>
            <Grid
              item
              sx={{
                width: { xs: "0", sm: "320px" },
                flexShrink: 0,
                borderRight: "1px solid #e0e0e0",
                display: { xs: "none", sm: "block" },
                height: "100%",
                bgcolor: "#fff",
                overflow: "auto",
              }}
            >
              <ChatSidebar />
            </Grid>

            <Grid
              item
              xs
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                bgcolor: "#efeae2",
                flexGrow: 1,
                minWidth: 0,
              }}
            >
              {/* Chat Header */}
              <Box
                sx={{
                  p: "12px 24px",
                  bgcolor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  mt: { xs: NAVBAR_HEIGHT, sm: 0 },
                  zIndex: 1,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <IconButton 
                    onClick={() => navigate(-1)} 
                    sx={{ display: { xs: "flex", sm: "none" } }}
                  >
                    <ArrowBackRoundedIcon />
                  </IconButton>
                  
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    variant="dot"
                    sx={{
                      "& .MuiBadge-badge": {
                        bgcolor: "#44b700",
                        boxShadow: "0 0 0 2px #fff",
                      },
                    }}
                  >
                    <Avatar
                      src={recipient?.profile_image}
                      sx={{ width: 48, height: 48, bgcolor: "#1877f2" }}
                    >
                      {recipient?.username?.charAt(0).toUpperCase()}
                    </Avatar>
                  </Badge>
                  
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {recipient?.username || "Loading..."}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#00a884", fontWeight: 600 }}>
                      {recipientTyping ? "Typing..." : "Online"}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                  {!isCallActive ? (
                    <IconButton
                      onClick={startVideoCall}
                      sx={{
                        bgcolor: "#00a884",
                        color: "#fff",
                        "&:hover": { bgcolor: "#008f6f" },
                        borderRadius: "12px",
                      }}
                    >
                      <VideocamIcon />
                    </IconButton>
                  ) : (
                    <Chip
                      icon={<VideocamIcon />}
                      label="In Call"
                      color="success"
                      onDelete={endVideoCall}
                      deleteIcon={<CallEndIcon />}
                      sx={{ "& .MuiChip-deleteIcon": { color: "#fff" } }}
                    />
                  )}
                  <IconButton size="small">
                    <MoreVertRoundedIcon />
                  </IconButton>
                </Stack>
              </Box>

              {/* Messages Area */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  px: { xs: 2, md: 8, lg: 10 },
                  py: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  backgroundImage: 'url("https://i.imgur.com/7RVjs8x.png")',
                  backgroundRepeat: "repeat",
                  backgroundSize: "auto",
                }}
              >
                <Box sx={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
                  {chat.map((msg, idx) => {
                    const isMe = msg.from === "Me";
                    const showAvatar = idx === 0 || chat[idx - 1]?.from !== msg.from;
                    
                    return (
                      <Fade in timeout={300} key={idx}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: isMe ? "flex-end" : "flex-start",
                            mb: 1,
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="flex-end">
                            {!isMe && showAvatar && (
                              <Avatar
                                sx={{ width: 32, height: 32, bgcolor: "#1877f2" }}
                              >
                                {recipient?.username?.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            {!isMe && !showAvatar && <Box sx={{ width: 32 }} />}
                            
                            <Paper
                              elevation={0}
                              sx={{
                                p: "10px 16px",
                                borderRadius: isMe
                                  ? "18px 4px 18px 18px"
                                  : "4px 18px 18px 18px",
                                maxWidth: "70%",
                                bgcolor: isMe ? "#d9fdd3" : "#fff",
                                color: "#111b21",
                                boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
                                wordBreak: "break-word",
                                transition: "all 0.2s",
                                "&:hover": {
                                  transform: "scale(1.01)",
                                },
                              }}
                            >
                              <Typography variant="body1" sx={{ fontSize: "0.95rem" }}>
                                {msg.text}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#667781", fontSize: "0.7rem", mt: 0.5, display: "block" }}>
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                              </Typography>
                            </Paper>
                          </Stack>
                        </Box>
                      </Fade>
                    );
                  })}
                  
                  {recipientTyping && (
                    <Slide direction="up" in mountOnEnter unmountOnExit>
                      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: "10px 16px",
                            borderRadius: "18px",
                            bgcolor: "#fff",
                            maxWidth: "70%",
                          }}
                        >
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 6, height: 6, bgcolor: "#667781", borderRadius: "50%", animation: "pulse 1.5s infinite" }} />
                            <Box sx={{ width: 6, height: 6, bgcolor: "#667781", borderRadius: "50%", animation: "pulse 1.5s infinite 0.3s" }} />
                            <Box sx={{ width: 6, height: 6, bgcolor: "#667781", borderRadius: "50%", animation: "pulse 1.5s infinite 0.6s" }} />
                          </Stack>
                        </Paper>
                      </Box>
                    </Slide>
                  )}
                  
                  <div ref={messagesEndRef} />
                </Box>
              </Box>

              {/* Input Area */}
              <Box sx={{ p: "12px 24px", bgcolor: "#f0f2f5" }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ maxWidth: "800px", margin: "0 auto" }}
                >
                  <Box
                    sx={{
                      flexGrow: 1,
                      bgcolor: "#fff",
                      borderRadius: "24px",
                      px: 2.5,
                      transition: "all 0.2s",
                      "&:focus-within": {
                        boxShadow: "0 0 0 2px #00a884",
                      },
                    }}
                  >
                    <TextField
                      fullWidth
                      variant="standard"
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      InputProps={{
                        disableUnderline: true,
                        sx: { py: 1.5, fontSize: "0.95rem" },
                      }}
                      multiline
                      maxRows={4}
                    />
                  </Box>
                  <Zoom in={!!message.trim()}>
                    <IconButton
                      onClick={sendMessage}
                      disabled={!message.trim()}
                      sx={{
                        bgcolor: "#00a884",
                        color: "#fff",
                        "&:hover": { bgcolor: "#008f6f" },
                        "&.Mui-disabled": { bgcolor: "#e0e0e0", color: "#9e9e9e" },
                        transition: "all 0.2s",
                      }}
                    >
                      <SendRoundedIcon />
                    </IconButton>
                  </Zoom>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Video Call Dialog */}
      <Dialog
        open={isVideoCallOpen}
        onClose={endVideoCall}
        maxWidth="xl"
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            bgcolor: "#1a1a1a",
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: "#2a2a2a", color: "#fff", py: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Video Call with {recipient?.username}
            </Typography>
            <IconButton onClick={endVideoCall} sx={{ color: "#fff" }}>
              <CallEndIcon
                sx={{ bgcolor: "#f44336", borderRadius: "50%", p: 1.5, fontSize: 30 }}
              />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: "#1a1a1a" }}>
          <VideoCall
            roomId={roomId}
            currentUserId={currentUserId}
            recipientName={recipient?.username}
            onEndCall={endVideoCall}
          />
        </DialogContent>
      </Dialog>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </>
  );
}

export default ChatPage;