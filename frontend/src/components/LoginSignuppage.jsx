import React, { useState } from "react";
import Navbar from "./Navbar";
import LoginPopup from "./Login";
import SignupPopup from "./Signup";
import { Button, Box, Typography } from "@mui/material";
import Particles from "react-tsparticles";
import { Typewriter } from "react-simple-typewriter";
import { motion } from "framer-motion";

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

      {/* Dark Gradient Background */}
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          zIndex: -1,
          background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
          backgroundSize: "400% 400%",
          animation: "gradientBG 20s ease infinite",
        }}
      />
      <style>
        {`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>

      {/* Particles Background */}
      <Particles
        id="tsparticles"
        options={{
          fullScreen: { enable: true },
          particles: {
            number: { value: 70, density: { enable: true, area: 900 } },
            color: { value: ["#ffffff", "#ff4d6d", "#00f0ff"] },
            shape: { type: "circle" },
            opacity: { value: 0.4 },
            size: { value: { min: 2, max: 5 } },
            move: { enable: true, speed: 1.5, direction: "none" },
          },
          interactivity: {
            events: { onHover: { enable: true, mode: "repulse" } },
            modes: { repulse: { distance: 100 } },
          },
        }}
      />

      {/* Hero Section */}
      <Box
        sx={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          color: "#fff",
          px: 3,
          overflow: "hidden",
        }}
      >
        {/* Hero Text */}
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ textShadow: "2px 2px 10px rgba(0,0,0,0.7)" }}>
            Welcome to SocialConnect
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
        >
          <Typography variant="h6" sx={{ maxWidth: 600, mb: 4 }}>
            <Typewriter
              words={[
                "Connect with friends seamlessly.",
                "Share your moments instantly.",
                "Explore content worldwide.",
              ]}
              loop={true}
              cursor
              cursorStyle="|"
              typeSpeed={70}
              deleteSpeed={50}
              delaySpeed={2000}
            />
          </Typography>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.5, duration: 1, type: "spring", stiffness: 120 }}
        >
          <Box sx={{ display: "flex", gap: 3 }}>
            <Button
              variant="contained"
              sx={{
                borderRadius: "30px",
                px: 5,
                py: 1.5,
                background: "linear-gradient(90deg, #ff4d6d, #ff9068)",
                boxShadow: "0 0 20px #ff4d6d",
                "&:hover": {
                  background: "linear-gradient(90deg, #ff9068, #ff4d6d)",
                  boxShadow: "0 0 30px #ff9068",
                },
              }}
              onClick={handleOpenLogin}
            >
              Login
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderRadius: "30px",
                px: 5,
                py: 1.5,
                borderColor: "#fff",
                color: "#fff",
                "&:hover": {
                  background: "rgba(255,255,255,0.1)",
                  borderColor: "#ff4d6d",
                  boxShadow: "0 0 15px #ff4d6d",
                },
              }}
              onClick={handleOpenSignup}
            >
              Signup
            </Button>
          </Box>
        </motion.div>

        {/* Scroll Hint */}
<motion.div
  initial={{ y: 0, opacity: 0 }}
  animate={{ y: [0, 15, 0], opacity: 1 }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
    delay: 3,
  }}
  style={{
    position: "absolute",
    bottom: 30,
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    fontSize: "2rem",
    textShadow: "1px 1px 5px rgba(0,0,0,0.5)",
    cursor: "pointer",
    zIndex: 1,
  }}
>
  ⬇️
</motion.div>

      </Box>

      {/* Parallax Sections */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <Box
          sx={{
            height: "60vh",
            background: "url('/images/social1.jpg') center/cover fixed",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            fontSize: "2rem",
            fontWeight: "bold",
            textShadow: "2px 2px 12px rgba(0,0,0,0.7)",
          }}
        >
          Discover Amazing Content
        </Box>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <Box
          sx={{
            height: "60vh",
            background: "url('/images/social2.jpg') center/cover fixed",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            fontSize: "2rem",
            fontWeight: "bold",
            textShadow: "2px 2px 12px rgba(0,0,0,0.7)",
          }}
        >
          Engage With Your Friends
        </Box>
      </motion.div>

      {/* Animated SVG Wave */}
      <Box sx={{ position: "relative", width: "100%", overflow: "hidden", lineHeight: 0 }}>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: "100%", height: 120 }}>
          <path fill="#24243e">
            <animate
              attributeName="d"
              dur="15s"
              repeatCount="indefinite"
              values="
                M0,0 C600,120 600,0 1200,100 L1200,0 L0,0 Z;
                M0,0 C600,0 600,120 1200,80 L1200,0 L0,0 Z;
                M0,0 C600,120 600,0 1200,100 L1200,0 L0,0 Z
              "
            />
          </path>
        </svg>
      </Box>

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
