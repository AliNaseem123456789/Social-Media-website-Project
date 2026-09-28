import { Card, Stack, Box } from "@mui/material";
import UserAvatar from "../../../components/ui/UserAvatar";
import { useAuth } from "../../auth/context/AuthContext";
import { useCreateDraft, useCreatePost } from "../hooks";
import DraftsLink from "./DraftsLink";
import PostForm from "./PostForm";

export default function Composer() {
  const { user } = useAuth();
  const create = useCreatePost();
  const createDraft = useCreateDraft();

  const submit = async ({ content, images, alt, scheduledFor, asDraft }) => {
    try {
      if (asDraft || scheduledFor) {
        await createDraft.mutateAsync({ content, files: images, scheduledFor: scheduledFor ?? undefined });
      } else {
        await create.mutateAsync({ content, images, alt });
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1.5}>
        <UserAvatar user={user} size={42} />
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
          <PostForm
            minRows={2}
            placeholder={`What's new, ${user?.username?.split(" ")[0] ?? "there"}?`}
            submitting={create.isPending || createDraft.isPending}
            allowScheduling
            allowSaveDraft
            onSubmit={submit}
          />
          <Stack sx={{ mt: 0.5 }}>
            <DraftsLink />
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}
