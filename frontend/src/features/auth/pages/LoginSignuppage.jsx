import "../../../components/LandingPage/landing.css";
import React, { useState } from "react";
import LoginPopup from "../../../features/auth/pages/Login";
import SignupPopup from "../../../features/auth/pages/Signup";
import { Features } from "../../../components/LandingPage/Features";
import { HowItWorks } from "../../../components/LandingPage/HowItWorks";
import { Hero } from "../../../components/LandingPage/Hero";
import { Testimonials } from "../../../components/LandingPage/Testimonials";
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
      <Hero onLogin={handleOpenLogin} onSignup={handleOpenSignup} />
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
      <Features />
      <HowItWorks />
      <Testimonials />
    </>
  );
}

export default LoginSignuppage;
