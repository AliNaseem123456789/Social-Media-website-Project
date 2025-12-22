import React, { useState } from "react";
import LoginPopup from "./Login";
import SignupPopup from "./Signup";

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
      {/* Example buttons (optional – you can remove these if handled elsewhere) */}
      <button onClick={handleOpenLogin}>Login</button>
      <button onClick={handleOpenSignup}>Signup</button>

      {/* LOGIN POPUP */}
      <LoginPopup
        open={openLogin}
        handleClose={() => setOpenLogin(false)}
        openSignup={handleOpenSignup}
      />

      {/* SIGNUP POPUP */}
      <SignupPopup
        open={openSignup}
        handleClose={() => setOpenSignup(false)}
        openLogin={handleOpenLogin}
      />
    </>
  );
}

export default LoginSignuppage;
