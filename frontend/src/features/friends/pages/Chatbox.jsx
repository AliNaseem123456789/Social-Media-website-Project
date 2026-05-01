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
  Button,
  Chip,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import VideocamIcon from "@mui/icons-material/Videocam";
import CallEndIcon from "@mui/icons-material/CallEnd";
import { chatService, socket } from "../services/chatService";
import ChatSidebar from "../components/ChatSidebar";
import VideoCall from "./VideoCall";

function ChatPage() {
  const { user1, user2 } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem("user_id");
  const currentUsername = localStorage.getItem("username");

  const toUserId = String(user1) === String(currentUserId) ? user2 : user1;

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const messagesEndRef = useRef(null);

  const NAVBAR_HEIGHT = "64px";
  const roomId = `room_${Math.min(currentUserId, toUserId)}_${Math.max(currentUserId, toUserId)}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  useEffect(() => {
    if (!currentUserId || !toUserId) return;
    chatService.registerUser(currentUserId);

    const initializeChat = async () => {
      try {
        const [userInfo, history] = await Promise.all([
          chatService.getRecipientInfo(toUserId),
          chatService.getChatHistory(currentUserId, toUserId),
        ]);

        setRecipient(userInfo);
        setChat(
          history.map((msg) => ({
            from:
              String(msg.from_user) === String(currentUserId)
                ? "Me"
                : userInfo.username,
            text: msg.message,
          })),
        );
      } catch (err) {
        console.error(err);
      }
    };

    initializeChat();

    socket.on("private_message", (data) => {
      if (String(data.from) === String(currentUserId)) {
        return;
      }
      if (String(data.from) === String(toUserId)) {
        setChat((prev) => [
          ...prev,
          {
            from: data.username,
            text: data.message,
          },
        ]);
      }
    });

    // Listen for incoming video call requests
    socket.on("video_call_request", ({ from, roomId: callRoomId }) => {
      if (String(from) === String(toUserId)) {
        const acceptCall = window.confirm(
          `${recipient?.username} is calling you. Accept video call?`,
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
      alert("Call rejected");
    });

    return () => {
      socket.off("private_message");
      socket.off("video_call_request");
      socket.off("video_call_rejected");
    };
  }, [currentUserId, toUserId, recipient]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("private_message", {
      from: currentUserId,
      username: currentUsername,
      to: toUserId,
      message,
    });
    setChat((prev) => [...prev, { from: "Me", text: message }]);
    setMessage("");
  };

  const startVideoCall = () => {
    setIsVideoCallOpen(true);
    setIsCallActive(true);
    // Notify the other user
    socket.emit("video_call_request", {
      from: currentUserId,
      to: toUserId,
      roomId,
    });
  };

  const endVideoCall = () => {
    setIsVideoCallOpen(false);
    setIsCallActive(false);
  };

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
                width: { sm: "280px", md: "320px" },
                flexShrink: 0,
                borderRight: "1px solid #e0e0e0",
                display: { xs: "none", sm: "block" },
                height: "100%",
                bgcolor: "#fff",
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
              {/* Header with Video Call Button */}
              <Box
                sx={{
                  p: "10px 24px",
                  bgcolor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  zIndex: 1,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={recipient?.profile_image}
                    sx={{ width: 40, height: 40 }}
                  >
                    {recipient?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, lineHeight: 1.2 }}
                    >
                      {recipient?.username || "Loading..."}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="success.main"
                      sx={{ fontWeight: 700 }}
                    >
                      Online
                    </Typography>
                  </Box>
                </Stack>

                {/* Video Call Button */}
                <Stack direction="row" spacing={1}>
                  {!isCallActive ? (
                    <IconButton
                      onClick={startVideoCall}
                      sx={{
                        bgcolor: "#00a884",
                        color: "#fff",
                        "&:hover": { bgcolor: "#008f6f" },
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
                  px: { xs: 6, md: 8, lg: 10 },
                  py: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: {
                      xs: "170px",
                      sm: "170px",
                      md: "400px",
                      lg: "600px",
                    },
                    maxWidth: "1200px",
                    margin: "0 auto",
                  }}
                >
                  {chat.map((msg, i) => {
                    const isMe = msg.from === "Me";
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          justifyContent: isMe ? "flex-end" : "flex-start",
                          mb: 0.5,
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: "8px 16px",
                            borderRadius: isMe
                              ? "12px 0px 12px 12px"
                              : "0px 12px 12px 12px",
                            maxWidth: "85%",
                            minWidth: "60px",
                            bgcolor: isMe ? "#d9fdd3" : "#fff",
                            color: "#111b21",
                            boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                            wordBreak: "break-word",
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{ fontSize: "0.95rem" }}
                          >
                            {msg.text}
                          </Typography>
                        </Paper>
                      </Box>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Box>
              </Box>

              {/* Input Area */}
              <Box sx={{ p: "12px 24px", bgcolor: "#f0f2f5" }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ maxWidth: "1200px", margin: "0 auto" }}
                >
                  <Box
                    sx={{
                      flexGrow: 1,
                      bgcolor: "#fff",
                      borderRadius: "10px",
                      px: 2.5,
                    }}
                  >
                    <TextField
                      fullWidth
                      variant="standard"
                      placeholder="Type a message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      InputProps={{ disableUnderline: true, sx: { py: 1.5 } }}
                    />
                  </Box>
                  <IconButton
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    sx={{
                      bgcolor: message.trim() ? "#00a884" : "transparent",
                      color: message.trim() ? "#fff" : "#54656f",
                      "&:hover": {
                        bgcolor: message.trim() ? "#008f6f" : "transparent",
                      },
                      p: 1.5,
                    }}
                  >
                    <SendRoundedIcon />
                  </IconButton>
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
        <DialogTitle sx={{ bgcolor: "#2a2a2a", color: "#fff" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              Video Call with {recipient?.username}
            </Typography>
            <IconButton onClick={endVideoCall} sx={{ color: "#fff" }}>
              <CallEndIcon
                sx={{ bgcolor: "#f44336", borderRadius: "50%", p: 1 }}
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
    </>
  );
}

export default ChatPage;
