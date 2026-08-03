// Place at: src/features/profile/components/ProfileFriendsCard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Paper, Typography, Box, Avatar, Skeleton, Stack } from "@mui/material";
import { friendService } from "../../friends/services/friendsService";
import { T, cardSx, colorFor } from "../../../styles/circleTokens";

const AVATAR_SIZE = 56; // px — change this one value to resize every avatar in the grid

function ProfileFriendsCard() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await friendService.getFriends();
        setFriends(data.friends || data || []);
      } catch (err) {
        console.error("Error loading friends preview:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Paper elevation={0} sx={{ ...cardSx, p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
        <Typography sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 17, color: T.ink }}>
          Friends
        </Typography>
        <Typography
          component="button"
          onClick={() => navigate("/friendspage")}
          sx={{
            fontSize: 12.5,
            fontWeight: 600,
            color: T.emberInk,
            background: "none",
            border: "none",
            cursor: "pointer",
            p: 0,
            "&:hover": { textDecoration: "underline" },
          }}
        >
          See all
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
          {Array.from(new Array(6)).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: "14px" }}
            />
          ))}
        </Box>
      ) : friends.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: T.inkFaint }}>
          No friends yet — search for people to start building your circle.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          {friends.slice(0, 9).map((friend) => (
            <Box
              key={friend.id}
              onClick={() => navigate(`/profile/${friend.id}`)}
              sx={{
                cursor: "pointer",
                textAlign: "center",
                width: AVATAR_SIZE,
                flexShrink: 0,
              }}
            >
              <Avatar
                src={friend.profile_image}
                variant="rounded"
                sx={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: "14px",
                  bgcolor: colorFor(friend.username),
                  fontFamily: T.fontDisplay,
                  fontWeight: 600,
                  fontSize: AVATAR_SIZE * 0.35,
                }}
              >
                {friend.username?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Typography
                noWrap
                sx={{
                  display: "block",
                  mt: 0.75,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: T.ink,
                  maxWidth: AVATAR_SIZE,
                }}
              >
                {friend.username}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default ProfileFriendsCard;