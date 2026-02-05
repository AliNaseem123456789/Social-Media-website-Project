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

// RESTORED: Your specific fixed positioning logic
const SidebarWrapper = styled(Box)(({ theme }) => ({
  [theme.breakpoints.up("md")]: {
    width: 250,
    flexShrink: 0,
    position: "fixed",
    right: 0, // Keeps it on the right
    top: 64, // Below the Navbar
    height: "calc(100% - 64px)",
    backgroundColor: "white", // Changed from #111 to clean white
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
  const userId = localStorage.getItem("user_id");

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    navigate("/");
  };

  const menuItems = [
    { text: "Feed", icon: <HomeRoundedIcon />, path: "/home" },
    {
      text: "Profile",
      icon: <AccountCircleRoundedIcon />,
      path: `/profile/${userId}`,
    },
    {
      text: "My Posts",
      icon: <ArticleRoundedIcon />,
      path: `/myposts/${userId}`,
    },
    {
      text: "Friend Requests",
      icon: <FavoriteRoundedIcon />,
      path: `/friendrequests/${userId}`,
    },
    {
      text: "Friends",
      icon: <GroupRoundedIcon />,
      path: `/friendspage/${userId}`,
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
      </Box>

      <List sx={{ px: 2 }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  if (item.path) navigate(item.path);
                  else if (item.action) item.action();
                  setOpen(false);
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
