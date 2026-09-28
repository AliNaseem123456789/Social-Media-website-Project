import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge, Box, CircularProgress, IconButton, InputAdornment, Skeleton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { BellOff, MessagesSquare, PhoneCall, Search, SearchX, UsersRound } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import { useDebounce } from "../../../hooks/useDebounce";
import { queryKeys } from "../../../lib/queryClient";
import { shortTime } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import { chatService } from "../services/chatService";
import ConversationAvatar from "./ConversationAvatar";
import NewGroupDialog from "./NewGroupDialog";

const MIN_SEARCH = 2;

const rowSx = {
  display: "flex",
  width: "100%",
  boxSizing: "border-box",
  gap: 1.5,
  alignItems: "center",
  p: 1.25,
  borderRadius: 3,
  textDecoration: "none",
  textAlign: "left",
  border: 0,
  cursor: "pointer",
  color: "inherit",
  fontFamily: "inherit",
  bgcolor: "transparent",
  transition: "background-color .15s",
  "&:hover": { bgcolor: tokens.paperDeep },
  "&:focus-visible": { outline: `2px solid ${tokens.ember}`, outlineOffset: -2 },
  "&.active": { bgcolor: tokens.emberTint },
};

function previewFor(conversation, myId) {
  const message = conversation.lastMessage;
  if (!message) return "No messages yet";
  if (message.deleted) return "Message deleted";
  const body = message.text?.trim() ? message.text : message.imageUrl ? "Sent a photo" : "";
  if (message.from === myId) return `You: ${body}`;
  if (conversation.type === "group") return `${message.sender?.username ?? "Someone"}: ${body}`;
  return body;
}

function Highlight({ text, term }) {
  const index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <Box component="mark" sx={{ bgcolor: tokens.emberTint, color: tokens.emberInk, px: 0.25, borderRadius: "4px" }}>
        {text.slice(index, index + term.length)}
      </Box>
      {text.slice(index + term.length)}
    </>
  );
}

function ListSkeleton() {
  return [0, 1, 2, 3].map((index) => (
    <Stack key={index} direction="row" spacing={1.5} sx={{ p: 1.25, alignItems: "center" }}>
      <Skeleton variant="circular" width={44} height={44} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="50%" />
        <Skeleton width="80%" />
      </Box>
    </Stack>
  ));
}

export default function ConversationList({ myId }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [creating, setCreating] = useState(false);
  const debounced = useDebounce(term.trim(), 350);
  const searching = debounced.length >= MIN_SEARCH;

  const conversations = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: chatService.conversations,
    refetchInterval: 60_000,
  });
  const search = useQuery({
    queryKey: queryKeys.chatSearch(debounced),
    queryFn: () => chatService.search({ q: debounced, limit: 25 }),
    enabled: searching,
    placeholderData: (previous) => previous,
  });

  const items = conversations.data?.items ?? [];
  const titles = useMemo(
    () => new Map((conversations.data?.items ?? []).map((item) => [item.id, item.title])),
    [conversations.data],
  );
  const hits = search.data?.items ?? [];

  return (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 1.5 }}>
          <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }}>
            Messages
          </Typography>
          <Tooltip title="Call history">
            <IconButton component={NavLink} to="/calls" size="small" aria-label="Call history">
              <PhoneCall size={17} />
            </IconButton>
          </Tooltip>
          <Tooltip title="New group">
            <IconButton onClick={() => setCreating(true)} size="small" aria-label="New group">
              <UsersRound size={17} />
            </IconButton>
          </Tooltip>
        </Stack>
        <TextField
          size="small"
          placeholder="Search conversations and messages"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
              endAdornment:
                searching && search.isFetching ? (
                  <CircularProgress size={15} thickness={5} sx={{ color: tokens.inkFaint }} />
                ) : undefined,
            },
            htmlInput: { "aria-label": "Search conversations and messages" },
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 1 }}>
        {searching ? (
          <>
            {search.isLoading && <ListSkeleton />}
            {!search.isLoading && hits.length === 0 && (
              <EmptyState compact icon={SearchX} title="No messages found" description={`Nothing matches "${debounced}".`} />
            )}
            {hits.map((message) => (
              <Box
                key={message.id}
                component="button"
                type="button"
                onClick={() => navigate(`/messages/${message.conversationId}`)}
                sx={rowSx}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 650, fontSize: "0.92rem" }}>
                      {titles.get(message.conversationId) ?? message.conversation?.title ?? message.sender?.username ?? "Conversation"}
                    </Typography>
                    <Typography variant="caption" sx={{ flexShrink: 0 }}>
                      {shortTime(message.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" noWrap sx={{ color: tokens.inkSoft }}>
                    {message.from === myId ? "You: " : `${message.sender?.username ?? "Someone"}: `}
                    <Highlight text={message.text ?? ""} term={debounced} />
                  </Typography>
                </Box>
              </Box>
            ))}
          </>
        ) : (
          <>
            {conversations.isLoading && <ListSkeleton />}
            {!conversations.isLoading && items.length === 0 && (
              <EmptyState
                compact
                icon={MessagesSquare}
                title="No conversations"
                description="Start one from a friend's profile, or create a group."
              />
            )}
            {items.map((conversation) => (
              <Box key={conversation.id} component={NavLink} to={`/messages/${conversation.id}`} sx={rowSx}>
                <ConversationAvatar conversation={conversation} size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 650, fontSize: "0.92rem" }}>
                      {conversation.title}
                    </Typography>
                    <Typography variant="caption" sx={{ flexShrink: 0 }}>
                      {shortTime(conversation.lastMessageAt ?? conversation.createdAt)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ flex: 1, minWidth: 0, color: conversation.unreadCount ? tokens.ink : tokens.inkFaint, fontWeight: conversation.unreadCount ? 600 : 400 }}
                    >
                      {previewFor(conversation, myId)}
                    </Typography>
                    {conversation.muted && (
                      <Box role="img" aria-label="Notifications muted" sx={{ display: "flex", flexShrink: 0, color: tokens.inkFaint }}>
                        <BellOff size={14} />
                      </Box>
                    )}
                    {conversation.unreadCount > 0 && (
                      <Badge
                        color="primary"
                        badgeContent={conversation.unreadCount}
                        max={99}
                        sx={{
                          flexShrink: 0,
                          "& .MuiBadge-badge": {
                            position: "static",
                            transform: "none",
                            ...(conversation.muted ? { bgcolor: tokens.surfaceMuted, color: tokens.inkSoft } : null),
                          },
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              </Box>
            ))}
          </>
        )}
      </Box>

      {creating && <NewGroupDialog open onClose={() => setCreating(false)} />}
    </Stack>
  );
}
