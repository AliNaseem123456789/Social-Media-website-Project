// components/Sidebar.jsx - UPDATED WITH SESSION AUTH

import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Typography,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";

// Modern Icons
import MenuIcon from "@mui/icons-material/Menu";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import { useAuth } from "../features/auth/context/AuthContext";
import apiClient from "../api/apiClient";

const SidebarWrapper = styled(Box)(({ theme }) => ({
  [theme.breakpoints.up("md")]: {
    width: 250,
    flexShrink: 0,
    position: "fixed",
    right: 0,
    top: 64,
    height: "calc(100% - 64px)",
    backgroundColor: "white",
    color: "#1a1a1b",
    borderLeft: "1px solid rgba(0,0,0,0.08)",
    zIndex: 1000,
  },
}));

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(false);
  
  // ✅ Get user from AuthContext, NOT localStorage!
  const { user, logout } = useAuth();
  const userId = user?.id;  // ✅ From session, not localStorage

  // ✅ Updated logout using session auth
  const handleLogout = async () => {
    try {
      await apiClient.post("/logout");
      await logout(); // Clear AuthContext state
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    }
  };

  // ✅ Only show sidebar if user is logged in
  if (!userId) return null;

  const menuItems = [
    { text: "Feed", icon: <HomeRoundedIcon />, path: "/home" },
    {
      text: "Profile",
      icon: <AccountCircleRoundedIcon />,
      path: `/profile/${userId}`,  // ✅ Uses userId from session
    },
    {
      text: "My Posts",
      icon: <ArticleRoundedIcon />,
      path: `/myposts/${userId}`,  // ✅ Uses userId from session
    },
    {
      text: "Friend Requests",
      icon: <FavoriteRoundedIcon />,
      path: `/friendrequests/${userId}`,  // ✅ Uses userId from session
    },
    {
      text: "Friends",
      icon: <GroupRoundedIcon />,
      path: `/friendspage/${userId}`,  // ✅ Uses userId from session
    },
    { text: "Logout", icon: <LogoutRoundedIcon />, action: handleLogout },
  ];

  const drawerContent = (
    <Box
      sx={{
        width: 250,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="overline"
          sx={{ fontWeight: 800, color: "text.disabled", letterSpacing: 1 }}
        >
          Menu
        </Typography>
        {/* ✅ Show logged-in user info */}
        <Typography
          variant="body2"
          sx={{ mt: 1, fontWeight: 600, color: "#1877f2" }}
        >
          {user?.username}
        </Typography>
      </Box>

      <List sx={{ px: 2 }}>
        {menuItems.map((item, index) => {
          const isActive = item.path ? location.pathname === item.path : false;
          return (
            <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  if (item.path) navigate(item.path);
                  else if (item.action) item.action();
                  if (isMobile) setOpen(false);
                }}
                sx={{
                  borderRadius: "12px",
                  bgcolor: isActive ? alpha("#1877f2", 0.08) : "transparent",
                  color: isActive ? "#1877f2" : "#65676b",
                  "&:hover": {
                    bgcolor: isActive ? alpha("#1877f2", 0.12) : "#f0f2f5",
                  },
                }}
              >
                <ListItemIcon
                  sx={{ color: isActive ? "#1877f2" : "#65676b", minWidth: 40 }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 800 : 600,
                    fontSize: "0.9rem",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ mt: "auto", p: 3, opacity: 0.5 }}>
        <Typography variant="caption">© 2026 SocialApp</Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <>
          <IconButton
            onClick={() => setOpen(true)}
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 2000,
              bgcolor: "white",
              boxShadow: 2,
            }}
          >
            <MenuIcon color="primary" />
          </IconButton>
          <Drawer
            anchor="right"
            open={open}
            onClose={() => setOpen(false)}
            PaperProps={{ sx: { bgcolor: "white" } }}
          >
            {drawerContent}
          </Drawer>
        </>
      ) : (
        <SidebarWrapper>{drawerContent}</SidebarWrapper>
      )}
    </>
  );
}

export default Sidebar;