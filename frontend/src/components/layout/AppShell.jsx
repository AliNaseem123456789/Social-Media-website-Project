import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import SideNav, { SIDENAV_COLLAPSED, SIDENAV_WIDTH } from "./SideNav";
import TopBar from "./TopBar";
import MobileNav, { MOBILE_NAV_HEIGHT } from "./MobileNav";
import IncomingCallDialog from "./IncomingCallDialog";
import PostEditorDialog from "../../features/posts/components/PostEditorDialog";
import EmailVerificationBanner from "../../features/auth/components/EmailVerificationBanner";
import AssistantDock from "../../features/assistant/components/AssistantDock";
import { useAssistant } from "../../features/assistant/AssistantContext";

export default function AppShell() {
  const [composing, setComposing] = useState(false);
  const { pathname } = useLocation();
  const fullHeightPage = pathname.startsWith("/messages");

  // The assistant can hand over a draft it wrote. The editor is mounted here, so the handover lands here:
  // open it with the text already in the box, and clear the seed so closing and reopening is empty.
  const { seededDraft, clearSeededDraft } = useAssistant();
  const [seeded, setSeeded] = useState("");
  useEffect(() => {
    if (!seededDraft) return;
    setSeeded(seededDraft.content);
    setComposing(true);
    clearSeededDraft();
  }, [seededDraft, clearSeededDraft]);

  const closeComposer = () => {
    setComposing(false);
    setSeeded("");
  };

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
      {composing && <PostEditorDialog open initialContent={seeded} onClose={closeComposer} />}
      <IncomingCallDialog />
      <AssistantDock />
    </Box>
  );
}
