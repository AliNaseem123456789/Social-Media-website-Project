import React, { useState } from "react";
import GoogleButton from "../components/GoogleButton";
import { authService } from "../services/authService";
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
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const data = await authService.signup(username, email, password);
      setMessage(data.message);
      if (data.success) {
        setTimeout(() => handleClose(), 1500);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Something went wrong";
      setMessage(errorMsg);
    } finally {
      setLoading(false);
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
          background: "linear-gradient(135deg, #f9f9f9, #e0e0e0)",
          boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: "700",
          fontSize: "1.6rem",
          mb: 3,
        }}
      >
        Create Account
      </DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          alignItems: "center",
        }}
      >
        <GoogleButton />
        <Box
          sx={{ display: "flex", alignItems: "center", width: "100%", my: 2 }}
        >
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", mr: 1 }} />
          <Typography variant="body2" sx={{ color: "#888", fontWeight: 500 }}>
            OR
          </Typography>
          <Box sx={{ flex: 1, height: "1px", bgcolor: "#ccc", ml: 1 }} />
        </Box>
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "25px",
              bgcolor: "#f5f5f5",
            },
          }}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "25px",
              bgcolor: "#f5f5f5",
            },
          }}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "25px",
              bgcolor: "#f5f5f5",
            },
          }}
        />
        {message && (
          <Typography
            color={message.includes("success") ? "green" : "red"}
            sx={{ textAlign: "center", mt: 1, fontWeight: 500 }}
          >
            {message}
          </Typography>
        )}
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
            openLogin();
          }}
        >
          Already have an account? Log in
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", mt: 3, px: 3 }}>
        <Button
          onClick={handleClose}
          color="secondary"
          sx={{ borderRadius: "20px" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={loading}
          onClick={handleSubmit}
          sx={{
            borderRadius: "20px",
            px: 4,
            fontWeight: 600,
            background: "linear-gradient(135deg, #42a5f5, #1e88e5)",
          }}
        >
          {loading ? "Creating..." : "Signup"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
export default SignupPopup;
