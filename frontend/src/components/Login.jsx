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
  
  const navigate = useNavigate()
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/login", { email, password });
      localStorage.setItem("user_id", res.data.user_id);
      localStorage.setItem("username", res.data.username);
      setMessage(res.data.message);
      if (res.data.success) {
        handleClose();
        navigate("/home");

      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong ");
    }
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
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "95vh",
          maxWidth: "480px",
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", fontWeight: "bold", mb: 2 }}>
        Login
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", width: "100%" }}>
        
        <GoogleButton />

        {/* OR Divider */}
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", my: 2 }}>
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", mr: 1 }} />
          OR
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", ml: 1 }} />
        </Box>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          sx={{
            maxWidth: "360px",
            "& .MuiOutlinedInput-root": { borderRadius: "20px", bgcolor: "#e5e5e5" },
          }}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          sx={{
            maxWidth: "360px",
            "& .MuiOutlinedInput-root": { borderRadius: "20px", bgcolor: "#e5e5e5" },
          }}
        />
        {message && (
          <Typography color={message.includes("success") ? "green" : "red"} sx={{ textAlign: "center" }}>
            {message}
          </Typography>
        )}

        {/* Toggle Signup */}
        <Typography
          sx={{ cursor: "pointer", color: "blue", textAlign: "center" }}
          onClick={() => {
            handleClose();
            openSignup();
          }}
        >
          Don’t have an account? Sign up
        </Typography>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ justifyContent: "center", mt: 2, gap: 2 }}>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Login
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LoginPopup;
