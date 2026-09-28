import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Divider, ListItemIcon, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";
import { useAuth } from "../../features/auth/context/AuthContext";
import { tokens } from "../../theme/tokens";

export default function UserMenu({ compact = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const go = (to) => {
    setAnchor(null);
    navigate(to);
  };

  return (
    <>
      <Box
        component="button"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Account menu"
        sx={{
          all: "unset",
          boxSizing: "border-box",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          width: compact ? "auto" : "100%",
          p: compact ? 0.25 : 1,
          borderRadius: 3,
          "&:hover": { bgcolor: compact ? "transparent" : tokens.wash.ink },
          "&:focus-visible": { outline: `2px solid ${tokens.ink}` },
        }}
      >
        <UserAvatar user={user} size={compact ? 34 : 38} />
        {!compact && (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 650, fontSize: "0.9rem" }}>
                {user?.username}
              </Typography>
              <Typography noWrap variant="caption" component="p">
                {user?.email}
              </Typography>
            </Box>
            <ChevronsUpDown size={16} color={tokens.inkFaint} />
          </>
        )}
      </Box>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: compact ? "bottom" : "top", horizontal: compact ? "right" : "left" }}
        transformOrigin={{ vertical: compact ? "top" : "bottom", horizontal: compact ? "right" : "left" }}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        <Stack sx={{ px: 1.5, py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{user?.username}</Typography>
          <Typography variant="caption">{user?.email}</Typography>
        </Stack>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => go(`/u/${user?.id}`)}>
          <ListItemIcon><UserRound size={17} /></ListItemIcon>
          Your profile
        </MenuItem>
        <MenuItem onClick={() => go("/settings")}>
          <ListItemIcon><Settings size={17} /></ListItemIcon>
          Settings
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={async () => {
            setAnchor(null);
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          <ListItemIcon><LogOut size={17} /></ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}
