import React from "react";
import Button from "@mui/material/Button";
import GoogleIcon from "@mui/icons-material/Google";
import { styled } from "@mui/material/styles";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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

const GoogleButton = () => {
  const navigate = useNavigate(); 

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
          const res = await axios.post("http://localhost:5000/api/google", {
            token: credentialResponse.credential,
          });
          if (res.data.success) {
            localStorage.setItem("user_id", res.data.user_id);
            localStorage.setItem("username", res.data.username);
            navigate("/home"); 
          }
        } catch (err) {
          console.error("Google login error:", err);
        }
      }}
      onError={() => {
        console.log("Google login failed ❌");
      }}
      useOneTap
      render={(renderProps) => (
        <StyledGoogleButton
          startIcon={<GoogleIcon />}
          onClick={renderProps.onClick}
          disabled={renderProps.disabled}
        >
          Continue with Google
        </StyledGoogleButton>
      )}
    />
  );
};

export default GoogleButton;
