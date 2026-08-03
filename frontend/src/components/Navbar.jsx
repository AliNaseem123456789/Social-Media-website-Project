import React, { useState, useEffect } from "react";
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
  GlobalStyles,
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { searchService } from "../features/search/services/SearchService";
import NotificationBell from "./NotificationBell";

/* ---------------------------------------------------------------------
   Circle brand tokens — identical to landing.css / FriendsPage / WritePost
   so the app shell doesn't shift identity between the marketing site and
   the logged-in product.
   ------------------------------------------------------------------ */
const T = {
  paper: "#faf8f4",
  surface: "#ffffff",
  ink: "#16140f",
  inkSoft: "#58534a",
  inkFaint: "#948d80",
  line: "#e7e1d5",
  ember: "#e0431f",
  emberInk: "#7c2410",
  emberTint: "#fce6dd",
  fontDisplay: `"Fraunces", "Iowan Old Style", serif`,
  fontBody: `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`,
};

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!query || query.trim().length < 2) {
        setResults([]);
        return;
      }
      try {
        const data = await searchService.searchUsers(query);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
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

  const handleSearch = (e) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setResults([]);
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "rgba(250, 248, 244, 0.86)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.line}`,
        zIndex: 1201,
        fontFamily: T.fontBody,
      }}
    >
      <GlobalStyles
        styles={{
          "@import":
            "url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Inter:wght@400;500;600;700;800&display=swap')",
        }}
      />
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: "space-between", minHeight: "64px !important" }}>
          {/* 1. Left Section: Logo & Search */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              component={Link}
              to="/home"
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 1,
                mr: 3,
                textDecoration: "none",
              }}
            >
              <Box
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: "3px",
                  bgcolor: T.ember,
                  transform: "rotate(45deg)",
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: T.fontDisplay,
                  fontWeight: 600,
                  fontSize: "1.4rem",
                  letterSpacing: "-0.01em",
                  color: T.ink,
                }}
              >
                Circle
              </Typography>
            </Box>

            <Box sx={{ position: "relative" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  bgcolor: T.paper,
                  border: `1px solid ${T.line}`,
                  borderRadius: "999px",
                  px: 2,
                  py: 0.9,
                  width: { xs: "auto", sm: "26ch" },
                  transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                  "&:focus-within": {
                    borderColor: T.ink,
                    boxShadow: `0 0 0 3px ${T.emberTint}`,
                  },
                }}
              >
                <SearchRoundedIcon sx={{ color: T.inkFaint, fontSize: 19, mr: 1 }} />
                <InputBase
                  placeholder="Search network"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  sx={{ fontSize: "0.9rem", fontFamily: T.fontBody, color: T.ink, width: "100%" }}
                />
              </Box>

              {results.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    position: "absolute",
                    top: "50px",
                    left: 0,
                    right: 0,
                    borderRadius: "16px",
                    border: `1px solid ${T.line}`,
                    boxShadow: "0 20px 40px -20px rgba(22,20,15,0.25)",
                    overflow: "hidden",
                    zIndex: 1000,
                    bgcolor: T.surface,
                  }}
                >
                  <List sx={{ p: 0 }}>
                    {results.map((user) => (
                      <ListItem
                        button
                        key={user.id}
                        onClick={() => {
                          setQuery("");
                          setResults([]);
                          navigate(`/profile/${user.id}`);
                        }}
                        sx={{ "&:hover": { bgcolor: T.paper } }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: T.ember,
                              fontSize: "0.8rem",
                              fontFamily: T.fontDisplay,
                              fontWeight: 600,
                            }}
                          >
                            {user.username?.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.username}
                          primaryTypographyProps={{ fontWeight: 600, fontSize: "0.9rem", color: T.ink }}
                        />
                      </ListItem>
                    ))}
                    <ListItem
                      button
                      onClick={() => {
                        const searchTerm = query;
                        setQuery("");
                        setResults([]);
                        navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                      }}
                      sx={{ justifyContent: "center", bgcolor: T.paper }}
                    >
                      <Typography variant="body2" sx={{ color: T.emberInk, fontWeight: 700 }}>
                        View all results for "{query}" →
                      </Typography>
                    </ListItem>
                  </List>
                </Paper>
              )}
            </Box>
          </Box>

          {/* 2. Middle Section: Nav Icons */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <NavBtn to="/home" icon={<HomeRoundedIcon />} active={location.pathname === "/home"} />
            <NavBtn to="/postwrite" icon={<AddCircleRoundedIcon />} active={location.pathname === "/postwrite"} />
            <NotificationBell />
          </Box>

          {/* 3. Right Section: Logout */}
          <Button
            onClick={handleLogout}
            startIcon={<LogoutRoundedIcon />}
            sx={{
              borderRadius: "999px",
              color: T.inkSoft,
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.85rem",
              px: 2,
              "&:hover": { color: T.emberInk, bgcolor: T.emberTint },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

const NavBtn = ({ to, icon, active }) => (
  <Button
    component={Link}
    to={to}
    sx={{
      minWidth: "44px",
      borderRadius: "999px",
      color: active ? "#e0431f" : "#58534a",
      bgcolor: active ? "#fce6dd" : "transparent",
      "&:hover": { bgcolor: active ? "#f6d4c4" : "#faf8f4" },
      px: 1.75,
    }}
  >
    {icon}
  </Button>
);

export default Navbar;