import { Dialog, DialogContent, DialogTitle, IconButton, Stack } from "@mui/material";
import { X } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import { useAuth } from "../../auth/context/AuthContext";
import { useCreateDraft, useCreatePost, useUpdateDraft, useUpdatePost } from "../hooks";
import DraftsLink from "./DraftsLink";
import PostForm from "./PostForm";

// `initialContent` only seeds the box for a brand new post — it is what the assistant uses to hand
// over a draft it wrote. Passing `draft` instead would mark this as editing an existing draft and
// send the save to a draft id that does not exist.
export default function PostEditorDialog({ open, post, draft, initialContent = "", onClose }) {
  const { user } = useAuth();
  const create = useCreatePost();
  const update = useUpdatePost();
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();

  const editingPost = Boolean(post);
  const editingDraft = Boolean(draft);
  const pending = create.isPending || update.isPending || createDraft.isPending || updateDraft.isPending;

  const submit = async ({ content, images, alt, keptImages, removeImage, scheduledFor, scheduleTouched, asDraft }) => {
    try {
      if (editingDraft) {
        await updateDraft.mutateAsync({
          id: draft.id,
          content,
          images: keptImages,
          files: images,
          scheduledFor: scheduleTouched ? scheduledFor : undefined,
        });
      } else if (editingPost) {
        await update.mutateAsync({ id: post.id, content, images, alt, removeImage });
      } else if (asDraft || scheduledFor) {
        await createDraft.mutateAsync({ content, files: images, scheduledFor: scheduledFor ?? undefined });
      } else {
        await create.mutateAsync({ content, images, alt });
      }
      onClose();
      return true;
    } catch {
      return false;
    }
  };

  const title = editingDraft ? "Edit draft" : editingPost ? "Edit post" : "Create post";

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle component="div">
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <UserAvatar user={user} size={36} />
            <span>{title}</span>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close" disabled={pending}>
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <PostForm
          autoFocus
          minRows={4}
          initialContent={draft?.content || post?.content || initialContent}
          initialImageUrl={post?.imageUrl || null}
          initialImages={
            editingDraft
              ? (draft.images ?? []).map((url) => ({ url, alt: "" }))
              : post?.images?.length
                ? post.images
                : null
          }
          initialScheduledFor={draft?.scheduledFor || null}
          submitLabel={editingPost || editingDraft ? "Save changes" : "Post"}
          submitting={pending}
          allowScheduling={!editingPost}
          allowSaveDraft={!editingPost && !editingDraft}
          existingImagesAtomic={!editingDraft}
          onSubmit={submit}
        />
        <Stack sx={{ mt: 0.5 }}>
          <DraftsLink enabled={!editingPost && !editingDraft} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
