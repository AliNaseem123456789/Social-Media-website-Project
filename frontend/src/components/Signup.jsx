import React, { useState } from "react";
import axios from "axios";
import GoogleButton from "./GoogleButton";
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

function SignupPopup({ open, handleClose, openLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordRegex = /^[A-Za-z]\w{7,14}$/;
    if (!passwordRegex.test(password)) {
      setMessage(
        "Password must be 8–15 chars, start with a letter, only letters/numbers/_"
      );
      return;
    }

    try {
      const res = await axios.post(
        "https://social-media-website-project.onrender.com/api/signup",
        { username, email, password }
      );
      setMessage(res.data.message);
      if (res.data.success) {
        handleClose();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong ❌");
    }
  };

  const handleOpenLogin = () => {
    handleClose();
    openLogin();
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
      <DialogTitle
        sx={{ textAlign: "center", fontWeight: "700", fontSize: "1.6rem", mb: 3 }}
      >
        Create Account
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
        {/* Google Signup */}
        <GoogleButton />

        {/* OR Divider */}
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", my: 2 }}>
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", mr: 1 }} />
          <Typography variant="body2" sx={{ color: "#888", fontWeight: 500 }}>
            OR
          </Typography>
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", ml: 1 }} />
        </Box>

        {/* Input Fields */}
        <TextField
          label="Username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setMessage(""); }}
          required
          fullWidth
          autoComplete="username"
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
          label="Email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setMessage(""); }}
          required
          fullWidth
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
          onChange={(e) => { setPassword(e.target.value); setMessage(""); }}
          required
          fullWidth
          autoComplete="new-password"
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
            sx={{ mt: 1, textAlign: "center", fontWeight: 500 }}
          >
            {message}
          </Typography>
        )}

        {/* Toggle to Login */}
        <Typography
          sx={{
            cursor: "pointer",
            color: "#1976d2",
            textAlign: "center",
            fontWeight: 500,
            mt: 1,
          }}
          onClick={handleOpenLogin}
        >
          Already have an account? Log in
        </Typography>
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          justifyContent: "space-between",
          mt: 3,
          width: "100%",
          px: 3,
        }}
      >
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
          Signup
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SignupPopup;
