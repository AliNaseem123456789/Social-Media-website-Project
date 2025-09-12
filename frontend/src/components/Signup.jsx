// SignupPopup.jsx
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
      const res = await axios.post("https://social-media-website-project.onrender.com/api/signup", {
        username,
        email,
        password,
      });
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
    openLogin(); // toggle to login
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      sx={{
        "& .MuiPaper-root": {
          borderRadius: "16px",
          bgcolor: "white",
          minHeight: "95vh",
          maxWidth: "480px",
          p: 3,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", fontWeight: "bold", mb: 2 }}>
        Signup
      </DialogTitle>

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          px: { xs: 2, sm: 4 },
          alignItems: "center",
        }}
      >
        <GoogleButton />

        {/* OR divider */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            margin: "20px 0",
            color: "#888",
            fontWeight: 500,
            fontSize: "14px",
          }}
        >
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", mr: 1 }} />
          OR
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", ml: 1 }} />
        </Box>

        <TextField
          label="Username"
          variant="outlined"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setMessage("");
          }}
          required
          sx={{
            width: "100%",
            maxWidth: "360px",
            "& .MuiOutlinedInput-root": { borderRadius: "20px", bgcolor: "#e5e5e5" },
          }}
        />

        <TextField
          label="Email"
          type="email"
          variant="outlined"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMessage("");
          }}
          required
          sx={{
            width: "100%",
            maxWidth: "360px",
            "& .MuiOutlinedInput-root": { borderRadius: "20px", bgcolor: "#e5e5e5" },
          }}
        />

        <TextField
          label="Password"
          type="password"
          variant="outlined"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setMessage("");
          }}
          required
          sx={{
            width: "100%",
            maxWidth: "360px",
            "& .MuiOutlinedInput-root": { borderRadius: "20px", bgcolor: "#e5e5e5" },
          }}
        />

        {message && (
          <Typography
            variant="body2"
            color={message.includes("success") ? "green" : "red"}
            sx={{ mt: 1, textAlign: "center" }}
          >
            {message}
          </Typography>
        )}

        {/* Toggle to Login */}
        <Typography
          sx={{ cursor: "pointer", color: "blue" }}
          onClick={handleOpenLogin}
        >
          Already have an account? Log in
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", mt: 2, gap: 2 }}>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="contained" color="primary" onClick={handleSubmit}>
          Signup
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SignupPopup;
