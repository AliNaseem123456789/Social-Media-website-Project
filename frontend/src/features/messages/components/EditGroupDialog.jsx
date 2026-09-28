import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField } from "@mui/material";
import { X } from "lucide-react";
import { useToast } from "../../../context/ToastContext";
import { AvatarPicker } from "../../profile/components/ImagePicker";
import { useUpdateGroup } from "../hooks";

export default function EditGroupDialog({ open, conversation, onClose }) {
  const toast = useToast();
  const [title, setTitle] = useState(conversation?.title ?? "");
  const [image, setImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const update = useUpdateGroup(conversation?.id);

  const close = () => {
    if (update.isPending) return;
    onClose();
  };

  const submit = () => {
    update.mutate(
      { title: title.trim(), image, removeImage: removeImage && !image },
      { onSuccess: () => onClose() },
    );
  };

  const hasImage = Boolean(image) || (Boolean(conversation?.imageUrl) && !removeImage);
  const changed = title.trim() !== (conversation?.title ?? "") || Boolean(image) || removeImage;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle component="div">
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          Edit group
          <IconButton onClick={close} disabled={update.isPending} aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ alignItems: "center", pt: 1 }}>
          <AvatarPicker
            user={{ username: title || conversation?.title, avatarUrl: removeImage ? null : conversation?.imageUrl }}
            file={image}
            onChange={(file) => {
              setImage(file);
              setRemoveImage(false);
            }}
            onError={(message) => toast.error(message)}
            size={88}
          />
          {hasImage && (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setImage(null);
                setRemoveImage(true);
              }}
            >
              Remove photo
            </Button>
          )}
          <TextField
            size="small"
            label="Group name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={close} disabled={update.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!title.trim() || !changed || update.isPending}>
          {update.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
