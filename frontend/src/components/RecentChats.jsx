import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Drawer,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import ChatIcon from "@mui/icons-material/Chat";

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
  const [open, setOpen] = useState(false); // for mobile drawer
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const currentUserId = localStorage.getItem("user_id"); 

  const fetchFriends = async () => {
    try {
      const response = await axios.get(
        `https://social-media-website-project.onrender.com/api/friends/${currentUserId}`
      );
      setFriends(response.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchRecentChats = async () => {
    try {
      const response = await axios.get(
        `https://social-media-website-project.onrender.com/api/recentchat/${currentUserId}`
      );
      setRecentChats(response.data);
    } catch (error) {
      console.error("Error fetching recent chats:", error);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchFriends();
      fetchRecentChats();
    }
  }, [currentUserId]);

  const content = (
    <Box>
      {/* Recent Chats Section */}
      <Typography variant="h6" gutterBottom>
        Recent Chats
      </Typography>
      <Paper sx={{ maxHeight: 250, overflowY: "auto", mb: 2, p: 1, bgcolor: "#2c2c2c", color: "#fff" }}>
        {recentChats.length === 0 ? (
          <Typography variant="body2" color="gray">
            No recent chats
          </Typography>
        ) : (
          <List>
            {recentChats.map((chat) => (
              <React.Fragment key={chat.id}>
                <ListItem
                  button
                  component={Link}
                  to={`/chat/${currentUserId}/${chat.id}`}
                  sx={{ "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" } }}
                >
                  <ListItemText
                    primary={chat.username}
                    secondary={`Last: ${new Date(chat.last_chatted).toLocaleString()}`}
                    primaryTypographyProps={{ color: "#fff" }}
                    secondaryTypographyProps={{ color: "gray", fontSize: "0.8rem" }}
                  />
                </ListItem>
                <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Friends Section */}
      <Typography variant="h6" gutterBottom>
        Friends
      </Typography>
      <Paper sx={{ maxHeight: 250, overflowY: "auto", p: 1, bgcolor: "#2c2c2c", color: "#fff" }}>
        {friends.length === 0 ? (
          <Typography variant="body2" color="gray">
            No friends found
          </Typography>
        ) : (
          <List>
            {friends.map((friend) => (
              <ListItem key={friend.id}>
                <ListItemText primary={friend.username} primaryTypographyProps={{ color: "#fff" }} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );

  // Desktop: show sticky panel, Mobile: show drawer button
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
            PaperProps={{ sx: { width: 280, bgcolor: "#1e1e1e", color: "#fff", p: 2 } }}
          >
            {content}
          </Drawer>
        </>
      ) : (
        <StickyWrapper sx={{mt:5}}>{content}</StickyWrapper>
      )}
    </>
  );
}

export default RecentChats;
