import React, { useState } from "react";
import Navbar from "./Navbar";
import LoginPopup from "./Login";
import SignupPopup from "./Signup";
import { Button } from "@mui/material";

function LoginSignuppage() {
  const [openLogin, setOpenLogin] = useState(false);
  const [openSignup, setOpenSignup] = useState(false);
  

  // Functions to toggle modals
  const handleOpenLogin = () => {
    setOpenSignup(false);
    setOpenLogin(true);
  };

  const handleOpenSignup = () => {
    setOpenLogin(false);
    setOpenSignup(true);
  };

  return (
    <>
      <Navbar />
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Welcome! Please login or signup</h2>
        <div style={{ marginTop: "20px" }}>
          <Button
            variant="contained"
            color="primary"
            sx={{ margin: "0 10px" }}
            onClick={handleOpenLogin}
          >
            Login
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            sx={{ margin: "0 10px" }}
            onClick={handleOpenSignup}
          >
            Signup
          </Button>
        </div>
      </div>

      {/* Popups with cross-toggle functions */}
      <LoginPopup
        open={openLogin}
        handleClose={() => setOpenLogin(false)}
        openSignup={handleOpenSignup} // pass function to open signup
      />
      <SignupPopup
        open={openSignup}
        handleClose={() => setOpenSignup(false)}
        openLogin={handleOpenLogin} // pass function to open login
      />
    </>
  );
}

export default LoginSignuppage;
