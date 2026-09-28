import { Link as RouterLink, useParams } from "react-router-dom";
import { Button, Card, Skeleton, Stack, Tab, Tabs } from "@mui/material";
import { Lock, UserRound, Users } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import InfiniteSentinel from "../../../components/ui/InfiniteSentinel";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { tokens } from "../../../theme/tokens";
import { useAuth } from "../../auth/context/AuthContext";
import PersonRow from "../../friends/components/PersonRow";
import { followService } from "../services/followService";
import { useProfileByParam } from "../hooks";
import FollowButton from "../components/FollowButton";

const COPY = {
  followers: {
    label: "Followers",
    title: "Followers",
    emptyTitle: "No followers yet",
    emptyDescription: "When someone follows this account, they show up here.",
    ownEmptyDescription: "Post something and people who like it will start following you.",
  },
  following: {
    label: "Following",
    title: "Following",
    emptyTitle: "Not following anyone yet",
    emptyDescription: "This account hasn't followed anyone yet.",
    ownEmptyDescription: "Follow people to fill your feed with what they post.",
  },
};

function mutualLine(count) {
  if (!count) return undefined;
  return count === 1 ? "Followed by 1 person you follow" : `Followed by ${count} people you follow`;
}

function RowSkeleton() {
  return [0, 1, 2, 3, 4].map((i) => (
    <Stack key={i} direction="row" spacing={1.5} sx={{ py: 1.25, alignItems: "center" }}>
      <Skeleton variant="circular" width={44} height={44} />
      <Stack spacing={0.5} sx={{ flex: 1 }}>
        <Skeleton width="35%" />
        <Skeleton width="55%" height={12} />
      </Stack>
      <Skeleton variant="rounded" width={96} height={32} sx={{ borderRadius: 999 }} />
    </Stack>
  ));
}

export default function FollowListPage({ mode = "followers" }) {
  const params = useParams();
  const { user } = useAuth();
  const profileQuery = useProfileByParam(params.id ?? user?.id);
  const profile = profileQuery.data;
  const userId = profileQuery.id;
  const isMe = Boolean(userId) && userId === user?.id;
  const locked = Boolean(profile?.isPrivate);
  const copy = COPY[mode] ?? COPY.followers;

  useDocumentTitle(profile?.username ? `${copy.title} · ${profile.username}` : copy.title);

  const list = useInfiniteList(
    mode === "following" ? queryKeys.following(userId) : queryKeys.followers(userId),
    (cursor) =>
      mode === "following"
        ? followService.following(userId, { cursor, limit: 20 })
        : followService.followers(userId, { cursor, limit: 20 }),
    { enabled: Boolean(userId) && !locked },
  );

  const loading = profileQuery.isLoading || list.isLoading || (!profile && !profileQuery.isError);

  return (
    <ContentLayout maxWidth={620}>
      <PageHeader
        eyebrow={profile?.username ? `@${profile.username}` : "Profile"}
        title={copy.title}
        subtitle={
          mode === "following"
            ? `People ${isMe ? "you follow" : `${profile?.username || "this account"} follows`}`
            : `People following ${isMe ? "you" : profile?.username || "this account"}`
        }
      />

      <Tabs
        value={mode}
        sx={{ mb: 2, borderBottom: `1px solid ${tokens.line}` }}
        aria-label="Follow lists"
      >
        <Tab value="followers" label={COPY.followers.label} component={RouterLink} to={`/u/${params.id ?? userId ?? ""}/followers`} replace />
        <Tab value="following" label={COPY.following.label} component={RouterLink} to={`/u/${params.id ?? userId ?? ""}/following`} replace />
      </Tabs>

      {profileQuery.isError && (
        <Card>
          <EmptyState icon={UserRound} title="Profile not found" description="This account may have been removed." />
        </Card>
      )}

      {profile && locked && (
        <Card>
          <EmptyState
            icon={Lock}
            title="This account is private"
            description={`Follow ${profile.username} to see who they follow and who follows them.`}
            action={<FollowButton user={profile} size="medium" />}
          />
        </Card>
      )}

      {!profileQuery.isError && !locked && (
        <Card sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5 }}>
          {loading && <RowSkeleton />}
          {!loading && list.isError && (
            <EmptyState
              compact
              icon={Users}
              title="Couldn't load this list"
              description="Check your connection and try again."
              action={
                <Button variant="outlined" onClick={() => list.refetch()}>
                  Try again
                </Button>
              }
            />
          )}
          {!loading && !list.isError && list.items.length === 0 && (
            <EmptyState
              compact
              icon={Users}
              title={copy.emptyTitle}
              description={isMe ? copy.ownEmptyDescription : copy.emptyDescription}
            />
          )}
          {list.items.map((person) => (
            <PersonRow
              key={person.id}
              user={person}
              subtitle={mutualLine(person.mutualFollowers)}
              action={<FollowButton user={person} />}
            />
          ))}
          {list.items.length > 0 && (
            <InfiniteSentinel
              hasMore={Boolean(list.hasNextPage)}
              loading={list.isFetchingNextPage}
              onLoadMore={list.fetchNextPage}
              endLabel=""
            />
          )}
        </Card>
      )}
    </ContentLayout>
  );
}
