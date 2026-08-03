// Place at: src/features/profile/components/ProfileSidebar.jsx
import React from "react";
import { Paper, Typography, Box, Stack, Chip } from "@mui/material";
import WcRoundedIcon from "@mui/icons-material/WcRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { T, cardSx } from "../../../styles/circleTokens";

const InfoRow = ({ icon, label, value, isLast }) => (
  <Stack
    direction="row"
    spacing={1.5}
    alignItems="center"
    sx={{ py: 1.5, borderBottom: isLast ? "none" : `1px solid ${T.line}` }}
  >
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: "10px",
        bgcolor: T.emberTint,
        color: T.emberInk,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontFamily: T.fontMono,
          fontSize: 10.5,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: T.inkFaint,
          display: "block",
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: value ? T.ink : T.inkFaint }}>
        {value || "Not set"}
      </Typography>
    </Box>
  </Stack>
);

const ProfileSidebar = ({ profile }) => {
  const hobbies = profile.hobbies?.split(",").map((h) => h.trim()).filter(Boolean) || [];
  const rows = [
    { icon: <PublicRoundedIcon sx={{ fontSize: 17 }} />, label: "Location", value: profile.country },
    { icon: <SchoolRoundedIcon sx={{ fontSize: 17 }} />, label: "Education", value: profile.education },
    { icon: <WcRoundedIcon sx={{ fontSize: 17 }} />, label: "Gender", value: profile.gender },
    { icon: <CakeRoundedIcon sx={{ fontSize: 17 }} />, label: "Age", value: profile.age ? `${profile.age} years old` : null },
  ];

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ ...cardSx, p: 3 }}>
        <Typography
          sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 17, color: T.ink, mb: 0.5 }}
        >
          Intro
        </Typography>
        <Box sx={{ mt: 1 }}>
          {rows.map((row, i) => (
            <InfoRow key={row.label} {...row} isLast={i === rows.length - 1} />
          ))}
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ ...cardSx, p: 3 }}>
        <Typography sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 17, color: T.ink, mb: 2 }}>
          Interests
        </Typography>
        {hobbies.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {hobbies.map((hobby, i) => (
              <Chip
                key={i}
                label={hobby}
                size="small"
                sx={{
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: 12.5,
                  color: T.emberInk,
                  bgcolor: T.emberTint,
                  border: "none",
                  "&:hover": { bgcolor: "#f6d4c4" },
                }}
              />
            ))}
          </Box>
        ) : (
          <Typography sx={{ fontSize: 13, color: T.inkFaint }}>No interests listed yet</Typography>
        )}
      </Paper>
    </Stack>
  );
};

export default ProfileSidebar;