import { Avatar } from "@mui/material";
import { Users } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import { colorFor } from "../../../theme/tokens";

export default function ConversationAvatar({ conversation, size = 44, showPresence = true }) {
  if (!conversation) return <Avatar sx={{ width: size, height: size }} />;

  if (conversation.type === "group") {
    return (
      <Avatar
        src={conversation.imageUrl || undefined}
        alt={conversation.title}
        sx={{ width: size, height: size, bgcolor: colorFor(conversation.title), color: "#fff" }}
      >
        <Users size={Math.round(size * 0.44)} strokeWidth={1.9} />
      </Avatar>
    );
  }

  const partner = conversation.partner ?? { id: conversation.id, username: conversation.title, avatarUrl: conversation.imageUrl };
  return <UserAvatar user={partner} size={size} online={showPresence ? Boolean(partner.online) : undefined} />;
}
