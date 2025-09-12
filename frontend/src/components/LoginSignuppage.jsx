import React, { useState } from "react";
import Navbar from "./Navbar";
import LoginPopup from "./Login";
import SignupPopup from "./Signup";
import { Button, Card, CardContent, Typography, Box } from "@mui/material";

function LoginSignuppage() {
  const [openLogin, setOpenLogin] = useState(false);
  const [openSignup, setOpenSignup] = useState(false);
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #e3f2fd, #fce4ec)",
          paddingTop: "80px", // space for navbar
        }}
      >
        <Card
          sx={{
            width: "400px",
            borderRadius: "20px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
            textAlign: "center",
            backgroundColor: "white",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Welcome 👋
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Please login to continue or sign up to create a new account.
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                sx={{
                  borderRadius: "30px",
                  px: 4,
                  py: 1.2,
                  fontWeight: "bold",
                  mr: 2,
                }}
                onClick={handleOpenLogin}
              >
                Login
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                sx={{
                  borderRadius: "30px",
                  px: 4,
                  py: 1.2,
                  fontWeight: "bold",
                }}
                onClick={handleOpenSignup}
              >
                Signup
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Popups */}
      <LoginPopup
        open={openLogin}
        handleClose={() => setOpenLogin(false)}
        openSignup={handleOpenSignup}
      />
      <SignupPopup
        open={openSignup}
        handleClose={() => setOpenSignup(false)}
        openLogin={handleOpenLogin}
      />
    </>
  );
}

export default LoginSignuppage;
