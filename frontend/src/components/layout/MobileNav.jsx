import { NavLink } from "react-router-dom";
import { Box } from "@mui/material";
import { Compass, House, MessagesSquare, Plus, Users } from "lucide-react";
import { tokens } from "../../theme/tokens";

const ITEMS = [
  { to: "/home", label: "Home", icon: House },
  { to: "/search", label: "Explore", icon: Compass },
  { compose: true, label: "New post", icon: Plus },
  { to: "/messages", label: "Messages", icon: MessagesSquare },
  { to: "/friends", label: "Friends", icon: Users },
];

export const MOBILE_NAV_HEIGHT = 64;

export default function MobileNav({ onCompose }) {
  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        display: { xs: "flex", md: "none" },
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: MOBILE_NAV_HEIGHT,
        pb: "env(safe-area-inset-bottom)",
        bgcolor: `color-mix(in srgb, ${tokens.paper} 94%, transparent)`,
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${tokens.line}`,
        zIndex: 20,
        justifyContent: "space-around",
        alignItems: "center",
      }}
    >
      {ITEMS.map(({ to, label, icon: Icon, compose }) =>
        compose ? (
          <Box
            key={label}
            component="button"
            onClick={onCompose}
            aria-label={label}
            sx={{ border: 0, width: 46, height: 46, borderRadius: "50%", bgcolor: tokens.ember, color: tokens.onInk, display: "grid", placeItems: "center", boxShadow: tokens.shadow.ember, cursor: "pointer" }}
          >
            <Icon size={22} />
          </Box>
        ) : (
          <Box
            key={to}
            component={NavLink}
            to={to}
            aria-label={label}
            sx={{ display: "grid", placeItems: "center", width: 52, height: 44, borderRadius: 3, color: tokens.inkFaint, "&.active": { color: tokens.ink } }}
          >
            <Icon size={22} strokeWidth={1.9} />
          </Box>
        ),
      )}
    </Box>
  );
}
