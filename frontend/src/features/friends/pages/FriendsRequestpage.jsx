import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Avatar,
  Button,
  Stack,
  CircularProgress,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Sidebar from "../../../components/Sidebar";
import { friendService } from "../services/friendsService";

function FriendRequestsPage() {
  const currentUserId = Number(localStorage.getItem("user_id"));
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await friendService.getPendingRequests(currentUserId);
        setRequests(data);
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) fetchRequests();
  }, [currentUserId]);

  const handleRespond = async (friendship_id, status) => {
    try {
      await friendService.respondToRequest(friendship_id, status);

      // Update local UI state immediately after successful API call
      setRequests((prev) =>
        prev.filter((req) => req.friendship_id !== friendship_id),
      );
    } catch (err) {
      console.error("Error responding to request:", err);
    }
  };

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      <Sidebar />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 12,
          px: 2,
        }}
      >
        <Typography variant="h4" sx={{ mb: 4, fontWeight: "bold" }}>
          Pending Friend Requests
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : requests.length === 0 ? (
          <Typography variant="h6" color="text.secondary">
            You have no pending friend requests.
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ width: "100%", maxWidth: 550 }}>
            {requests.map((req) => (
              <Card
                key={req.friendship_id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 2,
                  boxShadow: 2,
                  borderRadius: 3,
                  bgcolor: "#ffffff",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: "#3f51b5", width: 45, height: 45 }}>
                    {req.users.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {req.users.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {req.users.email}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={() => handleRespond(req.friendship_id, "accepted")}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
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
  );
}
export default FriendRequestsPage;
