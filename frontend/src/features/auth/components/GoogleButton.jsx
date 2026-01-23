import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
const GoogleButton = () => {
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse) => {
    try {
      const data = await authService.googleLogin(credentialResponse.credential);

      if (data.success) {
        navigate("/home");
      }
    } catch (err) {
      console.error("Google login service error:", err);
    }
  };

  const handleError = () => {
    console.error("Google Login Failed");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap
        theme="outline"
        shape="pill"
        size="large"
        // Note: Custom 'render' props are no longer supported in @react-oauth/google
      />
    </div>
  );
};

export default GoogleButton;
