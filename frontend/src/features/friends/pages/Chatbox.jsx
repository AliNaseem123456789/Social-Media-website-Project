import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Badge,
  CircularProgress,
  Fade,
  Slide,
  Zoom,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  InputAdornment,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import CallEndRoundedIcon from "@mui/icons-material/CallEndRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { chatService, socket } from "../services/chatService";
import ChatSidebar from "../components/ChatSidebar";
import VideoCall from "./VideoCall";
import { useAuth } from "../../auth/context/AuthContext";

const ACCENT = "#6d5ce8";
const ACCENT_SOFT = "#eef0ff";
const GRADIENT = "linear-gradient(135deg, #7c3aed, #2563eb)";
const ONLINE = "#31c48d";
const NAVBAR_HEIGHT = "64px";

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits text around every case-insensitive match of `query` and wraps
 * matches in a highlighted <mark>. The currently-focused match (matched
 * by messageIndex === activeMatchIndex) gets the stronger accent fill so
 * the person can visually track "where am I" while paging through
 * results, same as WhatsApp/Slack search does. */
function HighlightedText({ text, query, isActiveMessage }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Box
            component="mark"
            key={i}
            sx={{
              bgcolor: isActiveMessage ? ACCENT : "#ffe58a",
              color: isActiveMessage ? "#fff" : "inherit",
              borderRadius: "3px",
              px: "2px",
              transition: "background-color 0.15s ease",
            }}
          >
            {part}
          </Box>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function ChatPage() {
  const navigate = useNavigate();
  const { otherUserId } = useParams();

  const { user: currentUser, loading: authLoading } = useAuth();
  const currentUserId = currentUser?.id;

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false);

  // ---- message search state ----
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const searchInputRef = useRef(null);
  const messageRefs = useRef({});

  // ---- options menu / conversation actions ----
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [muted, setMuted] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const roomId =
    currentUserId && otherUserId
      ? `room_${Math.min(currentUserId, otherUserId)}_${Math.max(currentUserId, otherUserId)}`
      : "";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!searchOpen) scrollToBottom();
  }, [chat, searchOpen]);

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
          }))
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
          { from: data.username, text: data.message, timestamp: new Date().toISOString() },
        ]);
      }
    });

    socket.on("typing", ({ from, isTyping: typing }) => {
      if (String(from) === String(otherUserId)) setRecipientTyping(typing);
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
    socket.emit("private_message", { to: parseInt(otherUserId), message });
    setChat((prev) => [...prev, { from: "Me", text: message, timestamp: new Date().toISOString() }]);
    setMessage("");
    setIsTyping(false);
    socket.emit("typing", { to: otherUserId, isTyping: false });
  };

  const startVideoCall = () => {
    setIsVideoCallOpen(true);
    setIsCallActive(true);
    socket.emit("video_call_request", { to: otherUserId, roomId });
  };

  const endVideoCall = () => {
    setIsVideoCallOpen(false);
    setIsCallActive(false);
  };

  /* ---------------------------------------------------------------------
     Message search — matches are computed against the loaded `chat`
     array. Opening search doesn't refetch anything; it filters what's
     already on screen, same as WhatsApp Web's in-conversation search.
     ------------------------------------------------------------------ */

  const matchIndices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return chat.reduce((acc, msg, idx) => {
      if (msg.text?.toLowerCase().includes(q)) acc.push(idx);
      return acc;
    }, []);
  }, [searchQuery, chat]);

  useEffect(() => {
    setActiveMatch(0);
  }, [searchQuery]);

  useEffect(() => {
    if (matchIndices.length === 0) return;
    const targetIdx = matchIndices[activeMatch];
    const el = messageRefs.current[targetIdx];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatch, matchIndices]);

  const openSearch = () => {
    setMenuAnchor(null);
    setSearchOpen(true);
    // focus after the field mounts
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setActiveMatch(0);
  };

  const goToNextMatch = useCallback(() => {
    if (matchIndices.length === 0) return;
    setActiveMatch((prev) => (prev + 1) % matchIndices.length);
  }, [matchIndices.length]);

  const goToPrevMatch = useCallback(() => {
    if (matchIndices.length === 0) return;
    setActiveMatch((prev) => (prev - 1 + matchIndices.length) % matchIndices.length);
  }, [matchIndices.length]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      closeSearch();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) goToPrevMatch();
      else goToNextMatch();
    }
  };

  /* ---------------------------------------------------------------------
     Conversation actions (mute / clear / block). These call optional
     chatService methods — see notes at the end for the backend routes
     needed to make them persist rather than just update local state.
     ------------------------------------------------------------------ */

  const handleToggleMute = async () => {
    const next = !muted;
    setMuted(next);
    setMenuAnchor(null);
    try {
      await chatService.muteChat?.(otherUserId, next);
      setSnackbar({ open: true, message: next ? "Notifications muted" : "Notifications unmuted", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Couldn't update notification setting", severity: "error" });
    }
  };

  const handleClearChat = async () => {
    setClearing(true);
    try {
      await chatService.clearChat?.(otherUserId);
      setChat([]);
      setSnackbar({ open: true, message: "Chat cleared", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Couldn't clear chat", severity: "error" });
    } finally {
      setClearing(false);
      setClearConfirmOpen(false);
    }
  };

  const handleBlockUser = async () => {
    setBlocking(true);
    try {
      await chatService.blockUser?.(otherUserId);
      setSnackbar({ open: true, message: `${recipient?.username || "User"} blocked`, severity: "success" });
      setTimeout(() => navigate("/friendspage"), 800);
    } catch {
      setSnackbar({ open: true, message: "Couldn't block user", severity: "error" });
    } finally {
      setBlocking(false);
      setBlockConfirmOpen(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#f7f6fc" }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (!currentUserId) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#f7f6fc" }}>
        <Typography color="text.secondary">Please login to continue</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          bgcolor: "#f7f6fc",
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT})`,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          p: { xs: 0, md: 3 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            height: { xs: `calc(100vh - ${NAVBAR_HEIGHT})`, md: "calc(100vh - 112px)" },
            borderRadius: { xs: 0, md: "24px" },
            border: { xs: "none", md: "1px solid rgba(124,58,237,0.08)" },
            boxShadow: { xs: "none", md: "0 20px 60px rgba(80,50,180,0.06)" },
            display: "flex",
            overflow: "hidden",
            bgcolor: "#fff",
          }}
        >
          <Box sx={{ display: "flex", height: "100%", width: "100%" }}>
            <Box
              sx={{
                width: { xs: "0", sm: "300px" },
                flexShrink: 0,
                borderRight: "1px solid rgba(124,58,237,0.08)",
                display: { xs: "none", sm: "block" },
                height: "100%",
                bgcolor: "#fff",
                overflow: "auto",
              }}
            >
              <ChatSidebar />
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                bgcolor: "#f9f8fd",
                flex: "1 1 0%",
                minWidth: 0,
              }}
            >
              {/* Header — swaps entirely into a search bar when active,
                  same pattern as WhatsApp Web / Slack / Linear's inline
                  search: no separate modal, no page jump, just an
                  in-place transform of the existing header row. */}
              <Box
                sx={{
                  bgcolor: "#fff",
                  borderBottom: "1px solid rgba(124,58,237,0.08)",
                  mt: { xs: NAVBAR_HEIGHT, sm: 0 },
                  zIndex: 1,
                }}
              >
                {searchOpen ? (
                  <Fade in={searchOpen}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ p: "10px 16px" }}>
                      <IconButton onClick={closeSearch} size="small" sx={{ color: "text.secondary" }}>
                        <ArrowBackRoundedIcon fontSize="small" />
                      </IconButton>

                      <TextField
                        inputRef={searchInputRef}
                        fullWidth
                        variant="standard"
                        placeholder="Search messages in this chat"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        InputProps={{
                          disableUnderline: true,
                          sx: { fontSize: "0.9rem" },
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchRoundedIcon sx={{ fontSize: 18, color: ACCENT }} />
                            </InputAdornment>
                          ),
                          endAdornment: searchQuery && (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => setSearchQuery("")}>
                                <CloseRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          bgcolor: ACCENT_SOFT,
                          borderRadius: "12px",
                          px: 1.5,
                          py: 0.75,
                        }}
                      />

                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "text.secondary",
                          minWidth: 52,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {searchQuery.trim()
                          ? matchIndices.length > 0
                            ? `${activeMatch + 1}/${matchIndices.length}`
                            : "0/0"
                          : ""}
                      </Typography>

                      <IconButton
                        size="small"
                        onClick={goToPrevMatch}
                        disabled={matchIndices.length === 0}
                        sx={{ color: ACCENT }}
                      >
                        <KeyboardArrowUpRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={goToNextMatch}
                        disabled={matchIndices.length === 0}
                        sx={{ color: ACCENT }}
                      >
                        <KeyboardArrowDownRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Fade>
                ) : (
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ p: "14px 28px" }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <IconButton onClick={() => navigate(-1)} sx={{ display: { xs: "flex", sm: "none" } }}>
                        <ArrowBackRoundedIcon />
                      </IconButton>

                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        variant="dot"
                        sx={{
                          "& .MuiBadge-badge": {
                            bgcolor: ONLINE,
                            boxShadow: "0 0 0 2px #fff",
                            width: 11,
                            height: 11,
                            borderRadius: "50%",
                          },
                        }}
                      >
                        <Avatar
                          src={recipient?.profile_image}
                          onClick={() => navigate(`/profile/${otherUserId}`)}
                          sx={{ width: 44, height: 44, background: GRADIENT, fontWeight: 700, cursor: "pointer" }}
                        >
                          {recipient?.username?.charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>

                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: "0.98rem" }}>
                          {recipient?.username || "Loading..."}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography
                            variant="caption"
                            sx={{ color: recipientTyping ? ACCENT : ONLINE, fontWeight: 600, fontSize: "0.75rem" }}
                          >
                            {recipientTyping ? "typing..." : "Online"}
                          </Typography>
                          {muted && <VolumeOffRoundedIcon sx={{ fontSize: 13, color: "text.disabled" }} />}
                        </Stack>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Tooltip title="Search in conversation">
                        <IconButton
                          onClick={openSearch}
                          sx={{
                            color: "text.secondary",
                            "&:hover": { bgcolor: ACCENT_SOFT, color: ACCENT },
                            borderRadius: "12px",
                          }}
                        >
                          <SearchRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {!isCallActive ? (
                        <Tooltip title="Start video call">
                          <IconButton
                            onClick={startVideoCall}
                            sx={{
                              bgcolor: ACCENT_SOFT,
                              color: ACCENT,
                              "&:hover": { bgcolor: "#e2e0ff" },
                              borderRadius: "12px",
                            }}
                          >
                            <VideocamRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Chip
                          icon={<VideocamRoundedIcon sx={{ color: "#fff !important" }} />}
                          label="In call"
                          onDelete={endVideoCall}
                          deleteIcon={<CallEndRoundedIcon sx={{ color: "#fff !important" }} />}
                          sx={{
                            background: GRADIENT,
                            color: "#fff",
                            fontWeight: 600,
                            "& .MuiChip-deleteIcon": { color: "#fff" },
                          }}
                        />
                      )}

                      <IconButton
                        size="small"
                        onClick={(e) => setMenuAnchor(e.currentTarget)}
                        sx={{ color: "text.secondary" }}
                      >
                        <MoreVertRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                )}
              </Box>

              {/* Message stream */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  px: { xs: 2, md: 6 },
                  py: 3,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#f9f8fd",
                  backgroundImage: "radial-gradient(rgba(124,58,237,0.05) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              >
                <Box sx={{ width: "100%" }}>
                  {chat.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                      <Avatar
                        src={recipient?.profile_image}
                        sx={{ width: 64, height: 64, background: GRADIENT, mx: "auto", mb: 2, fontSize: "1.5rem" }}
                      >
                        {recipient?.username?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {recipient?.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        This is the start of your conversation.
                      </Typography>
                    </Box>
                  )}

                  {chat.map((msg, idx) => {
                    const isMe = msg.from === "Me";
                    const prevSame = idx > 0 && chat[idx - 1]?.from === msg.from;
                    const nextSame = idx < chat.length - 1 && chat[idx + 1]?.from === msg.from;
                    const showAvatar = !prevSame;
                    const showTimestamp = !nextSame;

                    const isMatch = searchOpen && matchIndices.includes(idx);
                    const isActiveMatch = isMatch && matchIndices[activeMatch] === idx;

                    return (
                      <Fade in timeout={300} key={idx}>
                        <Box
                          ref={(el) => {
                            messageRefs.current[idx] = el;
                          }}
                          sx={{
                            display: "flex",
                            justifyContent: isMe ? "flex-end" : "flex-start",
                            mb: nextSame ? 0.35 : 1.5,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="flex-end"
                            sx={{ maxWidth: "75%" }}
                          >
                            {!isMe && showAvatar && (
                              <Avatar sx={{ width: 28, height: 28, background: GRADIENT, fontSize: "0.75rem", flexShrink: 0 }}>
                                {recipient?.username?.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            {!isMe && !showAvatar && <Box sx={{ width: 28, flexShrink: 0 }} />}

                            <Stack alignItems={isMe ? "flex-end" : "flex-start"} spacing={0.4} sx={{ minWidth: 0 }}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: "9px 14px",
                                  borderRadius: isMe ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                                  background: isMe ? GRADIENT : "#fff",
                                  color: isMe ? "#fff" : "#1a1a1b",
                                  border: isMe
                                    ? isActiveMatch
                                      ? `2px solid ${ACCENT}`
                                      : "none"
                                    : isActiveMatch
                                    ? `2px solid ${ACCENT}`
                                    : "1px solid rgba(124,58,237,0.08)",
                                  boxShadow: isMe
                                    ? "0 6px 16px -8px rgba(109,92,232,0.55)"
                                    : "0 2px 6px rgba(80,50,180,0.03)",
                                  wordBreak: "break-word",
                                  transition: "border-color 0.15s ease",
                                }}
                              >
                                <Typography variant="body1" sx={{ fontSize: "0.92rem", lineHeight: 1.45 }}>
                                  {isMatch ? (
                                    <HighlightedText text={msg.text} query={searchQuery} isActiveMessage={isActiveMatch} />
                                  ) : (
                                    msg.text
                                  )}
                                </Typography>
                              </Paper>

                              {showTimestamp && msg.timestamp && (
                                <Typography
                                  variant="caption"
                                  sx={{ color: "text.disabled", fontSize: "0.68rem", px: 0.5 }}
                                >
                                  {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </Typography>
                              )}
                            </Stack>
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
                            borderRadius: "4px 18px 18px 18px",
                            bgcolor: "#fff",
                            border: "1px solid rgba(124,58,237,0.08)",
                          }}
                        >
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 6, height: 6, bgcolor: ACCENT, borderRadius: "50%", opacity: 0.6, animation: "lp-chat-pulse 1.4s infinite" }} />
                            <Box sx={{ width: 6, height: 6, bgcolor: ACCENT, borderRadius: "50%", opacity: 0.6, animation: "lp-chat-pulse 1.4s infinite 0.2s" }} />
                            <Box sx={{ width: 6, height: 6, bgcolor: ACCENT, borderRadius: "50%", opacity: 0.6, animation: "lp-chat-pulse 1.4s infinite 0.4s" }} />
                          </Stack>
                        </Paper>
                      </Box>
                    </Slide>
                  )}

                  <div ref={messagesEndRef} />
                </Box>
              </Box>

              {/* Composer */}
              <Box sx={{ p: "14px 28px", bgcolor: "#fff", borderTop: "1px solid rgba(124,58,237,0.08)" }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%" }}>
                  <Box
                    sx={{
                      flexGrow: 1,
                      bgcolor: "#f4f2fb",
                      borderRadius: "22px",
                      px: 2.25,
                      transition: "all 0.2s",
                      "&:focus-within": { bgcolor: "#fff", boxShadow: `0 0 0 1.5px ${ACCENT}` },
                    }}
                  >
                    <TextField
                      fullWidth
                      variant="standard"
                      placeholder="Message..."
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      InputProps={{ disableUnderline: true, sx: { py: 1.4, fontSize: "0.9rem" } }}
                      multiline
                      maxRows={4}
                    />
                  </Box>
                  <Zoom in={!!message.trim()}>
                    <IconButton
                      onClick={sendMessage}
                      disabled={!message.trim()}
                      sx={{
                        background: message.trim() ? GRADIENT : "#e4e6e9",
                        color: "#fff",
                        width: 42,
                        height: 42,
                        "&:hover": { background: GRADIENT, filter: "brightness(1.05)" },
                        "&.Mui-disabled": { background: "#e4e6e9", color: "#b0b3b8" },
                      }}
                    >
                      <SendRoundedIcon fontSize="small" />
                    </IconButton>
                  </Zoom>
                </Stack>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Conversation options menu */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { borderRadius: "14px", border: "1px solid rgba(124,58,237,0.1)", minWidth: 220 } }}
      >
        <MenuItem onClick={openSearch} sx={{ fontSize: 14, py: 1.1, gap: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>
            <SearchRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Search messages</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            navigate(`/profile/${otherUserId}`);
          }}
          sx={{ fontSize: 14, py: 1.1, gap: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>
            <PersonRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View profile</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleToggleMute} sx={{ fontSize: 14, py: 1.1, gap: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>
            {muted ? <VolumeUpRoundedIcon fontSize="small" /> : <VolumeOffRoundedIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{muted ? "Unmute notifications" : "Mute notifications"}</ListItemText>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setClearConfirmOpen(true);
          }}
          sx={{ fontSize: 14, py: 1.1, gap: 0.5, color: "text.secondary" }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>
            <DeleteSweepRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear chat</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setBlockConfirmOpen(true);
          }}
          sx={{ fontSize: 14, py: 1.1, gap: 0.5, color: "#e0431f" }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "#e0431f" }}>
            <BlockRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Block {recipient?.username || "user"}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Clear chat confirm */}
      <Dialog open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)} PaperProps={{ sx: { borderRadius: "18px", p: 0.5 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>Clear this chat?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            This clears the conversation on your side. {recipient?.username} will still see their copy of the messages.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setClearConfirmOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleClearChat}
            disabled={clearing}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "999px",
              px: 2.5,
              background: GRADIENT,
              color: "#fff",
            }}
          >
            {clearing ? "Clearing…" : "Clear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Block user confirm */}
      <Dialog open={blockConfirmOpen} onClose={() => setBlockConfirmOpen(false)} PaperProps={{ sx: { borderRadius: "18px", p: 0.5 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>Block {recipient?.username}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            They won't be able to message or call you. You can unblock them anytime from settings.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBlockConfirmOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleBlockUser}
            disabled={blocking}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "999px",
              px: 2.5,
              bgcolor: "#e0431f",
              color: "#fff",
              "&:hover": { bgcolor: "#c93a19" },
            }}
          >
            {blocking ? "Blocking…" : "Block"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isVideoCallOpen}
        onClose={endVideoCall}
        maxWidth="xl"
        fullScreen
        sx={{ "& .MuiDialog-paper": { bgcolor: "#14171c" } }}
      >
        <DialogTitle sx={{ bgcolor: "#1c2027", color: "#fff", py: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Video call with {recipient?.username}
            </Typography>
            <IconButton onClick={endVideoCall} sx={{ color: "#fff" }}>
              <CallEndRoundedIcon sx={{ bgcolor: "#e0431f", borderRadius: "50%", p: 1.5, fontSize: 30 }} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: "#14171c" }}>
          <VideoCall
            roomId={roomId}
            currentUserId={currentUserId}
            recipientName={recipient?.username}
            onEndCall={endVideoCall}
          />
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: "12px" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style>
        {`
          @keyframes lp-chat-pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.85); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </>
  );
}

export default ChatPage;