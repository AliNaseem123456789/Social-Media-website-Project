import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { env } from "./config/env";
import { queryClient } from "./lib/queryClient";
import { ColorModeProvider } from "./context/ColorModeContext";
import { AuthProvider } from "./features/auth/context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastProvider } from "./context/ToastContext";
import App from "./App";

function GoogleProvider({ children }) {
  if (!env.googleClientId) return children;
  return <GoogleOAuthProvider clientId={env.googleClientId}>{children}</GoogleOAuthProvider>;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ColorModeProvider>
      <QueryClientProvider client={queryClient}>
        <GoogleProvider>
          <ToastProvider>
            <AuthProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </AuthProvider>
          </ToastProvider>
        </GoogleProvider>
      </QueryClientProvider>
    </ColorModeProvider>
  </StrictMode>,
);
