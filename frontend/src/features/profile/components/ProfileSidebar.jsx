import {
  Paper,
  Typography,
  Grid,
  Box,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import SchoolIcon from "@mui/icons-material/School";
import WcIcon from "@mui/icons-material/Wc";
import CakeIcon from "@mui/icons-material/Cake";
import React from "react";
const InfoTile = ({ icon, label, value }) => (
  <Grid item xs={6}>
    <Box
      sx={{
        p: 1.5,
        borderRadius: "16px",
        bgcolor: "#f9fafb",
        border: "1px solid #f1f3f5",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ color: "primary.main", mb: 0.5 }}
      >
        {React.cloneElement(icon, { fontSize: "small" })}
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" fontWeight={600}>
        {value || "Not Set"}
      </Typography>
    </Box>
  </Grid>
);

const ProfileSidebar = ({ profile }) => {
  return (
    <Stack spacing={3}>
      {/* About Section */}
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 6, border: "1px solid #f0f0f0" }}
      >
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          About Me
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.7 }}
        >
          {profile.bio || "No biography provided yet."}
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Info Grid */}
        <Grid container spacing={2}>
          <InfoTile
            icon={<PublicIcon />}
            label="Location"
            value={profile.country}
          />
          <InfoTile
            icon={<SchoolIcon />}
            label="Education"
            value={profile.education}
          />
          <InfoTile icon={<WcIcon />} label="Gender" value={profile.gender} />
          <InfoTile
            icon={<CakeIcon />}
            label="Age"
            value={profile.age ? `${profile.age} yrs` : null}
          />
        </Grid>
      </Paper>

      {/* Hobbies Section */}
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 6, border: "1px solid #f0f0f0" }}
      >
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
          Interests
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {profile.hobbies?.split(",").map((hobby, i) => (
            <Chip
              key={i}
              label={hobby.trim()}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                bgcolor: "#fff",
                border: "1px solid #e0e0e0",
                "&:hover": { bgcolor: "#f0f2f5" },
              }}
            />
          )) || <Typography variant="caption">No interests listed</Typography>}
        </Box>
      </Paper>
    </Stack>
  );
};

export default ProfileSidebar;
