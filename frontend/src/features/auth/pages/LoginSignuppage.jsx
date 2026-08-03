import "../../../components/LandingPage/landing.css";
import React, { useState } from "react";
import LoginPopup from "../../../features/auth/pages/Login";
import SignupPopup from "../../../features/auth/pages/Signup";
import { LandingNav } from "../../../components/LandingPage/LandingNav";
import { Hero } from "../../../components/LandingPage/Hero";
import { LiveTicker, StatsStrip } from "../../../components/LandingPage/ProofBar";
import { Features } from "../../../components/LandingPage/Features";
import { HowItWorks } from "../../../components/LandingPage/HowItWorks";
import { Testimonials } from "../../../components/LandingPage/Testimonials";
import { Pricing } from "../../../components/LandingPage/Pricing";
import { FAQ } from "../../../components/LandingPage/FAQ";
import { CTA } from "../../../components/LandingPage/CTA";
import { Footer } from "../../../components/LandingPage/Footer";

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
    <div className="lp-page">
      <LandingNav onLogin={handleOpenLogin} onSignup={handleOpenSignup} />
      <Hero onLogin={handleOpenLogin} onSignup={handleOpenSignup} />
      <LiveTicker />
      <StatsStrip />

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
      <Pricing />
      <FAQ />
      <CTA onLogin={handleOpenLogin} onSignup={handleOpenSignup} />
      <Footer />
    </div>
  );
}

export default LoginSignuppage;