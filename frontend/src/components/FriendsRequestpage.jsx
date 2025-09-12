import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Stack,
  CircularProgress,
} from "@mui/material";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

function FriendRequestsPage() {
  const currentUserId = Number(localStorage.getItem("user_id"));
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending requests
  const fetchRequests = async () => {
    try {
      const res = await axios.get(
        `https://social-media-website-project.onrender.com/api/friends/pending/${currentUserId}`
      );
      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUserId]);

  // Accept/Reject handler
  const handleRespond = async (friendship_id, status) => {
    try {
      await axios.post("https://social-media-website-project.onrender.com/api/friends/respond", {
        friendship_id,
        status,
      });
      setRequests((prev) =>
        prev.filter((req) => req.friendship_id !== friendship_id)
      );
    } catch (err) {
      console.error("Error responding to request:", err);
    }
  };

  return (
    <div style={ {backgroundColor:"#f0f2f5"}}>

    
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      <Navbar />
      <Sidebar />

      <Box
        sx={{

          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 8,
          px: 2,
        }}
      >
        <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold",mt:3 }}>
          Pending Friend Requests
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : requests.length === 0 ? (
          <Typography variant="h6" color="text.secondary">
            You have no pending friend requests.
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ width: "100%", maxWidth: 500 }}>
            {requests.map((req) => (
              <Card
                key={req.friendship_id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1,
                  boxShadow: 3,
                  borderRadius: 3,
                  bgcolor: "#ffffff",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: "#3f51b5" }}>
                    {req.users.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {req.users.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {req.users.email}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={() => handleRespond(req.friendship_id, "accepted")}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CloseIcon />}
                    onClick={() => handleRespond(req.friendship_id, "rejected")}
                  >
                    Reject
                  </Button>
                </Box>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
    </div>
  );
}

export default FriendRequestsPage;
