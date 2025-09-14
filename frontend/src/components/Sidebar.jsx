import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import ArticleIcon from "@mui/icons-material/Article";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GroupIcon from "@mui/icons-material/Group";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Profile icon


const SidebarWrapper = styled(Box)(({ theme }) => ({
  [theme.breakpoints.up("md")]: {
    width: 250,
    flexShrink: 0,
    position: "fixed",
    right: 0,
    top: 64, // adjust if navbar height differs
    height: "100%",
    backgroundColor: "#111", // dark background
    color: "white",
    boxShadow: "-2px 0 10px rgba(0,0,0,0.3)",
  },
}));

function Sidebar() {
  
  const handleLogout = () => {
    // Clear saved user info
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");

    // Redirect to login/signup
    navigate("/");
  };
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(false);
  const navigate=useNavigate();
 const userId = localStorage.getItem("user_id"); 

  const menuItems = [
  { text: "Feed", icon: <HomeIcon />, path: "/home" },
  { text: "Profile", icon: <AccountCircleIcon />, path: `/profile/${userId}` },
  { text: "My Posts", icon: <ArticleIcon />, path: `/myposts/${userId}` },
  { text: "Friend Requests", icon: <FavoriteIcon />, path: `/friendrequests/${userId}` },
  { text: "Friends", icon: <GroupIcon />, path: `/friendspage/${userId}` },
    { text: "Logout", icon: <LogoutIcon />,  action:handleLogout },
];

  const drawerContent = (
    <Box sx={{
        width: 250,
        height: "100%",
        backgroundColor: "#111",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between", }}>
      <Box>
        
        <List>
          {menuItems.map((item, index) => (
            <ListItem
              button
              key={index}
              onClick={() => {
    if (item.path) {
      navigate(item.path); // if using React Router
    } else if (item.action) {
      item.action();
    }
  }}
              sx={{
                "&:hover": { backgroundColor: "rgba(245, 236, 236, 0.1)" },
              }}
            >
              <ListItemIcon sx={{ color: "#90caf9" }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ p: 2, textAlign: "center", fontSize: "0.8rem", opacity: 0.7 }}>
        © 2025 MySocialApp
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile toggle button */}
      {isMobile && (
        <IconButton
          color="inherit"
          edge="end"
          onClick={() => setOpen(true)}
          sx={{ position: "fixed", top: 16, right: 16, zIndex: 2000 }}
        >
          <MenuIcon sx={{color:"white"}}/>
        </IconButton>
      )}

      {/* Drawer for mobile */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ style: { backgroundColor: "#111", color: "white" } }}
      >
        {drawerContent}
      </Drawer>

      {/* Permanent sidebar for desktop */}
      {!isMobile && <SidebarWrapper>{drawerContent}</SidebarWrapper>}
    </>
  );
}

export default Sidebar;
