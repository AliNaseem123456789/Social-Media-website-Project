import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Container,
  Grid,
  TextField,
  InputAdornment,
  Button,
  alpha,
  Stack,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import { useNavigate } from "react-router-dom";
import { friendService } from "../services/friendsService";
import Sidebar from "../../../components/Sidebar";
function FriendsPage() {
  const currentUserId = localStorage.getItem("user_id");
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          bgcolor: "#f4f7fe",
        }}
      >
        <CircularProgress size={50} thickness={4} sx={{ color: "#1877f2" }} />
      </Box>
    );

  return (
    <Box sx={{ bgcolor: "#f4f7fe", minHeight: "100vh", pt: 12, pb: 6 }}>
      <Sidebar />
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box
          sx={{
            mb: 4,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 900, color: "#1a1a1b", letterSpacing: "-1px" }}
            >
              Friends
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              You have {friends.length} connections
            </Typography>
          </Box>

          <TextField
            placeholder="Search friends..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: "text.disabled" }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: "12px",
                bgcolor: "white",
                width: { xs: "100%", md: "300px" },
              },
            }}
          />
        </Box>

        {filteredFriends.length === 0 ? (
          <Paper
            sx={{
              p: 8,
              textAlign: "center",
              borderRadius: "24px",
              bgcolor: "white",
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No friends found.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredFriends.map((friend) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={friend.id}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "24px",
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.05)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  {/* Decorative Profile Header */}
                  <Box
                    sx={{ height: "60px", bgcolor: alpha("#1877f2", 0.1) }}
                  />

                  <Box sx={{ px: 3, pb: 3, mt: "-30px", textAlign: "center" }}>
                    <Avatar
                      src={friend.avatar}
                      sx={{
                        width: 80,
                        height: 80,
                        mx: "auto",
                        border: "4px solid white",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        bgcolor: "#1877f2",
                        fontSize: "2rem",
                        fontWeight: 700,
                      }}
                    >
                      {friend.username.charAt(0).toUpperCase()}
                    </Avatar>

                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        mt: 1.5,
                        mb: 0.5,
                        color: "#1a1a1b",
                      }}
                    >
                      {friend.username}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 700,
                        display: "block",
                        mb: 2,
                      }}
                    >
                      {friend.location || "Community Member"}
                    </Typography>

                    <Stack direction="row" spacing={1}>
                      <Button
                        fullWidth
                        variant="contained"
                        disableElevation
                        size="small"
                        startIcon={<AccountCircleRoundedIcon />}
                        onClick={() => navigate(`/profile/${friend.id}`)}
                        sx={{
                          borderRadius: "10px",
                          textTransform: "none",
                          fontWeight: 700,
                        }}
                      >
                        Profile
                      </Button>
                      <IconButton
                        onClick={() =>
                          navigate(`/chat/${currentUserId}/${friend.id}`)
                        }
                        sx={{
                          bgcolor: alpha("#1877f2", 0.1),
                          color: "#1877f2",
                          borderRadius: "10px",
                          "&:hover": { bgcolor: alpha("#1877f2", 0.2) },
                        }}
                      >
                        <ChatBubbleRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

// Small helper for the Message button
const IconButton = ({ children, onClick, sx }) => (
  <Box
    component="button"
    onClick={onClick}
    sx={{
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      p: 1,
      ...sx,
    }}
  >
    {children}
  </Box>
);

export default FriendsPage;
