import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import SideNav, { SIDENAV_COLLAPSED, SIDENAV_WIDTH } from "./SideNav";
import TopBar from "./TopBar";
import MobileNav, { MOBILE_NAV_HEIGHT } from "./MobileNav";
import IncomingCallDialog from "./IncomingCallDialog";
import PostEditorDialog from "../../features/posts/components/PostEditorDialog";
import EmailVerificationBanner from "../../features/auth/components/EmailVerificationBanner";

export default function AppShell() {
  const [composing, setComposing] = useState(false);
  const { pathname } = useLocation();
  const fullHeightPage = pathname.startsWith("/messages");

  return (
    <Box sx={{ minHeight: "100dvh" }}>
      <SideNav onCompose={() => setComposing(true)} />
      <Box sx={{ pl: { md: `${SIDENAV_COLLAPSED}px`, lg: `${SIDENAV_WIDTH}px` } }}>
        <TopBar />
        <Box component="main" sx={{ maxWidth: 1080, mx: "auto", px: { xs: 1.5, sm: 3 }, pt: 3, pb: { xs: `${MOBILE_NAV_HEIGHT + 24}px`, md: 6 } }}>
          {!fullHeightPage && <EmailVerificationBanner />}
          <Outlet />
        </Box>
      </Box>
      <MobileNav onCompose={() => setComposing(true)} />
      {composing && <PostEditorDialog open onClose={() => setComposing(false)} />}
      <IncomingCallDialog />
    </Box>
  );
}
