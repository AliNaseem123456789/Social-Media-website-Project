import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { Box, Typography, Paper, Avatar, Stack, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";

function FriendsPage() {
  const currentUserId = localStorage.getItem("user_id");
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchFriends() {
      try {
        const response = await axios.get(`https://social-media-website-project.onrender.com/api/friends/${currentUserId}`);
        setFriends(response.data);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    }

    if (currentUserId) fetchFriends();
  }, [currentUserId]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size={60} thickness={5} />
      </Box>
    );

  if (friends.length === 0)
    return (
      <Box sx={{ p: 3 }}>
        <Navbar />
        <Typography variant="h5" mt={3} textAlign="center">
          You have no friends yet.
        </Typography>
      </Box>
    );

  return (
    
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
       <Typography variant="h5" mt={3} textAlign="center">
          My friends
        </Typography>
      <Navbar />
      <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography variant="h4" fontWeight="bold" mb={4}>
          My Friends
        </Typography>

        <Box
          sx={{
            display: "grid",
            justifyContent: "center",
            gridTemplateColumns: { xs: "repeat(2, 120px)", sm: "repeat(3, 150px)", md: "repeat(4, 180px)" },
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
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: 8,
                },
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
      </Box>
    </Box>
  );
}

export default FriendsPage;
