import "./LandingPage/landing.css";
import React, { useState } from "react";
import LoginPopup from "./Login";
import SignupPopup from "./Signup";
import { Features } from "./LandingPage/Features";
import { HowItWorks } from "./LandingPage/HowItWorks";
import { Hero } from "./LandingPage/Hero";
import { Testimonials } from "./LandingPage/Testimonials";
import { Footer } from "./LandingPage/Footer";
// import Navbar from "./Navbar";

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
    {/* <Navbar/> */}
      {/* Hero section with buttons triggering login/signup popups */}
      <Hero
        onLogin={handleOpenLogin}
        onSignup={handleOpenSignup}
      />

      {/* LOGIN POPUP */}
      <LoginPopup
        open={openLogin}
        handleClose={() => setOpenLogin(false)}
        openSignup={handleOpenSignup}
      />

      {/* SIGNUP POPUP */}
      <SignupPopup
        open={openSignup}
        handleClose={() => setOpenSignup(false)}
        openLogin={handleOpenLogin}
      />

      {/* Rest of landing page sections */}
      <Features />
      <HowItWorks />
      <Testimonials />
    </>
  );
}

export default LoginSignuppage;
