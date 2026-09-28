import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, Divider, Skeleton, Stack, Tab, Tabs } from "@mui/material";
import { BellOff, CheckCheck } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import InfiniteSentinel from "../../../components/ui/InfiniteSentinel";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { tokens } from "../../../theme/tokens";
import { notificationService } from "../services/notificationService";
import { useMarkAllRead, useMarkRead, useUnreadCount } from "../hooks";
import NotificationItem, { notificationLink } from "../components/NotificationItem";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  useDocumentTitle("Notifications");
  const list = useInfiniteList(queryKeys.notifications(filter), (cursor) =>
    notificationService.list({ cursor, limit: 20, ...(filter === "unread" ? { unread: true } : {}) }),
  );
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unreadCount = unread.data?.count ?? 0;

  const open = (notification) => {
    if (!notification.read) markRead.mutate(notification.id);
    navigate(notificationLink(notification));
  };

  return (
    <ContentLayout>
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        subtitle={unreadCount ? `${unreadCount} waiting for you` : "Everything you've seen already"}
        actions={
          <Button
            variant="outlined"
            startIcon={<CheckCheck size={16} />}
            onClick={() => markAll.mutate()}
            disabled={!unreadCount || markAll.isPending}
          >
            Mark all as read
          </Button>
        }
      />
      <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 2, borderBottom: `1px solid ${tokens.line}` }}>
        <Tab value="all" label="All" />
        <Tab
          value="unread"
          label={
            <Badge
              color="primary"
              badgeContent={unreadCount}
              max={99}
              sx={{ pr: unreadCount ? 1.75 : 0, "& .MuiBadge-badge": { right: 4, top: 10 } }}
            >
              Unread
            </Badge>
          }
        />
      </Tabs>
      <Card sx={{ p: 1 }}>
        {list.isLoading && (
          <Stack spacing={1} sx={{ p: 1 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={64} />
            ))}
          </Stack>
        )}
        {!list.isLoading && list.items.length === 0 && (
          <EmptyState
            icon={BellOff}
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
            description={
              filter === "unread"
                ? "You've read everything. New activity lands here first."
                : "Likes, comments, mentions, follows and calls all show up here."
            }
          />
        )}
        <Stack divider={<Divider flexItem sx={{ borderColor: tokens.lineSoft, mx: 1 }} />}>
          {list.items.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={() => open(n)} />
          ))}
        </Stack>
        {list.items.length > 0 && (
          <InfiniteSentinel hasMore={Boolean(list.hasNextPage)} loading={list.isFetchingNextPage} onLoadMore={list.fetchNextPage} />
        )}
      </Card>
    </ContentLayout>
  );
}
