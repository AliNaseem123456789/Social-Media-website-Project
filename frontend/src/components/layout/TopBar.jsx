import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, IconButton, InputAdornment, Stack, TextField, Tooltip } from "@mui/material";
import { Search, WifiOff } from "lucide-react";
import Logo from "../ui/Logo";
import UserMenu from "./UserMenu";
import NotificationBell from "../../features/notifications/components/NotificationBell";
import { useSocket } from "../../context/SocketContext";
import { tokens } from "../../theme/tokens";

export default function TopBar() {
  const navigate = useNavigate();
  const { connected } = useSocket();
  const [term, setTerm] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const q = term.trim();
    if (q.length >= 2) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 15,
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: { xs: 2, sm: 3 },
        bgcolor: `color-mix(in srgb, ${tokens.paper} 85%, transparent)`,
        backdropFilter: "saturate(180%) blur(12px)",
        borderBottom: `1px solid ${tokens.line}`,
      }}
    >
      <Box sx={{ display: { md: "none" } }}>
        <Logo to="/home" size={19} />
      </Box>

      <Box component="form" onSubmit={submit} sx={{ flex: 1, maxWidth: 440, display: { xs: "none", sm: "block" } }}>
        <TextField
          size="small"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search people and posts"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={17} />
                </InputAdornment>
              ),
              sx: { borderRadius: 999, bgcolor: tokens.surface },
            },
            htmlInput: { "aria-label": "Search" },
          }}
        />
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ ml: "auto", alignItems: "center" }}>
        {!connected && (
          <Tooltip title="Reconnecting to live updates">
            <Box sx={{ color: tokens.inkFaint, display: "flex", px: 1 }}>
              <WifiOff size={17} />
            </Box>
          </Tooltip>
        )}
        <IconButton sx={{ display: { sm: "none" } }} onClick={() => navigate("/search")} aria-label="Search">
          <Search size={20} />
        </IconButton>
        <NotificationBell />
        <Box sx={{ display: { md: "none" }, pl: 0.5 }}>
          <UserMenu compact />
        </Box>
      </Stack>
    </Box>
  );
}
