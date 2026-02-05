import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItemText,
  ListItemButton,
  Divider,
  Paper,
  Drawer,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import ChatIcon from "@mui/icons-material/Chat";
import { friendService } from "../services/friendsService";
import { chatService } from "../services/chatService";
const StickyWrapper = styled(Box)(({ theme }) => ({
  position: "sticky",
  top: 80,
  left: 0,
  width: 280,
  maxHeight: "calc(100vh - 80px)",
  padding: theme.spacing(2),
  backgroundColor: "#1e1e1e",
  color: "#fff",
  borderRadius: "0 8px 8px 0",
  overflowY: "auto",
  boxShadow: "2px 0 10px rgba(0,0,0,0.3)",
}));

function RecentChats() {
  const [friends, setFriends] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [open, setOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const currentUserId = localStorage.getItem("user_id");

  useEffect(() => {
    if (!currentUserId) return;

    const loadData = async () => {
      try {
        // Run both API calls in parallel for better performance
        const [friendsData, chatsData] = await Promise.all([
          friendService.getFriends(currentUserId),
          chatService.getRecentChats(currentUserId),
        ]);

        setFriends(friendsData);
        setRecentChats(chatsData);
      } catch (error) {
        console.error("Error loading chat/friend data:", error);
      }
    };

    loadData();
  }, [currentUserId]);

  const renderListSection = (title, data, isChat = false) => (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: isChat ? 0 : 2 }}>
        {title}
      </Typography>
      <Paper
        sx={{
          maxHeight: 250,
          overflowY: "auto",
          p: 1,
          bgcolor: "#2c2c2c",
          color: "#fff",
        }}
      >
        {data.length === 0 ? (
          <Typography variant="body2" color="gray" sx={{ p: 1 }}>
            No {title.toLowerCase()} found
          </Typography>
        ) : (
          <List>
            {data.map((item) => (
              <React.Fragment key={item.id}>
                <ListItemButton
                  component={Link}
                  to={`/chat/${currentUserId}/${item.id}`}
                  sx={{
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <ListItemText
                    primary={item.username}
                    secondary={
                      isChat
                        ? `Last: ${new Date(item.last_chatted).toLocaleString()}`
                        : null
                    }
                    primaryTypographyProps={{ color: "#fff", fontWeight: 500 }}
                    secondaryTypographyProps={{
                      color: "gray",
                      fontSize: "0.75rem",
                    }}
                  />
                </ListItemButton>
                <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </>
  );

  const content = (
    <Box>
      {renderListSection("Recent Chats", recentChats, true)}
      {renderListSection("Friends", friends)}
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <>
          <IconButton
            onClick={() => setOpen(true)}
            sx={{
              position: "fixed",
              bottom: 16,
              right: 16,
              bgcolor: "#1e1e1e",
              color: "#fff",
              "&:hover": { bgcolor: "#2c2c2c" },
              zIndex: 2000,
            }}
          >
            <ChatIcon />
          </IconButton>
          <Drawer
            anchor="left"
            open={open}
            onClose={() => setOpen(false)}
            PaperProps={{
              sx: { width: 280, bgcolor: "#1e1e1e", color: "#fff", p: 2 },
            }}
          >
            {content}
          </Drawer>
        </>
      ) : (
        <StickyWrapper sx={{ mt: 5 }}>{content}</StickyWrapper>
      )}
    </>
  );
}

export default RecentChats;
