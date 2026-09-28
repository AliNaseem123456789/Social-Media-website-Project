import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge, Box, Button, Card, Grid, IconButton, InputAdornment, Skeleton, Stack, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import { Check, Inbox, MessageCircle, Search, Send, UserPlus, Users, X } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import UserAvatar from "../../../components/ui/UserAvatar";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { tokens } from "../../../theme/tokens";
import FollowButton from "../../profile/components/FollowButton";
import { friendsService } from "../services/friendsService";
import { useCancelRequest, usePeopleSuggestions, useRespondToRequest } from "../hooks";
import PersonRow from "../components/PersonRow";
import FriendButton from "../components/FriendButton";

function ListSkeleton() {
  return [0, 1, 2, 3].map((i) => (
    <Stack key={i} direction="row" spacing={1.5} sx={{ py: 1.25, alignItems: "center" }}>
      <Skeleton variant="circular" width={44} height={44} />
      <Skeleton width="40%" />
    </Stack>
  ));
}

function FriendsList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: queryKeys.friends(), queryFn: () => friendsService.list() });
  const visible = useMemo(() => data.filter((f) => f.username.toLowerCase().includes(filter.trim().toLowerCase())), [data, filter]);

  return (
    <Card sx={{ p: 2.5 }}>
      <TextField
        size="small"
        placeholder="Search friends"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 1.5 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
      />
      {isLoading && <ListSkeleton />}
      {!isLoading && data.length === 0 && (
        <EmptyState icon={Users} title="No friends yet" description="Find people you know in Discover." action={<Button variant="contained" onClick={() => navigate("/friends?tab=discover")}>Discover people</Button>} />
      )}
      {!isLoading && data.length > 0 && visible.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
          No friends match "{filter}".
        </Typography>
      )}
      {visible.map((friend) => (
        <PersonRow
          key={friend.id}
          user={friend}
          showFollow
          action={
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Message">
                <IconButton onClick={() => navigate(`/messages/with/${friend.id}`)} aria-label={`Message ${friend.username}`}>
                  <MessageCircle size={18} />
                </IconButton>
              </Tooltip>
              <FriendButton userId={friend.id} size="small" initialStatus={{ status: "friends", requestId: friend.friendshipId }} />
            </Stack>
          }
        />
      ))}
    </Card>
  );
}

function RequestsList() {
  const incoming = useQuery({ queryKey: queryKeys.friendRequests("incoming"), queryFn: () => friendsService.requests("incoming") });
  const outgoing = useQuery({ queryKey: queryKeys.friendRequests("outgoing"), queryFn: () => friendsService.requests("outgoing") });
  const respond = useRespondToRequest();
  const cancel = useCancelRequest();

  return (
    <Stack spacing={2}>
      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Received
        </Typography>
        {incoming.isLoading && <ListSkeleton />}
        {!incoming.isLoading && !incoming.data?.length && <EmptyState compact icon={Inbox} title="No pending requests" description="When someone adds you, it shows up here." />}
        {incoming.data?.map((request) => (
          <PersonRow
            key={request.id}
            user={request.user}
            subtitle="Wants to be friends"
            showFollow
            action={
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" startIcon={<Check size={15} />} disabled={respond.isPending} onClick={() => respond.mutate({ userId: request.user.id, requestId: request.id, action: "accept" })}>
                  Accept
                </Button>
                <IconButton size="small" aria-label="Decline" disabled={respond.isPending} onClick={() => respond.mutate({ userId: request.user.id, requestId: request.id, action: "reject" })}>
                  <X size={17} />
                </IconButton>
              </Stack>
            }
          />
        ))}
      </Card>

      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Sent
        </Typography>
        {outgoing.isLoading && <ListSkeleton />}
        {!outgoing.isLoading && !outgoing.data?.length && <EmptyState compact icon={Send} title="No sent requests" />}
        {outgoing.data?.map((request) => (
          <PersonRow
            key={request.id}
            user={request.user}
            subtitle="Request pending"
            showFollow
            action={
              <Button size="small" variant="outlined" disabled={cancel.isPending} onClick={() => cancel.mutate({ userId: request.user.id, requestId: request.id })}>
                Cancel
              </Button>
            }
          />
        ))}
      </Card>
    </Stack>
  );
}

function Discover() {
  const { people, isLoading } = usePeopleSuggestions(24);

  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6 }}>
            <Skeleton variant="rounded" height={210} sx={{ borderRadius: 5 }} />
          </Grid>
        ))}
      </Grid>
    );
  }
  if (!people.length) return <Card><EmptyState icon={UserPlus} title="No suggestions right now" description="Check back later as more people join." /></Card>;

  return (
    <Grid container spacing={2}>
      {people.map((person) => (
        <Grid key={person.id} size={{ xs: 12, sm: 6 }}>
          <Card sx={{ p: 2.5, textAlign: "center", height: "100%", display: "flex", flexDirection: "column" }}>
            <Box component={RouterLink} to={`/u/${person.id}`} sx={{ display: "inline-block", mx: "auto" }}>
              <UserAvatar user={person} size={72} />
            </Box>
            <Typography variant="subtitle1" noWrap sx={{ mt: 1.25 }}>
              {person.username}
            </Typography>
            <Typography variant="caption" component="p" sx={{ mb: 2, minHeight: 20 }}>
              {person.reason || "New on Circle"}
            </Typography>
            <Stack spacing={1} sx={{ alignItems: "center", mt: "auto" }}>
              <FollowButton user={person} />
              <FriendButton userId={person.id} size="small" initialStatus={{ status: "none", requestId: null }} />
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default function FriendsPage() {
  const [params, setParams] = useSearchParams();
  const tab = ["friends", "requests", "discover"].includes(params.get("tab")) ? params.get("tab") : "friends";
  const incoming = useQuery({ queryKey: queryKeys.friendRequests("incoming"), queryFn: () => friendsService.requests("incoming") });
  useDocumentTitle("Friends");

  return (
    <ContentLayout maxWidth={760}>
      <PageHeader eyebrow="Your circle" title="Friends" subtitle="Manage your connections and find new people." />
      <Tabs value={tab} onChange={(_, value) => setParams(value === "friends" ? {} : { tab: value }, { replace: true })} sx={{ mb: 2.5, borderBottom: `1px solid ${tokens.line}` }}>
        <Tab value="friends" label="All friends" />
        <Tab
          value="requests"
          label={
            <Badge color="primary" badgeContent={incoming.data?.length || 0} sx={{ pr: incoming.data?.length ? 1.75 : 0, "& .MuiBadge-badge": { right: 4, top: 10 } }}>
              Requests
            </Badge>
          }
        />
        <Tab value="discover" label="Discover" />
      </Tabs>
      {tab === "friends" && <FriendsList />}
      {tab === "requests" && <RequestsList />}
      {tab === "discover" && <Discover />}
    </ContentLayout>
  );
}
