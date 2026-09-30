import { Badge, Box, Tooltip } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import AssistantAvatar from "./AssistantAvatar";
import AssistantPanel from "./AssistantPanel";
import { useAssistant } from "../AssistantContext";
import { MOBILE_NAV_HEIGHT } from "../../../components/layout/MobileNav";
import { tokens } from "../../../theme/tokens";

/**
 * The floating robot, and the panel it opens.
 *
 * It sits above the mobile nav rather than over it, because a button that covers Home is a button people
 * resent. On a phone the panel takes the whole screen — a 390px panel inside a 390px viewport is a
 * cramped joke.
 */
export default function AssistantDock() {
  const { enabled, open, show, status, unseen } = useAssistant();

  // No assistant service configured: no button. Better than a button that apologises when pressed.
  if (!enabled) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 12, sm: 20 },
        bottom: { xs: `${MOBILE_NAV_HEIGHT + 12}px`, md: 20 },
        zIndex: (theme) => theme.zIndex.drawer + 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
      }}
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "bottom right" }}
          >
            <AssistantPanel />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Hidden while open on a phone, where the panel is the whole screen and the button would sit on top
          of the text input. */}
      <Box sx={{ display: open ? { xs: "none", sm: "block" } : "block" }}>
        <Tooltip title={open ? "Hide the assistant" : "Ask the assistant"} placement="left">
          <Badge
            color="error"
            badgeContent={unseen}
            invisible={open || !unseen}
            overlap="circular"
            sx={{ "& .MuiBadge-badge": { fontSize: 10, minWidth: 16, height: 16 } }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => show(!open)}
              aria-label={open ? "Hide the assistant" : "Ask the assistant"}
              aria-expanded={open}
              sx={{
                p: 0,
                border: `1px solid ${tokens.line}`,
                borderRadius: "50%",
                width: 62,
                height: 62,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                bgcolor: tokens.surface,
                boxShadow: tokens.shadow.raised,
                transition: "transform 140ms ease, box-shadow 140ms ease",
                "&:hover": { transform: "translateY(-2px)", boxShadow: tokens.shadow.ember },
                "&:focus-visible": { outline: `2px solid ${tokens.ember}`, outlineOffset: 2 },
                "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:hover": { transform: "none" } },
              }}
            >
              <AssistantAvatar state={open ? "idle" : status} size={54} />
            </Box>
          </Badge>
        </Tooltip>
      </Box>
    </Box>
  );
}
