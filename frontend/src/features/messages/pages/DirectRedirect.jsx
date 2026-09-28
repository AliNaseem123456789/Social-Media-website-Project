import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, CircularProgress, Stack, Typography } from "@mui/material";
import { MessageCircleOff, UserX } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import EmptyState from "../../../components/ui/EmptyState";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { getErrorMessage } from "../../../lib/apiClient";
import { queryKeys } from "../../../lib/queryClient";
import { chatService } from "../services/chatService";

/**
 * Bridges the old per-user message links to conversation ids: it opens (or creates) the direct
 * conversation with that person and swaps itself out of the history.
 */
export default function DirectRedirect() {
  const userId = Number(useParams().userId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState(null);
  const requested = useRef(false);
  useDocumentTitle("Messages");

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    if (!Number.isInteger(userId) || userId <= 0) {
      setFailure({ blocked: false, message: "That message link doesn't point at anyone." });
      return;
    }
    chatService
      .openDirect(userId)
      .then((conversation) => {
        queryClient.setQueryData(queryKeys.conversation(conversation.id), conversation);
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
        navigate(`/messages/${conversation.id}`, { replace: true });
      })
      .catch((err) =>
        setFailure({
          blocked: err?.response?.data?.error?.code === "MESSAGES_NOT_ALLOWED",
          message: getErrorMessage(err, "We couldn't open that conversation."),
        }),
      );
  }, [userId, navigate, queryClient]);

  if (failure) {
    return (
      <ContentLayout maxWidth={520}>
        <Card>
          <EmptyState
            icon={failure.blocked ? MessageCircleOff : UserX}
            title={failure.blocked ? "You can't start this conversation" : "We couldn't open that chat"}
            description={failure.message}
            action={
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "center" }}>
                {failure.blocked && Number.isInteger(userId) && userId > 0 && (
                  <Button component={RouterLink} to={`/u/${userId}`} variant="outlined">
                    View profile
                  </Button>
                )}
                <Button component={RouterLink} to="/messages" variant="contained">
                  Back to messages
                </Button>
              </Stack>
            }
          />
        </Card>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout maxWidth={520}>
      <Card>
        <Stack spacing={2} sx={{ alignItems: "center", py: 8 }}>
          <CircularProgress size={24} thickness={5} sx={{ color: "text.secondary" }} />
          <Typography variant="body2" color="text.secondary">
            Opening your conversation...
          </Typography>
        </Stack>
      </Card>
    </ContentLayout>
  );
}
