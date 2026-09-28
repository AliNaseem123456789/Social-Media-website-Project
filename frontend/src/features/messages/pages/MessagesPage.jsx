import { useParams } from "react-router-dom";
import { Box, Card } from "@mui/material";
import { MessagesSquare } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { tokens } from "../../../theme/tokens";
import { useAuth } from "../../auth/context/AuthContext";
import ConversationList from "../components/ConversationList";
import ChatThread from "../components/ChatThread";

export default function MessagesPage() {
  const { user } = useAuth();
  const conversationId = Number(useParams().conversationId) || null;
  useDocumentTitle("Messages");

  return (
    <Card sx={{ display: "flex", height: { xs: "calc(100dvh - 180px)", md: "calc(100dvh - 112px)" }, overflow: "hidden", p: 0 }}>
      <Box
        sx={{
          width: { xs: "100%", md: 320 },
          flexShrink: 0,
          borderRight: { md: `1px solid ${tokens.line}` },
          display: { xs: conversationId ? "none" : "block", md: "block" },
        }}
      >
        <ConversationList myId={user?.id} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: { xs: conversationId ? "block" : "none", md: "block" } }}>
        {conversationId ? (
          <ChatThread key={conversationId} conversationId={conversationId} />
        ) : (
          <Box sx={{ height: "100%", display: "grid", placeItems: "center", bgcolor: tokens.paper }}>
            <EmptyState
              icon={MessagesSquare}
              title="Your messages"
              description="Pick a conversation, start a group, or message a friend from their profile."
            />
          </Box>
        )}
      </Box>
    </Card>
  );
}
