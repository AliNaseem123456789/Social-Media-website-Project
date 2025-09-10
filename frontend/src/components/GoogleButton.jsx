import React from "react";
import Button from "@mui/material/Button";
import GoogleIcon from "@mui/icons-material/Google"; // or use a custom Google SVG icon
import { styled } from "@mui/material/styles";
const StyledGoogleButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  backgroundColor: "#fff",
  color: "#000",
  border: "1px solid #ddd",
  borderRadius: "30px",
  padding: "10px 20px",
  fontWeight: 500,
  fontSize: "16px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  "&:hover": {
    backgroundColor: "#f5f5f5",
  },
}));
const GoogleButton = ({ onClick }) => {
  return (
    <StyledGoogleButton startIcon={<GoogleIcon />} onClick={onClick}>
      Continue with Google
    </StyledGoogleButton>
  );
};

export default GoogleButton;
