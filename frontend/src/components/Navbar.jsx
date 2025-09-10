import React from "react";
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

import MailIcon from '@mui/icons-material/Mail'; // Inbox icon
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
      const id= localStorage.getItem("user_id") || null;
      console.log("Logged in user:", username, id);
  return (
    <AppBar position="fixed" sx={{ backgroundColor: "black" }}>
      <Toolbar>
        {/* Search Bar */}
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search…"
            inputProps={{ "aria-label": "search" }}
          />
        </Search>

        {/* Buttons shifted left */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            justifyContent: "flex-start",
            ml: {xs:2,sm:5,md:15,lg:20},
            gap: 2, 
          }}
        >
          <Link to="/home" style={{textDecoration:"none",color:"white"}}>
          <Button color="inherit" startIcon={<HomeIcon />}>
            Home
          </Button>
          </Link>
          
         <Link to="/postwrite" style={{textDecoration:"none",color:"white"}}> <Button color="inherit" startIcon={<AddCircleOutlineIcon />}>Add Post</Button></Link>
          <Button color="inherit" startIcon={<MailIcon/>}>Inbox</Button>
        </Box>

        {/* Right-side placeholder (User/Avatar) */}
        <Typography variant="body1"></Typography>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
