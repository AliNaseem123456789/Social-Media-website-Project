import React from "react";
import { Paper, Typography, Stack, Avatar, Button, Box } from "@mui/material";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
const TrendingSidebar = () => {
  const suggestions = [
    {
      id: 1,
      name: "Modern Dev",
      handle: "@react_pro",
      avatar: "M",
      color: "#6366f1",
    },
    {
      id: 2,
      name: "Design Daily",
      handle: "@ui_ux",
      avatar: "D",
      color: "#ec4899",
    },
    {
      id: 3,
      name: "Tech News",
      handle: "@tech_crunch",
      avatar: "T",
      color: "#10b981",
    },
  ];

  const hashtags = [
    { tag: "#ReactJS", posts: "12.5k" },
    { tag: "#JavaScript", posts: "8.2k" },
    { tag: "#WebDesign", posts: "5.1k" },
    { tag: "#NodeJS", posts: "3.9k" },
  ];

  return (
    <Stack spacing={3} sx={{ width: "100%", position: "sticky", top: "100px" }}>
      {/* SECTION 1: WHO TO FOLLOW */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "24px",
          bgcolor: "white",
          border: "1px solid rgba(0,0,0,0.05)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 800, mb: 2, color: "#1a1a1b" }}
        >
          Who to follow
        </Typography>
        <Stack spacing={2.5}>
          {suggestions.map((user) => (
            <Stack
              key={user.id}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: user.color,
                    width: 38,
                    height: 38,
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  {user.avatar}
                </Avatar>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, lineHeight: 1.2 }}
                  >
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.handle}
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="contained"
                size="small"
                disableElevation
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 700,
                  minWidth: "60px",
                  bgcolor: "#1877f2",
                  "&:hover": { bgcolor: "#166fe5" },
                }}
              >
                Follow
              </Button>
            </Stack>
          ))}
        </Stack>
        <Button
          fullWidth
          sx={{
            mt: 2,
            textTransform: "none",
            fontWeight: 700,
            color: "#1877f2",
          }}
        >
          Show More
        </Button>
      </Paper>

      {/* SECTION 2: TRENDING TOPICS */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "24px",
          bgcolor: "white",
          border: "1px solid rgba(0,0,0,0.05)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <LocalFireDepartmentRoundedIcon sx={{ color: "#ff4757" }} />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, color: "#1a1a1b" }}
          >
            Trending for you
          </Typography>
        </Stack>

        <Stack spacing={2}>
          {hashtags.map((item) => (
            <Box
              key={item.tag}
              sx={{
                cursor: "pointer",
                p: 1,
                borderRadius: "12px",
                transition: "0.2s",
                "&:hover": { bgcolor: "#f8f9fa" },
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, color: "#1a1a1b" }}
              >
                {item.tag}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.posts} posts
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* FOOTER LINKS */}
      <Box sx={{ px: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
        {["Privacy", "Terms", "Ads", "More"].map((link) => (
          <Typography
            key={link}
            variant="caption"
            color="text.disabled"
            sx={{ cursor: "pointer", "&:hover": { underline: "always" } }}
          >
            {link}
          </Typography>
        ))}
        <Typography variant="caption" color="text.disabled">
          © 2026 Social Media Project
        </Typography>
      </Box>
    </Stack>
  );
};

export default TrendingSidebar;
