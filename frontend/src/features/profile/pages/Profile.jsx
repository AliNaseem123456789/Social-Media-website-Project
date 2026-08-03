// Place at: src/features/profile/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Container, Grid, Stack, Skeleton, Paper, Button, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { profileService } from "../services/profileService";
import { useAuth } from "../../auth/context/AuthContext";
import ProfileHero from "../components/ProfileHero";
import ProfileSidebar from "../components/ProfileSidebar";
import ProfileStats from "../components/ProfileStats";
import ProfileTabs from "../components/ProfileTabs";
import ProfileFriendsCard from "../components/ProfileFriendsCard";
import AddProfileInfoForm from "./AddProfileInfoForm";
import { T, cardSx, CircleFonts } from "../../../styles/circleTokens";

function ProfileSkeleton() {
  return (
    <Box sx={{ bgcolor: T.paper, minHeight: "100vh" }}>
      <Skeleton variant="rectangular" height={240} />
      <Container maxWidth="lg" sx={{ mt: -7, position: "relative" }}>
        <Skeleton variant="circular" width={148} height={148} sx={{ border: `5px solid ${T.paper}` }} />
      </Container>
      <Container maxWidth="lg" sx={{ mt: 3, pb: 6 }}>
        <Stack direction="row" spacing={1.5} sx={{ mb: 4 }}>
          {Array.from(new Array(4)).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={90} sx={{ flex: 1, borderRadius: "16px" }} />
          ))}
        </Stack>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
            <Stack spacing={2.5}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: "20px" }} />
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: "20px" }} />
            </Stack>
          </Grid>
          <Grid item xs={12} md={8} sx={{ minWidth: 0 }}>
            <Skeleton variant="rounded" height={400} sx={{ borderRadius: "20px" }} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function Profile() {
  const { id: userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const currentUserId = currentUser?.id;
  const isOwn = Number(userId) === currentUserId;

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfile(userId);
      setProfile(data);
      if (!isOwn) {
        const friends = await profileService.checkFriendship();
        const friendList = friends.friends || friends;
        setIsFriend(friendList.some((f) => f.id === Number(userId)));
      }
    } catch (err) {
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentUserId]);

  const handleSendRequest = async () => {
    try {
      await profileService.sendFriendRequest(userId);
      setRequestSent(true);
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const handleChat = () => navigate(`/chat/${userId}`);

  if (loading) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <Box sx={{ bgcolor: T.paper, minHeight: "100vh" }}>
        <CircleFonts />
        <Container maxWidth="sm" sx={{ pt: 16, textAlign: "center" }}>
          <Paper elevation={0} sx={{ ...cardSx, p: 6 }}>
            <Typography sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 20, color: T.ink, mb: 1 }}>
              This profile couldn't be found
            </Typography>
            <Typography sx={{ fontSize: 14, color: T.inkSoft, mb: 3 }}>
              It may have been removed, or the link might be outdated.
            </Typography>
            <Button
              onClick={() => navigate("/home")}
              startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 18 }} />}
              disableElevation
              sx={{
                borderRadius: "999px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                bgcolor: T.ember,
                color: "#fff8f4",
                "&:hover": { bgcolor: "#c93a19" },
              }}
            >
              Back to home
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: T.paper, minHeight: "100vh" }}>
      <CircleFonts />

      <ProfileHero
        profile={profile}
        isOwn={isOwn}
        onEdit={() => setEditOpen(true)}
        isFriend={isFriend}
        requestSent={requestSent}
        onSendRequest={handleSendRequest}
        onChat={handleChat}
      />

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <ProfileStats userId={userId} />
      </Container>

      <Container maxWidth="lg" sx={{ mt: 3, pb: 6 }}>
        {/*
          IMPORTANT: this Grid container needs `flexWrap: "nowrap"` overridden
          per-breakpoint is NOT enough on its own — the real fix is that each
          Grid item must be allowed to SHRINK. By default a flex item's
          min-width is `auto`, which means it will never shrink below its
          content's natural width. If anything inside the md=8 column (a
          long unbroken string, a wide image, a fixed-width element) is
          wider than 8/12 of the row, the browser pushes the sidebar + posts
          combo past 12 columns worth of space and MUI wraps the row,
          dropping "Posts" underneath instead of beside the sidebar.
          Setting minWidth: 0 on both items fixes that at the root.
        */}
        <Grid container spacing={3} sx={{ flexWrap: { xs: "wrap", md: "nowrap" } }}>
          <Grid item xs={12} md={4} sx={{ minWidth: 0, flexShrink: 0 }}>
            <Stack spacing={2.5}>
              <ProfileSidebar profile={profile} />
              {isOwn && <ProfileFriendsCard />}
            </Stack>
          </Grid>

          <Grid item xs={12} md={8} sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ ...cardSx, p: 3, minWidth: 0, overflow: "hidden" }}>
              <ProfileTabs userId={userId} isOwn={isOwn} profile={profile} />
            </Box>
          </Grid>
        </Grid>
      </Container>

      <AddProfileInfoForm
        open={editOpen}
        handleClose={() => setEditOpen(false)}
        userId={profile?.user_id || currentUserId}
        onSaved={fetchProfileData}
      />
    </Box>
  );
}

export default Profile;