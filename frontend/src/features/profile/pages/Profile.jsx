import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Fixed import
import { Box, CircularProgress, Container, Grid, Stack } from "@mui/material";

// Services
import { profileService } from "../services/profileService";

// Local Components
import ProfileHero from "../components/ProfileHero";
import ProfileSidebar from "../components/ProfileSidebar";
import ProfileStats from "../components/ProfileStats";
import ProfileTabs from "../components/ProfileTabs";
import AddProfileInfoForm from "./AddProfileInfoForm";

function Profile() {
  const { id: userId } = useParams();
  const currentUserId = Number(localStorage.getItem("user_id"));
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfile(userId);
      setProfile(data);

      // Check friendship status if viewing someone else's profile
      if (Number(userId) !== currentUserId) {
        const friends = await profileService.checkFriendship(currentUserId);
        setIsFriend(friends.some((f) => f.id === Number(userId)));
      }
    } catch (err) {
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const handleSendRequest = async () => {
    try {
      await profileService.sendFriendRequest(currentUserId, userId);
      setRequestSent(true);
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const handleChat = () => {
    navigate(`/chat/${currentUserId}/${userId}`);
  };

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress thickness={5} size={50} sx={{ color: "#1877f2" }} />
      </Box>
    );

  return (
    <Box sx={{ display: "flex", bgcolor: "#f4f7fe", minHeight: "100vh" }}>
      <Box component="main" sx={{ flexGrow: 1, pt: "64px" }}>
        {/* We pass all the logic as props to the Hero component */}
        <ProfileHero
          profile={profile}
          isOwn={Number(userId) === currentUserId}
          onEdit={() => setEditOpen(true)}
          isFriend={isFriend}
          requestSent={requestSent}
          onSendRequest={handleSendRequest}
          onChat={handleChat}
        />

        <Container maxWidth="lg" sx={{ mt: 4, pb: 6 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                <Box
                  sx={{
                    bgcolor: "white",
                    borderRadius: "24px",
                    p: 1,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                  }}
                >
                  <ProfileStats userId={userId} />
                </Box>
                <Box
                  sx={{
                    bgcolor: "white",
                    borderRadius: "24px",
                    p: 1,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                  }}
                >
                  <ProfileSidebar profile={profile} />
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={8}>
              <Box
                sx={{
                  bgcolor: "white",
                  borderRadius: "24px",
                  p: 2,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                }}
              >
                <ProfileTabs userId={userId} />
              </Box>
            </Grid>
          </Grid>
        </Container>

        <AddProfileInfoForm
          open={editOpen}
          handleClose={() => setEditOpen(false)}
          userId={profile?.user_id}
          onSaved={fetchProfileData}
        />
      </Box>
    </Box>
  );
}

export default Profile;
