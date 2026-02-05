import React from "react";
import {
  Box,
  Avatar,
  Typography,
  Button,
  Stack,
  Container,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ChatIcon from "@mui/icons-material/Chat";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
const ProfileHero = ({
  profile,
  isOwn,
  onEdit,
  onChat,
  isFriend,
  requestSent,
  onSendRequest,
}) => {
  if (!profile) return null;

  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      <Box
        sx={{
          height: { xs: 200, md: 300 },
          background: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url(${
            profile.cover_image_url ||
            "https://images.unsplash.com/photo-1557683316-973673baf926"
          })`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            mt: -8,
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 3,
            px: { xs: 2, md: 0 },
          }}
        >
          <Avatar
            src={profile.profile_image_url}
            sx={{
              width: { xs: 120, md: 180 },
              height: { xs: 120, md: 180 },
              border: "6px solid #fff",
              boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
            }}
          />
          <Box sx={{ flex: 1, pb: 1, minWidth: "250px" }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: "#1a1a1b", mb: 0.5 }}
            >
              {profile.username}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ color: "text.secondary" }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <CalendarMonthIcon fontSize="inherit" />
                <Typography variant="caption" fontWeight={600}>
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </Typography>
              </Stack>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ mb: 1 }}>
            {isOwn ? (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={onEdit}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  background:
                    "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  startIcon={<ChatIcon />}
                  onClick={onChat}
                  sx={{
                    borderRadius: "12px",
                    px: 3,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Message
                </Button>
                {isFriend ? (
                  <Button
                    variant="outlined"
                    disabled
                    sx={{
                      borderRadius: "12px",
                      px: 3,
                      textTransform: "none",
                      fontWeight: 700,
                      borderWidth: 2,
                    }}
                  >
                    Friends
                  </Button>
                ) : (
                  <Button
                    variant={requestSent ? "outlined" : "contained"}
                    color="secondary"
                    startIcon={!requestSent && <PersonAddIcon />}
                    onClick={onSendRequest}
                    disabled={requestSent}
                    sx={{
                      borderRadius: "12px",
                      px: 3,
                      textTransform: "none",
                      fontWeight: 700,
                      borderWidth: 2,
                    }}
                  >
                    {requestSent ? "Pending Request" : "Add Friend"}
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default ProfileHero;
