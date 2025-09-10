// // AuthModals.jsx
// import React, { useState } from "react";
// import LoginPopup from "./LoginPopup";
// import SignupPopup from "./SignupPopup";
// import { Button } from "@mui/material";

// export default function AuthModals() {
//   const [openLogin, setOpenLogin] = useState(false);
//   const [openSignup, setOpenSignup] = useState(false);

//   return (
//     <div>
//       {/* Buttons for testing */}
//       <Button onClick={() => setOpenLogin(true)} variant="contained" sx={{ mr: 2 }}>
//         Open Login
//       </Button>
//       <Button onClick={() => setOpenSignup(true)} variant="outlined">
//         Open Signup
//       </Button>

//       {/* Login Popup */}
//       <LoginPopup
//         open={openLogin}
//         handleClose={() => setOpenLogin(false)}
//         openSignup={() => setOpenSignup(true)}
//       />

//       {/* Signup Popup */}
//       <SignupPopup
//         open={openSignup}
//         handleClose={() => setOpenSignup(false)}
//         openLogin={() => setOpenLogin(true)}
//       />
//     </div>
//   );
// }
