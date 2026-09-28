import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField } from "@mui/material";
import { X } from "lucide-react";
import { useCreateGroup } from "../hooks";
import UserPicker from "./UserPicker";

const MAX_OTHERS = 49;

export default function NewGroupDialog({ open, onClose }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [people, setPeople] = useState([]);
  const create = useCreateGroup();

  const close = () => {
    if (create.isPending) return;
    setTitle("");
    setPeople([]);
    onClose();
  };

  const submit = () => {
    create.mutate(
      { title: title.trim(), userIds: people.map((person) => person.id) },
      {
        onSuccess: (conversation) => {
          setTitle("");
          setPeople([]);
          onClose();
          navigate(`/messages/${conversation.id}`);
        },
      },
    );
  };

  const ready = title.trim().length > 0 && people.length > 0;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle component="div">
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          New group
          <IconButton onClick={close} disabled={create.isPending} aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <TextField
            autoFocus
            size="small"
            label="Group name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <UserPicker selected={people} onChange={setPeople} max={MAX_OTHERS} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={close} disabled={create.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!ready || create.isPending}>
          {create.isPending ? "Creating..." : "Create group"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
