import React, { useState, useEffect } from "react";
import axios from "axios";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { Link } from "react-router-dom";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import HomeIcon from "@mui/icons-material/Home";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(2),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "25ch",
    },
  },
}));

function Navbar() {
  const username = localStorage.getItem("username") || "User";
  const id = localStorage.getItem("user_id") || null;
  console.log("Logged in user:", username, id);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // Fetch users when query changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await axios.get(
          `https://social-media-website-project.onrender.com/search-users?q=${query}`
        );
        setResults(res.data);
      } catch (err) {
        console.error("❌ Search error:", err);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 300); // debounce API calls

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <AppBar position="fixed" sx={{ backgroundColor: "black" }}>
      <Toolbar sx={{ position: "relative", width: "100%" }}>
        {/* Search Bar */}
        <Box sx={{ position: "relative", width: "25ch" }}>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search users…"
              inputProps={{ "aria-label": "search" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Search>
{/* Dropdown Results */}
{results.length > 0 && (
  <Paper
    sx={{
      position: "absolute",
      top: "40px",
      left: 0,
      right: 0,
      zIndex: 1000,
      maxHeight: "200px",
      overflowY: "auto",
    }}
  >
    <List>
      {results.map((user) => (
        <ListItem
          key={user.id}
          button
          onClick={() => navigate(`/profile/${user.id}`)}  // 👈 navigate to profile
        >
          <ListItemText
            primary={user.username}
            secondary={user.email}
          />
        </ListItem>
      ))}
    </List>
  </Paper>
)}
        </Box>

        {/* Buttons shifted left */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            justifyContent: "flex-start",
            ml: { xs: 0, sm: 0, md: 15, lg: 18 },
            gap: 2,
          }}
        >
          <Link
            to="/home"
            style={{ textDecoration: "none", color: "white", ml: "5px" }}
          >
            <Button color="inherit" startIcon={<HomeIcon />}>
              Home
            </Button>
          </Link>

          <Link to="/postwrite" style={{ textDecoration: "none", color: "white" }}>
            <Button color="inherit" startIcon={<AddCircleOutlineIcon />}>
              Add Post
            </Button>
          </Link>
        </Box>

        {/* Right-side placeholder (User/Avatar) */}
        <Typography variant="body1"></Typography>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
