import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Avatar,
  Button,
  Stack,
  CircularProgress,
  Container,
  alpha,
  Paper,
} from "@mui/material";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
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
      setRequests((prev) =>
        prev.filter((req) => req.friendship_id !== friendship_id),
      );
    } catch (err) {
      console.error("Error responding to request:", err);
    }
  };

  return (
    <Box sx={{ bgcolor: "#f4f7fe", minHeight: "100vh", display: "flex" }}>
      <Sidebar />

      <Box
        component="main"
        sx={{ flexGrow: 1, pt: 12, px: { xs: 2, md: 4 }, pb: 6 }}
      >
        <Container maxWidth="sm">
          {/* Header Section */}
          <Box sx={{ mb: 5, textAlign: "center" }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                bgcolor: alpha("#1877f2", 0.1),
                color: "#1877f2",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <PersonAddRoundedIcon fontSize="large" />
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 900, color: "#1a1a1b", letterSpacing: "-1px" }}
            >
              Friend Requests
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600, mt: 1 }}
            >
              {requests.length > 0
                ? `You have ${requests.length} people wanting to connect`
                : "Your inbox is empty"}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
              <CircularProgress
                thickness={5}
                size={50}
                sx={{ color: "#1877f2" }}
              />
            </Box>
          ) : requests.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: "24px",
                bgcolor: "white",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                No pending requests.
              </Typography>
              <Typography variant="body2" color="text.disabled">
                When people send you a request, they'll show up here.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {requests.map((req) => (
                <Card
                  key={req.friendship_id}
                  elevation={0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2.5,
                    borderRadius: "24px",
                    bgcolor: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.05)",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "scale(1.01)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha("#1877f2", 0.1),
                        color: "#1877f2",
                        width: 56,
                        height: 56,
                        fontWeight: 800,
                        fontSize: "1.2rem",
                        border: "1px solid rgba(24, 119, 242, 0.2)",
                      }}
                    >
                      {req.users.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 800, color: "#1a1a1b" }}
                      >
                        {req.users.username}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        {req.users.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      disableElevation
                      size="small"
                      onClick={() =>
                        handleRespond(req.friendship_id, "accepted")
                      }
                      sx={{
                        borderRadius: "12px",
                        bgcolor: "#1877f2",
                        fontWeight: 700,
                        textTransform: "none",
                        px: 2,
                        "&:hover": { bgcolor: "#166fe5" },
                      }}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="contained"
                      disableElevation
                      size="small"
                      onClick={() =>
                        handleRespond(req.friendship_id, "rejected")
                      }
                      sx={{
                        borderRadius: "12px",
                        bgcolor: "#f0f2f5",
                        color: "#1c1e21",
                        fontWeight: 700,
                        textTransform: "none",
                        px: 2,
                        "&:hover": { bgcolor: "#e4e6eb" },
                      }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Container>
      </Box>
    </Box>
  );
}

export default FriendRequestsPage;
