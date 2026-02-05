import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  InputBase,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Container,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

// Modern Search Styling
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: "12px",
  backgroundColor: "#f0f2f5",
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: "#e4e6e9",
  },
  marginRight: theme.spacing(2),
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    width: "28ch",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  display: "flex",
  alignItems: "center",
  color: "#65676b",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "#1c1e21",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    fontSize: "0.95rem",
  },
}));

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await axios.get(
          `https://social-media-website-project.onrender.com/search-users?q=${query}`,
        );
        setResults(res.data);
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    const delayDebounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  const hideOnPaths = ["/", "/register", "/login"];
  if (hideOnPaths.includes(location.pathname)) return null;

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "rgba(255, 255, 255, 0.8)", // Glass effect
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
        zIndex: 1201,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
          {/* 1. Left Section: Logo & Search */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: "#1877f2",
                mr: 3,
                letterSpacing: "-1.5px",
                display: { xs: "none", md: "block" },
              }}
            >
              Social
            </Typography>

            <Box sx={{ position: "relative" }}>
              <Search>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search network..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Search>

              {/* Search Results Dropdown */}
              {results.length > 0 && (
                <Paper
                  elevation={4}
                  sx={{
                    position: "absolute",
                    top: "50px",
                    left: 0,
                    right: 0,
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <List sx={{ p: 0 }}>
                    {results.map((user) => (
                      <ListItem
                        button
                        key={user.id}
                        onClick={() => {
                          setQuery("");
                          navigate(`/profile/${user.id}`);
                        }}
                        sx={{ "&:hover": { bgcolor: "#f0f2f5" } }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{ bgcolor: "#1877f2", fontSize: "0.8rem" }}
                          >
                            {user.username?.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.username}
                          primaryTypographyProps={{
                            fontWeight: 600,
                            fontSize: "0.9rem",
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          </Box>

          {/* 2. Middle Section: Nav Icons */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <NavBtn
              to="/home"
              icon={<HomeRoundedIcon />}
              active={location.pathname === "/home"}
            />
            <NavBtn
              to="/postwrite"
              icon={<AddCircleRoundedIcon />}
              active={location.pathname === "/postwrite"}
            />
          </Box>

          {/* 3. Right Section: Logout */}
          <Button
            onClick={handleLogout}
            startIcon={<LogoutRoundedIcon />}
            sx={{
              borderRadius: "10px",
              color: "#65676b",
              textTransform: "none",
              fontWeight: 700,
              "&:hover": { color: "#f02849", bgcolor: "#fce9eb" },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

// Helper component for cleaner Buttons
const NavBtn = ({ to, icon, active }) => (
  <Button
    component={Link}
    to={to}
    sx={{
      minWidth: "50px",
      borderRadius: "12px",
      color: active ? "#1877f2" : "#65676b",
      bgcolor: active ? alpha("#1877f2", 0.1) : "transparent",
      "&:hover": { bgcolor: active ? alpha("#1877f2", 0.15) : "#f0f2f5" },
      px: 2,
    }}
  >
    {icon}
  </Button>
);

export default Navbar;
