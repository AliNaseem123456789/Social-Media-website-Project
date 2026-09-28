import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, Button, Divider, IconButton, Popover, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { Bell, BellOff } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { queryKeys } from "../../../lib/queryClient";
import { notificationService } from "../services/notificationService";
import { useMarkAllRead, useMarkRead, useUnreadCount } from "../hooks";
import NotificationItem, { notificationLink } from "./NotificationItem";

function Panel({ onNavigate }) {
  const list = useInfiniteList(queryKeys.notifications("all"), (cursor) => notificationService.list({ cursor, limit: 8 }));
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const items = list.items.slice(0, 8);

  return (
    <Box sx={{ width: { xs: "calc(100vw - 24px)", sm: 380 } }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, pt: 1.75, pb: 1 }}>
        <Typography variant="subtitle1">Notifications</Typography>
        <Button size="small" onClick={() => markAll.mutate()} disabled={!items.some((n) => !n.read)}>
          Mark all read
        </Button>
      </Stack>
      <Box sx={{ maxHeight: 420, overflowY: "auto", px: 1, pb: 1 }}>
        {list.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} height={60} sx={{ mx: 1 }} />)}
        {!list.isLoading && items.length === 0 && <EmptyState compact icon={BellOff} title="You're all caught up" description="Likes, comments and requests show up here." />}
        {items.map((n) => (
          <NotificationItem
            key={n.id}
            dense
            notification={n}
            onClick={() => {
              if (!n.read) markRead.mutate(n.id);
              onNavigate(notificationLink(n));
            }}
          />
        ))}
      </Box>
      <Divider />
      <Button fullWidth onClick={() => onNavigate("/notifications")} sx={{ borderRadius: 0, py: 1.25 }}>
        View all notifications
      </Button>
    </Box>
  );
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={`Notifications${count ? `, ${count} unread` : ""}`}>
          <Badge color="primary" badgeContent={count} max={99}>
            <Bell size={20} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: 4, border: "1px solid #e7e1d5", boxShadow: "0 12px 32px -12px rgba(22,20,15,.18)" } } }}
      >
        {anchor && (
          <Panel
            onNavigate={(to) => {
              setAnchor(null);
              navigate(to);
            }}
          />
        )}
      </Popover>
    </>
  );
}
