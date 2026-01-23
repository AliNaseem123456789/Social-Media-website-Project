import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { friendService } from "../services/friendsService";

function FriendsPage() {
  const currentUserId = localStorage.getItem("user_id");
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const data = await friendService.getFriends(currentUserId);
        setFriends(data);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) fetchFriends();
  }, [currentUserId]);

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={60} thickness={5} />
      </Box>
    );

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      <Box
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 8,
        }}
      >
        <Typography variant="h4" fontWeight="bold" mb={4}>
          My Friends
        </Typography>

        {friends.length === 0 ? (
          <Typography variant="h6" color="text.secondary">
            You have no friends yet.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              justifyContent: "center",
              gridTemplateColumns: {
                xs: "repeat(2, 120px)",
                sm: "repeat(3, 150px)",
                md: "repeat(4, 180px)",
              },
              gap: 3,
            }}
          >
            {friends.map((friend) => (
              <Paper
                key={friend.id}
                elevation={4}
                sx={{
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  cursor: "pointer",
                  borderRadius: 3,
                  transition: "0.2s",
                  "&:hover": { transform: "translateY(-5px)", boxShadow: 8 },
                }}
                onClick={() => navigate(`/profile/${friend.id}`)}
              >
                <Avatar
                  src={friend.avatar || "https://via.placeholder.com/100"}
                  alt={friend.username}
                  sx={{ width: 70, height: 70, mb: 2 }}
                />
                <Typography variant="body1" fontWeight="medium">
                  {friend.username}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
export default FriendsPage;
