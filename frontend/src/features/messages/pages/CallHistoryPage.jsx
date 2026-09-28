import { Link as RouterLink } from "react-router-dom";
import { Box, Card, IconButton, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Video } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import InfiniteSentinel from "../../../components/ui/InfiniteSentinel";
import UserAvatar from "../../../components/ui/UserAvatar";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { fullDate, timeAgo } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import { callService } from "../services/callService";
import { callDuration } from "../lib/call";
import { useStartCall } from "../hooks";

const PAGE_SIZE = 20;

function descriptorFor(call) {
  if (call.status === "missed") {
    return { icon: PhoneMissed, label: call.direction === "incoming" ? "Missed" : "No answer", accent: tokens.danger };
  }
  if (call.status === "rejected") {
    return { icon: PhoneOff, label: call.direction === "incoming" ? "Declined" : "Call declined", accent: tokens.inkFaint };
  }
  if (call.status === "ringing") {
    return { icon: Phone, label: "Ringing", accent: tokens.ember };
  }
  return call.direction === "incoming"
    ? { icon: PhoneIncoming, label: "Incoming", accent: tokens.signal }
    : { icon: PhoneOutgoing, label: "Outgoing", accent: tokens.inkSoft };
}

function CallRow({ call, onCallBack, canCall }) {
  const { icon: Icon, label, accent } = descriptorFor(call);
  const duration = call.status === "answered" || call.status === "ended" ? callDuration(call.durationSeconds) : "";
  const CallIcon = call.video ? Video : Phone;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 1, py: 1.25, borderRadius: 3, transition: "background-color .15s", "&:hover": { bgcolor: tokens.paperDeep } }}>
      <RouterLink to={`/u/${call.peer.id}`} aria-label={`${call.peer.username}'s profile`}>
        <UserAvatar user={call.peer} size={44} />
      </RouterLink>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 650, fontSize: "0.92rem", color: call.status === "missed" ? tokens.danger : tokens.ink }}>
          {call.peer.username}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.1 }}>
          <Box component="span" sx={{ display: "inline-flex", color: accent, flexShrink: 0 }}>
            <Icon size={14} strokeWidth={2.2} />
          </Box>
          <Typography variant="caption" noWrap>
            {[label, call.video ? "Video" : "Voice", duration].filter(Boolean).join(" · ")}
          </Typography>
        </Stack>
      </Box>

      <Tooltip title={fullDate(call.startedAt)}>
        <Typography variant="caption" sx={{ flexShrink: 0, display: { xs: "none", sm: "block" } }}>
          {timeAgo(call.startedAt)}
        </Typography>
      </Tooltip>

      <Tooltip title={call.video ? "Call back on video" : "Call back"}>
        <IconButton
          onClick={() => onCallBack(call.peer.id, call.video)}
          disabled={!canCall}
          aria-label={`Call ${call.peer.username} back`}
          sx={{ flexShrink: 0 }}
        >
          <CallIcon size={18} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function CallHistoryPage() {
  useDocumentTitle("Calls");
  const list = useInfiniteList(queryKeys.calls, (cursor) => callService.history({ cursor, limit: PAGE_SIZE }));
  const { start, canCall } = useStartCall();
  const missed = list.data?.pages?.[0]?.missedCount ?? 0;

  return (
    <ContentLayout>
      <PageHeader
        eyebrow="History"
        title="Calls"
        subtitle={missed > 0 ? `${missed} missed ${missed === 1 ? "call" : "calls"}` : "Your voice and video calls."}
      />
      <Card sx={{ p: 1 }}>
        {list.isLoading && (
          <Stack spacing={1} sx={{ p: 1 }}>
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} height={64} />
            ))}
          </Stack>
        )}
        {!list.isLoading && list.items.length === 0 && (
          <EmptyState
            icon={PhoneOff}
            title="No calls yet"
            description="Voice and video calls you make or receive will be listed here."
          />
        )}
        {list.items.map((call) => (
          <CallRow key={call.id} call={call} onCallBack={start} canCall={canCall} />
        ))}
        {list.items.length > 0 && (
          <InfiniteSentinel hasMore={Boolean(list.hasNextPage)} loading={list.isFetchingNextPage} onLoadMore={list.fetchNextPage} />
        )}
      </Card>
    </ContentLayout>
  );
}
