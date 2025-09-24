import React, { useState } from "react";
import axios from "axios";
import GoogleButton from "./GoogleButton";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from "@mui/material";

function LoginPopup({ open, handleClose, openSignup }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "https://social-media-website-project.onrender.com/api/login",
        { email, password }
      );
      localStorage.setItem("user_id", res.data.user_id);
      localStorage.setItem("username", res.data.username);
      setMessage(res.data.message);
      if (res.data.success) {
        handleClose();
        navigate("/home");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      sx={{
        "& .MuiPaper-root": {
          borderRadius: "20px",
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "linear-gradient(135deg, #f9f9f9, #e0e0e0)",
          boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", fontWeight: "700", fontSize: "1.6rem", mb: 3 }}>
        Welcome Back
      </DialogTitle>

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Google Login */}
        <GoogleButton />

        {/* OR Divider */}
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", my: 2 }}>
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", mr: 1 }} />
          <Typography variant="body2" sx={{ color: "#888", fontWeight: "500" }}>
            OR
          </Typography>
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", ml: 1 }} />
        </Box>

        {/* Email & Password Inputs */}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          autoComplete="email"
          sx={{
            maxWidth: "360px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "25px",
              bgcolor: "#f5f5f5",
              px: 1.5,
              py: 0.5,
            },
          }}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          autoComplete="current-password"
          sx={{
            maxWidth: "360px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "25px",
              bgcolor: "#f5f5f5",
              px: 1.5,
              py: 0.5,
            },
          }}
        />

        {/* Message */}
        {message && (
          <Typography
            color={message.includes("success") ? "green" : "red"}
            sx={{ textAlign: "center", mt: 1, fontWeight: 500 }}
          >
            {message}
          </Typography>
        )}

        {/* Signup Toggle */}
        <Typography
          sx={{
            cursor: "pointer",
            color: "#1976d2",
            textAlign: "center",
            fontWeight: 500,
            mt: 1,
          }}
          onClick={() => {
            handleClose();
            openSignup();
          }}
        >
          Don’t have an account? Sign up
        </Typography>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ justifyContent: "space-between", mt: 3, width: "100%", px: 3 }}>
        <Button
          onClick={handleClose}
          color="secondary"
          sx={{ borderRadius: "20px", px: 3 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          sx={{
            borderRadius: "20px",
            px: 4,
            py: 1.2,
            textTransform: "none",
            fontWeight: 600,
            background: "linear-gradient(135deg, #42a5f5, #1e88e5)",
          }}
        >
          Login
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LoginPopup;
