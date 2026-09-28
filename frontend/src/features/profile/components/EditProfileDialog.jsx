import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack } from "@mui/material";
import { X } from "lucide-react";
import { getErrorMessage, getFieldErrors } from "../../../lib/apiClient";
import { queryKeys } from "../../../lib/queryClient";
import { useToast } from "../../../context/ToastContext";
import { useAuth } from "../../auth/context/AuthContext";
import { profileService } from "../services/profileService";
import ProfileFields, { profileToForm, validateProfile } from "./ProfileFields";
import { AvatarPicker, CoverPicker } from "./ImagePicker";

export default function EditProfileDialog({ open, profile, onClose }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { updateUser } = useAuth();
  const [form, setForm] = useState(() => profileToForm(profile));
  const [avatar, setAvatar] = useState(null);
  const [cover, setCover] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const save = useMutation({
    mutationFn: () => profileService.update({ ...form, avatar, cover }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      updateUser({ username: updated.username, avatarUrl: updated.avatarUrl });
      toast.success("Profile updated");
      onClose();
    },
    onError: (err) => {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, "Couldn't save your profile"));
    },
  });

  const submit = () => {
    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  };

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm" scroll="body">
      <DialogTitle component="div">
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          Edit profile
          <IconButton onClick={onClose} aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ position: "relative", mb: 8 }}>
          <CoverPicker coverUrl={profile?.coverUrl} file={cover} onChange={setCover} onError={setFormError} />
          <Box sx={{ position: "absolute", left: 20, bottom: -48 }}>
            <AvatarPicker user={profile} file={avatar} onChange={setAvatar} onError={setFormError} />
          </Box>
        </Box>
        {formError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError("")}>
            {formError}
          </Alert>
        )}
        <ProfileFields form={form} onChange={setForm} errors={errors} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
