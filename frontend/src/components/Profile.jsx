import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import PublicIcon from "@mui/icons-material/Public";       // Country
import SchoolIcon from "@mui/icons-material/School";       // Education
import WcIcon from "@mui/icons-material/Wc";               // Gender
import CakeIcon from "@mui/icons-material/Cake";           // Age
import InterestsIcon from "@mui/icons-material/Interests"; // Hobbies
import ChatIcon from "@mui/icons-material/Chat";

import AddProfileInfoForm from "./AddProfileInfoForm";

import {
  Box,Avatar,Typography,Paper,Stack,Divider,Button,Chip,Grid,CircularProgress,InputAdornment,
} from "@mui/material";

function Profile() {
  const { id: userId } = useParams();
  const currentUserId = Number(localStorage.getItem("user_id"));
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendsList, setFriendsList] = useState([]);
  const [requestSent, setRequestSent] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isOwnProfile = Number(userId) === currentUserId;
  const navigate = useNavigate();

  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/posts/profile/${userId}`
      );
      setProfile(res.data.profile);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (!isOwnProfile) {
      async function fetchFriends() {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/friends/${currentUserId}`
          );
          setFriendsList(res.data);
        } catch (err) {
          console.error("Error fetching friends:", err);
        }
      }
      fetchFriends();
    }
  }, [currentUserId, isOwnProfile]);

  const isFriend = friendsList.some((f) => f.id === Number(userId));

  const handleChat = () => {
    navigate(`/chat/${currentUserId}/${userId}`);
  };

  const handleSendFriendRequest = async () => {
    try {
      await axios.post("http://localhost:5000/api/friends/request", {
        requester_id: currentUserId,
        recipient_id: Number(userId),
      });
      setRequestSent(true);
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );

  if (!profile)
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">No profile found</Typography>
      </Box>
    );

  return (
    <>
      <Navbar />
      <Sidebar />
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", pb: 4 }}>
        {/* Cover Image */}
        <Box
          sx={{
            height: { xs: 150, sm: 180, md: 200 },
            width: "100%",
            backgroundImage: `url(${profile.cover_image || "https://via.placeholder.com/800x200"})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Profile Card */}
        <Paper
            elevation={4}
            sx={{
              maxWidth: 800,
              mx: "auto",        // center horizontally
              mt: -6,
              borderRadius: 3,
              p: { xs: 2, sm: 3, md: 4 },
              position: "relative",
              ml: { xs: 0, md: 20 }, // shift left for medium+ screens
            }}>
                    <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 3, md: 5 }}
            alignItems={{ xs: "center", md: "flex-start" }} >
            {/* Avatar & Basic Info */}
            <Box sx={{ textAlign: "center", width: { xs: "100%", md: "180px" } }}>
              <Avatar
                src={profile.profile_image || "https://via.placeholder.com/150"}
                alt="Profile"
                sx={{
                  width: { xs: 120, md: 140 },
                  height: { xs: 120, md: 140 },
                  mb: 2,
                  border: "4px solid white",
                }}
              />
              <Typography variant="h5" fontWeight="bold">
                {profile.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Joined: {new Date(profile.created_at).toLocaleDateString()}
              </Typography>

              {/* Buttons */}
              {isOwnProfile ? (
                <Button
                  variant="contained"
                  sx={{ mt: 2, borderRadius: 3, width: "100%" }}
                  onClick={() => setEditOpen(true)}
                >
                  Edit Profile
                </Button>
              ) : (
                <Stack direction="column" spacing={3} mt={2} flexWrap="wrap" justifyContent="center">
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ borderRadius: 3,m:4 }}
                    onClick={handleChat}
                  >
                    <ChatIcon sx={{mr:2}} color="white"  />Chat
                  </Button>

                  {isFriend ? (
                    <Button variant="outlined" disabled sx={{ borderRadius: 3 }}>
                      Friends
                    </Button>
                  ) : requestSent ? (
                    <Button variant="outlined" disabled sx={{ borderRadius: 3 }}>
                      Request Sent
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="secondary"
                      sx={{ borderRadius: 3 }}
                      onClick={handleSendFriendRequest}
                    >
                      Send Friend Request
                    </Button>
                  )}
                </Stack>
              )}
            </Box>

            {/* Profile Details */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" ml={20} fontWeight="bold" mb={1}>
                Description
              </Typography>
              <Typography variant="body1" mb={2}>
                {profile.bio || "No bio added yet."}
              </Typography>
              <Divider sx={{ mb: 2 }} />
             
 <Grid container spacing={4}>
  {/* Left side: 2x2 grid (4 fields) */}
  <Grid item xs={12} md={8}>
    <Grid container spacing={6}>
      <Grid item xs={6}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PublicIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="bold" > Country</Typography>
        </Stack>
        <Typography variant="body2" ml={4} mt={0.5}>{profile.country || "-"}</Typography>
      </Grid>

      <Grid item xs={6}>
        <Stack direction="row" spacing={1} alignItems="center">
          <SchoolIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="bold">Education</Typography>
        </Stack>
        <Typography variant="body2" ml={2} mt={0.5}>{profile.education || "-"}</Typography>
      </Grid>

      <Grid item xs={6}>
        <Stack direction="row" spacing={1} alignItems="center">
          <WcIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="bold">Gender</Typography>
        </Stack>
        <Typography variant="body2" ml={4} mt={0.5}>{profile.gender || "-"}</Typography>
      </Grid>

      <Grid item xs={6}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CakeIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="bold">Age</Typography>
        </Stack>
        <Typography variant="body2" ml={2} mt={0.5}>{profile.age || "-"} Years</Typography>
      </Grid>
    </Grid>
  </Grid>

  {/* Right side: Hobbies card */}
  <Grid item xs={12} md={4}>
    <Paper sx={{ p: 1, borderRadius: 2, height: "100%"}} elevation={3}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <InterestsIcon color="primary" />
        <Typography variant="subtitle1" fontWeight="bold">Hobbies</Typography>
      </Stack>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {profile.hobbies?.length
          ? profile.hobbies.split(",").map((hobby, idx) => (
              <Chip key={idx} label={hobby.trim()} color="primary" />
            ))
          : "-"}
      </Stack>
    </Paper>
  </Grid>
</Grid>


            </Box>
          </Stack>
        </Paper>

        {/* AddProfileInfoForm Modal */}
        <AddProfileInfoForm
          open={editOpen}
          handleClose={() => setEditOpen(false)}
          userId={profile.user_id}
          onSaved={fetchProfile}
        />
      </Box>
    </>
  );
}

export default Profile;
