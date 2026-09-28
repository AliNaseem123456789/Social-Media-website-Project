import { Avatar, Badge } from "@mui/material";
import { colorFor, tokens } from "../../theme/tokens";
import { initials } from "../../lib/format";

export default function UserAvatar({ user, size = 40, online, sx, ...props }) {
  const name = user?.username || "";
  const avatar = (
    <Avatar
      src={user?.avatarUrl || undefined}
      alt={name}
      sx={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.38),
        bgcolor: colorFor(name || user?.id),
        color: "#fff",
        ...sx,
      }}
      {...props}
    >
      {initials(name)}
    </Avatar>
  );

  if (online === undefined) return avatar;

  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      variant="dot"
      invisible={!online}
      sx={{
        "& .MuiBadge-badge": {
          bgcolor: tokens.signal,
          width: Math.max(9, size * 0.24),
          height: Math.max(9, size * 0.24),
          borderRadius: "50%",
          border: `2px solid ${tokens.surface}`,
        },
      }}
    >
      {avatar}
    </Badge>
  );
}
