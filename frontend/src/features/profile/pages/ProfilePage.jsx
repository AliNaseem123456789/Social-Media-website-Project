import { useState } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Card, Chip, Grid, IconButton, Menu, MenuItem, Skeleton, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import {
  Bookmark,
  CalendarDays,
  GraduationCap,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  ShieldOff,
  UserRound,
  Users,
} from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import EmptyState from "../../../components/ui/EmptyState";
import UserAvatar from "../../../components/ui/UserAvatar";
import RichText from "../../../components/ui/RichText";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { compactNumber, monthYear } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import { useAuth } from "../../auth/context/AuthContext";
import PostList from "../../posts/components/PostList";
import { postService } from "../../posts/services/postService";
import FriendButton from "../../friends/components/FriendButton";
import PersonRow from "../../friends/components/PersonRow";
import { friendsService } from "../../friends/services/friendsService";
import { useModerationMenuItems } from "../../moderation/components/ModerationMenuItems";
import TrendingCard from "../../feed/components/TrendingCard";
import { COUNTRIES, getFlagEmoji } from "../data/countriesData";
import { profileService } from "../services/profileService";
import { useProfileByParam } from "../hooks";
import EditProfileDialog from "../components/EditProfileDialog";
import FollowButton from "../components/FollowButton";

function Stat({ label, value, loading }) {
  return (
    <Box sx={{ flex: 1, textAlign: "center", py: 1.5 }}>
      {loading ? (
        <Skeleton width={40} height={30} sx={{ mx: "auto" }} />
      ) : (
        <Typography sx={{ fontFamily: tokens.fontDisplay, fontSize: "1.45rem", fontWeight: 600, lineHeight: 1.2 }}>{compactNumber(value)}</Typography>
      )}
      <Typography variant="caption">{label}</Typography>
    </Box>
  );
}

function CountLink({ to, value, label }) {
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 0.6,
        px: 0.75,
        mx: -0.75,
        py: 0.25,
        borderRadius: 2,
        textDecoration: "none",
        color: tokens.inkSoft,
        "&:hover": { bgcolor: tokens.wash.ink, color: tokens.ink },
        "&:focus-visible": { outline: `2px solid ${tokens.ink}`, outlineOffset: 2 },
      }}
    >
      <Typography component="span" sx={{ fontWeight: 700, fontSize: "0.95rem", color: tokens.ink }}>
        {compactNumber(value)}
      </Typography>
      <Typography component="span" variant="body2" sx={{ color: "inherit" }}>
        {label}
      </Typography>
    </Box>
  );
}

function ProfileHeader({ profile, isMe, blocked, onEdit }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const locked = Boolean(profile.isPrivate);
  const stats = useQuery({
    queryKey: queryKeys.stats(profile.id),
    queryFn: () => profileService.stats(profile.id),
    enabled: !locked && !blocked,
  });
  const moderation = useModerationMenuItems({ user: profile, onClose: () => setMenuAnchor(null) });
  const country = COUNTRIES.find((c) => c.name === profile.country);

  return (
    <Card sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          height: { xs: 140, sm: 200 },
          background: profile.coverUrl
            ? `center / cover no-repeat url(${profile.coverUrl})`
            : `radial-gradient(circle at 20% 20%, ${tokens.emberTint}, transparent 55%), radial-gradient(circle at 85% 30%, ${tokens.signalTint}, transparent 50%), linear-gradient(120deg, ${tokens.paperDeep}, ${tokens.surfaceMuted})`,
        }}
      />
      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "flex-end" }, mt: { xs: -5, sm: -6 }, gap: 2 }}>
          <UserAvatar user={profile} size={112} sx={{ border: `5px solid ${tokens.surface}`, boxShadow: tokens.shadow.card }} />
          <Stack direction="row" sx={{ pb: 0.5, gap: 1, flexWrap: "wrap" }}>
            {isMe ? (
              <Button variant="outlined" startIcon={<Pencil size={16} />} onClick={onEdit}>
                Edit profile
              </Button>
            ) : (
              <>
                {blocked ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={moderation.openBlock}
                    disabled={moderation.blockPending}
                  >
                    Unblock
                  </Button>
                ) : (
                  <>
                    <FollowButton user={profile} size="medium" />
                    <Button
                      variant="outlined"
                      startIcon={<MessageCircle size={16} />}
                      component={RouterLink}
                      to={`/messages/with/${profile.id}`}
                    >
                      Message
                    </Button>
                    {!locked && <FriendButton userId={profile.id} />}
                  </>
                )}
                {moderation.available && (
                  <IconButton
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                    aria-label={`Options for ${profile.username}`}
                    sx={{ alignSelf: "center" }}
                  >
                    <MoreHorizontal size={18} />
                  </IconButton>
                )}
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {moderation.items}
                </Menu>
                {moderation.dialogs}
              </>
            )}
          </Stack>
        </Stack>

        <Stack direction="row" sx={{ mt: 1.5, gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="h4" component="h1">
            {profile.username}
          </Typography>
          {profile.followsMe && (
            <Chip size="small" label="Follows you" sx={{ bgcolor: tokens.surfaceMuted, color: tokens.inkSoft, border: `1px solid ${tokens.line}` }} />
          )}
          {locked && (
            <Chip size="small" icon={<Lock size={13} />} label="Private" sx={{ bgcolor: tokens.emberTint, color: tokens.emberInk, "& .MuiChip-icon": { color: tokens.emberInk } }} />
          )}
          {blocked && (
            <Chip
              size="small"
              icon={<ShieldOff size={13} />}
              label="Blocked"
              sx={{ bgcolor: tokens.surfaceMuted, color: tokens.inkSoft, border: `1px solid ${tokens.line}`, "& .MuiChip-icon": { color: tokens.inkFaint } }}
            />
          )}
          {isMe && profile.visibility && profile.visibility !== "public" && (
            <Chip
              size="small"
              clickable
              component={RouterLink}
              to="/settings"
              icon={<Lock size={13} />}
              label={profile.visibility === "private" ? "Only you" : "Followers only"}
              sx={{ bgcolor: tokens.surfaceMuted, color: tokens.inkSoft, border: `1px solid ${tokens.line}`, "& .MuiChip-icon": { color: tokens.inkFaint } }}
            />
          )}
        </Stack>

        {profile.bio && (
          <Typography sx={{ mt: 1, color: tokens.inkSoft, maxWidth: 560, whiteSpace: "pre-wrap" }}>
            <RichText text={profile.bio} />
          </Typography>
        )}

        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2, mt: 1.5, color: tokens.inkFaint }}>
          {profile.country && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <MapPin size={15} />
              <Typography variant="body2">
                {country ? `${getFlagEmoji(country.code)} ` : ""}
                {profile.country}
              </Typography>
            </Stack>
          )}
          {profile.education && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <GraduationCap size={15} />
              <Typography variant="body2">{profile.education}</Typography>
            </Stack>
          )}
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <CalendarDays size={15} />
            <Typography variant="body2">Joined {monthYear(profile.joinedAt)}</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" sx={{ gap: 2.5, mt: 1.75, flexWrap: "wrap" }}>
          <CountLink to={`/u/${profile.id}/followers`} value={profile.followerCount} label="Followers" />
          <CountLink to={`/u/${profile.id}/following`} value={profile.followingCount} label="Following" />
        </Stack>

        {profile.hobbies?.length > 0 && (
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 2 }}>
            {profile.hobbies.map((hobby) => (
              <Chip key={hobby} label={hobby} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
      </Box>

      {!locked && !blocked && (
        <Stack direction="row" sx={{ borderTop: `1px solid ${tokens.line}`, "& > *:not(:last-child)": { borderRight: `1px solid ${tokens.lineSoft}` } }}>
          <Stat label="Posts" value={stats.data?.totalPosts} loading={stats.isLoading} />
          <Stat label="Friends" value={stats.data?.totalFriends} loading={stats.isLoading} />
          <Stat label="Likes" value={stats.data?.totalLikesReceived} loading={stats.isLoading} />
          <Stat label="Comments" value={stats.data?.totalCommentsReceived} loading={stats.isLoading} />
        </Stack>
      )}
    </Card>
  );
}

function BlockedNotice({ profile }) {
  const moderation = useModerationMenuItems({ user: profile });

  return (
    <Card>
      <EmptyState
        icon={ShieldOff}
        title="You blocked this account"
        description={`You don't see anything ${profile.username} posts, and they can't follow you, message you or see your posts. Unblocking doesn't restore the follows or friendship you had before.`}
        action={
          <Button variant="contained" color="secondary" onClick={moderation.openBlock} disabled={moderation.blockPending}>
            Unblock
          </Button>
        }
      />
      {moderation.dialogs}
    </Card>
  );
}

function PrivateNotice({ profile }) {
  return (
    <Card>
      <EmptyState
        icon={Lock}
        title="This account is private"
        description={`Follow ${profile.username} to see their posts, friends and profile details.`}
        action={<FollowButton user={profile} size="medium" />}
      />
    </Card>
  );
}

function PostsTab({ userId, isMe }) {
  const [sort, setSort] = useState("recent");
  const [type, setType] = useState("all");
  const params = { author: userId, sort, type, limit: 10 };
  const query = useInfiniteList(queryKeys.posts(params), (cursor) => postService.list({ ...params, cursor }));

  const pinned = query.items.find((p) => p.isPinned);
  const ordered = pinned && sort === "recent" ? [pinned, ...query.items.filter((p) => p.id !== pinned.id)] : query.items;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5}>
        <TextField select size="small" value={sort} onChange={(e) => setSort(e.target.value)} sx={{ width: 160 }} label="Sort">
          <MenuItem value="recent">Newest</MenuItem>
          <MenuItem value="oldest">Oldest</MenuItem>
          <MenuItem value="likes">Most liked</MenuItem>
        </TextField>
        <TextField select size="small" value={type} onChange={(e) => setType(e.target.value)} sx={{ width: 160 }} label="Show">
          <MenuItem value="all">All posts</MenuItem>
          <MenuItem value="image">With photos</MenuItem>
          <MenuItem value="text">Text only</MenuItem>
        </TextField>
      </Stack>
      <PostList
        query={{ ...query, items: ordered }}
        emptyTitle={isMe ? "You haven't posted yet" : "No posts yet"}
        emptyDescription={isMe ? "Share a thought or a photo from the home feed." : undefined}
        emptyAction={isMe ? <Button variant="contained" component={RouterLink} to="/home">Write a post</Button> : null}
      />
    </Stack>
  );
}

function LikedTab() {
  const params = { limit: 10 };
  const query = useInfiniteList(queryKeys.likedPosts(params), (cursor) => postService.liked({ ...params, cursor }));
  return <PostList query={query} emptyIcon={Heart} emptyTitle="No liked posts" emptyDescription="Posts you like will be saved here." />;
}

function SavedTab() {
  const query = useInfiniteList(queryKeys.savedPosts, (cursor) => postService.saved({ cursor, limit: 10 }));
  return (
    <PostList
      query={query}
      emptyIcon={Bookmark}
      emptyTitle="Nothing saved yet"
      emptyDescription="Save a post from its menu and it waits for you here."
      emptyAction={
        <Button variant="outlined" component={RouterLink} to="/saved">
          Open saved posts
        </Button>
      }
    />
  );
}

function FriendsTab({ userId }) {
  const { data = [], isLoading } = useQuery({ queryKey: queryKeys.friends(userId), queryFn: () => friendsService.list(userId) });
  if (isLoading) return <Skeleton variant="rounded" height={180} sx={{ borderRadius: 4 }} />;
  if (!data.length) return <Card><EmptyState icon={Users} title="No friends yet" /></Card>;
  return (
    <Card sx={{ p: 2 }}>
      <Grid container spacing={1}>
        {data.map((friend) => (
          <Grid key={friend.id} size={{ xs: 12, sm: 6 }}>
            <PersonRow user={friend} showFollow />
          </Grid>
        ))}
      </Grid>
    </Card>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const [editing, setEditing] = useState(false);

  const profileQuery = useProfileByParam(params.id ?? user?.id);
  const profile = profileQuery.data;
  const userId = profileQuery.id;
  const isMe = Boolean(userId) && userId === user?.id;
  const blocked = Boolean(profile?.blockedByMe) && !isMe;
  const locked = Boolean(profile?.isPrivate);
  const tab = search.get("tab") || "posts";

  useDocumentTitle(profile?.username || "Profile");

  const tabs = [
    { value: "posts", label: "Posts" },
    ...(isMe ? [{ value: "liked", label: "Liked" }, { value: "saved", label: "Saved" }] : []),
    { value: "friends", label: "Friends" },
  ];
  const activeTab = tabs.some((t) => t.value === tab) ? tab : "posts";

  return (
    <ContentLayout aside={<TrendingCard />} maxWidth={720}>
      {profileQuery.isLoading && <Skeleton variant="rounded" height={380} sx={{ borderRadius: 5 }} />}
      {profileQuery.isError && (
        <Card>
          <EmptyState
            icon={UserRound}
            title="This profile isn't available"
            description="It may have been removed, or it isn't shared with you."
          />
        </Card>
      )}
      {profile && (
        <Stack spacing={2}>
          <ProfileHeader profile={profile} isMe={isMe} blocked={blocked} onEdit={() => setEditing(true)} />
          {blocked ? (
            <BlockedNotice profile={profile} />
          ) : locked ? (
            <PrivateNotice profile={profile} />
          ) : (
            <>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setSearch(value === "posts" ? {} : { tab: value }, { replace: true })}
                variant="scrollable"
                allowScrollButtonsMobile
                sx={{ borderBottom: `1px solid ${tokens.line}` }}
              >
                {tabs.map((t) => (
                  <Tab key={t.value} value={t.value} label={t.label} />
                ))}
              </Tabs>
              {activeTab === "liked" && <LikedTab />}
              {activeTab === "saved" && <SavedTab />}
              {activeTab === "friends" && <FriendsTab userId={userId} />}
              {activeTab === "posts" && <PostsTab userId={userId} isMe={isMe} />}
            </>
          )}
          {editing && <EditProfileDialog open profile={profile} onClose={() => setEditing(false)} />}
        </Stack>
      )}
    </ContentLayout>
  );
}
