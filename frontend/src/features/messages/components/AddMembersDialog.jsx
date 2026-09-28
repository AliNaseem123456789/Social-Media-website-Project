import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack } from "@mui/material";
import { X } from "lucide-react";
import { useAddMembers } from "../hooks";
import UserPicker from "./UserPicker";

const MAX_MEMBERS = 50;

export default function AddMembersDialog({ open, conversation, onClose }) {
  const [people, setPeople] = useState([]);
  const addMembers = useAddMembers(conversation?.id);
  const memberIds = (conversation?.members ?? []).map((member) => member.id);
  const room = Math.max(0, MAX_MEMBERS - memberIds.length);

  const close = () => {
    if (addMembers.isPending) return;
    setPeople([]);
    onClose();
  };

  const submit = () => {
    addMembers.mutate(
      people.map((person) => person.id),
      {
        onSuccess: () => {
          setPeople([]);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle component="div">
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          Add people
          <IconButton onClick={close} disabled={addMembers.isPending} aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <UserPicker selected={people} onChange={setPeople} excludeIds={memberIds} max={room} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={close} disabled={addMembers.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={people.length === 0 || addMembers.isPending}>
          {addMembers.isPending ? "Adding..." : `Add ${people.length || ""}`.trim()}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
