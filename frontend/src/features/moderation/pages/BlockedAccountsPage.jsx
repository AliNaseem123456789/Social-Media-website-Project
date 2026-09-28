import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, Card, Skeleton, Stack } from "@mui/material";
import { ArrowLeft, ShieldOff } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import InfiniteSentinel from "../../../components/ui/InfiniteSentinel";
import PersonRow from "../../friends/components/PersonRow";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { timeAgo } from "../../../lib/format";
import { useBlockedAccounts, useToggleBlock } from "../hooks";
import BlockConfirmDialog from "../components/BlockConfirmDialog";

function RowSkeleton() {
  return [0, 1, 2].map((i) => (
    <Stack key={i} direction="row" spacing={1.5} sx={{ py: 1.25, alignItems: "center" }}>
      <Skeleton variant="circular" width={44} height={44} />
      <Stack spacing={0.5} sx={{ flex: 1 }}>
        <Skeleton width="35%" />
        <Skeleton width="45%" height={12} />
      </Stack>
      <Skeleton variant="rounded" width={92} height={32} sx={{ borderRadius: 999 }} />
    </Stack>
  ));
}

function BlockedRow({ person }) {
  const [confirming, setConfirming] = useState(false);
  const toggleBlock = useToggleBlock();

  return (
    <>
      <PersonRow
        user={person}
        subtitle={person.blockedAt ? `Blocked ${timeAgo(person.blockedAt)}` : undefined}
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={() => setConfirming(true)}
            disabled={toggleBlock.isPending}
            aria-label={`Unblock ${person.username}`}
          >
            Unblock
          </Button>
        }
      />
      <BlockConfirmDialog
        open={confirming}
        user={person}
        blocked
        loading={toggleBlock.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          toggleBlock.mutate(
            { userId: person.id, blocked: true, username: person.username },
            { onSuccess: () => setConfirming(false) },
          )
        }
      />
    </>
  );
}

export default function BlockedAccountsPage() {
  const list = useBlockedAccounts();
  useDocumentTitle("Blocked accounts");

  return (
    <ContentLayout maxWidth={620}>
      <PageHeader
        eyebrow="Settings"
        title="Blocked accounts"
        subtitle="Someone you block can't follow you, message you or see your posts, and you stop seeing theirs. They are not told about it."
        actions={
          <Button component={RouterLink} to="/settings" variant="outlined" startIcon={<ArrowLeft size={16} />}>
            Settings
          </Button>
        }
      />

      <Card sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5 }}>
        {list.isLoading && <RowSkeleton />}

        {!list.isLoading && list.isError && (
          <EmptyState
            compact
            icon={ShieldOff}
            title="Couldn't load your blocked accounts"
            description="Check your connection and try again."
            action={
              <Button variant="outlined" onClick={() => list.refetch()}>
                Try again
              </Button>
            }
          />
        )}

        {!list.isLoading && !list.isError && list.items.length === 0 && (
          <EmptyState
            compact
            icon={ShieldOff}
            title="You haven't blocked anyone"
            description="Blocking works one account at a time, from the menu on a post, a profile or a message. You can undo it here whenever you want."
          />
        )}

        {list.items.map((person) => (
          <BlockedRow key={person.id} person={person} />
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
    </ContentLayout>
  );
}
