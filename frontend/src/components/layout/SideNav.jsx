import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge, Box, Button, Stack, Tooltip } from "@mui/material";
import { Plus } from "lucide-react";
import Logo from "../ui/Logo";
import UserMenu from "./UserMenu";
import { navItems } from "./navItems";
import { useAuth } from "../../features/auth/context/AuthContext";
import { useUnreadCount } from "../../features/notifications/hooks";
import { friendsService } from "../../features/friends/services/friendsService";
import { chatService } from "../../features/messages/services/chatService";
import { moderationService } from "../../features/moderation/services/moderationService";
import { queryKeys } from "../../lib/queryClient";
import { tokens } from "../../theme/tokens";

export const SIDENAV_WIDTH = 256;
export const SIDENAV_COLLAPSED = 80;

export default function SideNav({ onCompose }) {
  const { user } = useAuth();
  const unread = useUnreadCount();
  const requests = useQuery({ queryKey: queryKeys.friendRequests("incoming"), queryFn: () => friendsService.requests("incoming"), staleTime: 60_000 });
  const messages = useQuery({ queryKey: queryKeys.chatUnread, queryFn: () => chatService.unread(), staleTime: 30_000 });
  const access = useQuery({ queryKey: queryKeys.moderatorAccess, queryFn: () => moderationService.access(), staleTime: 10 * 60_000 });
  const moderator = Boolean(access.data?.moderator);
  const reports = useQuery({
    queryKey: queryKeys.reports("open"),
    queryFn: () => moderationService.reports({ status: "open", limit: 1 }),
    enabled: moderator,
    staleTime: 60_000,
  });
  const badges = {
    notifications: unread.data?.count ?? 0,
    friendRequests: requests.data?.length ?? 0,
    messages: messages.data?.total ?? 0,
    reports: reports.data?.openCount ?? 0,
  };

  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        position: "fixed",
        inset: "0 auto 0 0",
        width: { md: SIDENAV_COLLAPSED, lg: SIDENAV_WIDTH },
        borderRight: `1px solid ${tokens.line}`,
        bgcolor: tokens.paper,
        px: { md: 1.5, lg: 2 },
        py: 2.5,
        zIndex: 20,
      }}
    >
      <Box sx={{ px: { md: 1.25, lg: 1.5 }, mb: 3 }}>
        <Box sx={{ display: { md: "none", lg: "block" } }}>
          <Logo to="/home" size={21} />
        </Box>
        <Box sx={{ display: { md: "block", lg: "none" } }}>
          <Logo to="/home" size={21} compact />
        </Box>
      </Box>

      <Stack spacing={0.5} sx={{ flex: 1 }}>
        {navItems(user?.id, { moderator }).map(({ to, label, icon: Icon, badge }) => (
          <Tooltip key={to} title={label} placement="right" disableHoverListener={false} slotProps={{ tooltip: { sx: { display: { lg: "none" } } } }}>
            <Box
              component={NavLink}
              to={to}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                px: 1.5,
                py: 1.15,
                borderRadius: 3,
                color: tokens.inkSoft,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.93rem",
                justifyContent: { md: "center", lg: "flex-start" },
                transition: "background-color .15s, color .15s",
                "&:hover": { bgcolor: tokens.wash.ink, color: tokens.ink },
                "&.active": { bgcolor: tokens.surface, color: tokens.ink, boxShadow: `inset 0 0 0 1px ${tokens.line}` },
                "&.active svg": { color: tokens.ember },
              }}
            >
              <Badge color="primary" badgeContent={badge ? badges[badge] : 0} max={99}>
                <Icon size={21} strokeWidth={1.9} />
              </Badge>
              <Box component="span" sx={{ display: { md: "none", lg: "inline" } }}>
                {label}
              </Box>
            </Box>
          </Tooltip>
        ))}

        <Box sx={{ pt: 2 }}>
          <Button fullWidth variant="contained" size="large" onClick={onCompose} sx={{ display: { md: "none", lg: "flex" } }} startIcon={<Plus size={18} />}>
            New post
          </Button>
          <Tooltip title="New post" placement="right">
            <Button variant="contained" onClick={onCompose} aria-label="New post" sx={{ display: { md: "flex", lg: "none" }, minWidth: 0, width: 48, height: 48, mx: "auto", p: 0 }}>
              <Plus size={20} />
            </Button>
          </Tooltip>
        </Box>
      </Stack>

      <Box sx={{ display: { md: "none", lg: "block" } }}>
        <UserMenu />
      </Box>
      <Box sx={{ display: { md: "flex", lg: "none" }, justifyContent: "center" }}>
        <UserMenu compact />
      </Box>
    </Box>
  );
}
