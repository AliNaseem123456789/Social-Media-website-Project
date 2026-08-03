// Place at: src/features/profile/components/ProfileHero.jsx
import React from "react";
import { Box, Avatar, Typography, Button, Stack, Container } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { T } from "../../../styles/circleTokens";

function MetaItem({ icon, children }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: T.inkSoft }}>
      <Box sx={{ display: "flex", color: T.inkFaint }}>{icon}</Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{children}</Typography>
    </Stack>
  );
}

const pillBase = {
  borderRadius: "999px",
  textTransform: "none",
  fontWeight: 600,
  fontSize: 14,
  px: 2.75,
  py: 1,
};

const ProfileHero = ({ profile, isOwn, onEdit, onChat, isFriend, requestSent, onSendRequest }) => {
  if (!profile) return null;

  return (
    <Box sx={{ width: "100%", position: "relative", bgcolor: T.surface }}>
      <Box
        sx={{
          height: { xs: 170, md: 240 },
          background: `linear-gradient(rgba(22,20,15,0.12), rgba(22,20,15,0.5)), url(${
            profile.cover_image_url || "https://images.unsplash.com/photo-1557683316-973673baf926"
          })`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            mt: { xs: -6, md: -7 },
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 3,
            px: { xs: 2, md: 0 },
          }}
        >
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={profile.profile_image_url}
              sx={{
                width: { xs: 100, md: 148 },
                height: { xs: 100, md: 148 },
                border: `5px solid ${T.surface}`,
                boxShadow: "0 14px 32px -8px rgba(22,20,15,0.28)",
                bgcolor: T.ember,
                fontFamily: T.fontDisplay,
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                fontWeight: 600,
              }}
            >
              {!profile.profile_image_url && profile.username?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box
              sx={{
                position: "absolute",
                bottom: 6,
                right: 6,
                width: 16,
                height: 16,
                borderRadius: "50%",
                bgcolor: T.signal,
                border: `3px solid ${T.surface}`,
              }}
            />
          </Box>

          <Box sx={{ flex: 1, pb: 1, minWidth: "220px" }}>
            <Typography
              sx={{
                fontFamily: T.fontDisplay,
                fontWeight: 600,
                fontSize: { xs: 26, md: 32 },
                letterSpacing: "-0.01em",
                color: T.ink,
              }}
            >
              {profile.username}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} sx={{ mb: 1 }}>
            {isOwn ? (
              <Button
                disableElevation
                startIcon={<EditRoundedIcon sx={{ fontSize: 18 }} />}
                onClick={onEdit}
                sx={{
                  ...pillBase,
                  bgcolor: T.ember,
                  color: "#fff8f4",
                  "&:hover": { bgcolor: "#c93a19" },
                }}
              >
                Edit profile
              </Button>
            ) : (
              <>
                <Button
                  disableElevation
                  startIcon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18 }} />}
                  onClick={onChat}
                  sx={{
                    ...pillBase,
                    bgcolor: T.ember,
                    color: "#fff8f4",
                    "&:hover": { bgcolor: "#c93a19" },
                  }}
                >
                  Message
                </Button>
                {isFriend ? (
                  <Button
                    disabled
                    startIcon={<CheckRoundedIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      ...pillBase,
                      bgcolor: T.signalTint,
                      color: T.signal,
                      "&.Mui-disabled": { bgcolor: T.signalTint, color: T.signal },
                    }}
                  >
                    Friends
                  </Button>
                ) : (
                  <Button
                    disableElevation
                    startIcon={requestSent ? <HourglassTopRoundedIcon sx={{ fontSize: 18 }} /> : <PersonAddRoundedIcon sx={{ fontSize: 18 }} />}
                    onClick={onSendRequest}
                    disabled={requestSent}
                    sx={
                      requestSent
                        ? { ...pillBase, color: T.inkSoft, border: `1px solid ${T.line}` }
                        : {
                            ...pillBase,
                            color: T.ink,
                            border: `1px solid ${T.line}`,
                            "&:hover": { borderColor: T.ink, bgcolor: "transparent" },
                          }
                    }
                  >
                    {requestSent ? "Pending" : "Add friend"}
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Box>

        <Box sx={{ px: { xs: 2, md: 0 }, pt: 2, pb: 3.5 }}>
          {profile.bio && (
            <Typography
              sx={{
                fontSize: 15,
                color: T.inkSoft,
                lineHeight: 1.65,
                maxWidth: 600,
                mb: 1.75,
              }}
            >
              {profile.bio}
            </Typography>
          )}
          <Stack direction="row" spacing={2.5} flexWrap="wrap" rowGap={1}>
            {profile.country && (
              <MetaItem icon={<PublicRoundedIcon sx={{ fontSize: 16 }} />}>{profile.country}</MetaItem>
            )}
            {profile.education && (
              <MetaItem icon={<SchoolRoundedIcon sx={{ fontSize: 16 }} />}>{profile.education}</MetaItem>
            )}
            <MetaItem icon={<CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />}>
              Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString([], { month: "long", year: "numeric" }) : "recently"}
            </MetaItem>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default ProfileHero;