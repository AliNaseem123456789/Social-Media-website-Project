import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Card, Chip, IconButton, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { CalendarClock, FileText, Pencil, SendHorizontal, Trash2 } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import RichText from "../../../components/ui/RichText";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { fullDate, timeAgo } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import { useDeleteDraft, useDrafts, usePublishDraft } from "../hooks";
import PostEditorDialog from "../components/PostEditorDialog";

function DraftCard({ draft, onEdit, onDelete, onPublish, publishing }) {
  const images = draft.images ?? [];

  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        {draft.scheduledFor ? (
          <Chip
            icon={<CalendarClock size={13} />}
            label={`Scheduled for ${fullDate(draft.scheduledFor)}`}
            size="small"
            sx={{
              height: 24,
              bgcolor: tokens.emberTint,
              color: tokens.emberInk,
              "& .MuiChip-icon": { color: tokens.emberInk },
            }}
          />
        ) : (
          <Typography variant="overline" color="text.disabled">
            Draft
          </Typography>
        )}
        <Tooltip title={fullDate(draft.updatedAt || draft.createdAt)} placement="bottom-end">
          <Typography variant="caption">Saved {timeAgo(draft.updatedAt || draft.createdAt)}</Typography>
        </Tooltip>
      </Stack>

      {draft.content ? (
        <Typography
          sx={{
            mt: 1.25,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitLineClamp: 6,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          <RichText text={draft.content} />
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
          No text yet.
        </Typography>
      )}

      {images.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
          {images.slice(0, 4).map((url) => (
            <Box
              key={url}
              component="img"
              src={url}
              alt=""
              loading="lazy"
              sx={{
                width: 72,
                height: 72,
                objectFit: "cover",
                borderRadius: 2,
                border: `1px solid ${tokens.line}`,
                bgcolor: tokens.paperDeep,
              }}
            />
          ))}
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${tokens.lineSoft}`, alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
      >
        <Button
          size="small"
          variant="contained"
          startIcon={<SendHorizontal size={15} />}
          onClick={onPublish}
          disabled={publishing}
        >
          Publish now
        </Button>
        <Button size="small" variant="outlined" startIcon={<Pencil size={15} />} onClick={onEdit} disabled={publishing}>
          Edit
        </Button>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onDelete} aria-label="Delete draft" disabled={publishing}>
          <Trash2 size={16} />
        </IconButton>
      </Stack>
    </Card>
  );
}

export default function DraftsPage() {
  const { data: drafts = [], isLoading } = useDrafts();
  const publishDraft = usePublishDraft();
  const deleteDraft = useDeleteDraft();
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  useDocumentTitle("Drafts");

  return (
    <ContentLayout>
      <PageHeader
        eyebrow="Your library"
        title="Drafts"
        subtitle="Unfinished posts and anything you scheduled for later."
        actions={
          <Button variant="text" component={RouterLink} to="/saved">
            Saved
          </Button>
        }
      />

      {isLoading && (
        <Stack spacing={2}>
          {[0, 1].map((i) => (
            <Skeleton key={i} variant="rounded" height={170} sx={{ borderRadius: 5 }} />
          ))}
        </Stack>
      )}

      {!isLoading && drafts.length === 0 && (
        <Card>
          <EmptyState
            icon={FileText}
            title="No drafts yet"
            description="Start a post and use Save draft, or schedule one for later."
            action={
              <Button variant="outlined" component={RouterLink} to="/home">
                Start a post
              </Button>
            }
          />
        </Card>
      )}

      <Stack spacing={2}>
        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            publishing={publishDraft.isPending || deleteDraft.isPending}
            onEdit={() => setEditing(draft)}
            onDelete={() => setConfirming(draft)}
            onPublish={() => publishDraft.mutate(draft.id)}
          />
        ))}
      </Stack>

      {editing && <PostEditorDialog open draft={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Delete this draft?"
        description="The draft and any images you added to it are removed. This can't be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteDraft.isPending}
        onClose={() => setConfirming(null)}
        onConfirm={() => deleteDraft.mutate(confirming.id, { onSuccess: () => setConfirming(null) })}
      />
    </ContentLayout>
  );
}
