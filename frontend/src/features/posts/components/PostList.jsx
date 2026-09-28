import { Button, Stack } from "@mui/material";
import { FileText } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import InfiniteSentinel from "../../../components/ui/InfiniteSentinel";
import PostCard from "./PostCard";
import PostSkeleton from "./PostSkeleton";

export default function PostList({
  query,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  emptyIcon = FileText,
  fromSaved = false,
}) {
  const { items, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <PostSkeleton />
      </Stack>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={FileText}
        title="Couldn't load posts"
        description="Check your connection and try again."
        action={
          <Button variant="outlined" onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!items.length) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <Stack spacing={2}>
      {items.map((post) => (
        <PostCard key={post.id} post={post} fromSaved={fromSaved} />
      ))}
      <InfiniteSentinel hasMore={Boolean(hasNextPage)} loading={isFetchingNextPage} onLoadMore={fetchNextPage} />
    </Stack>
  );
}
