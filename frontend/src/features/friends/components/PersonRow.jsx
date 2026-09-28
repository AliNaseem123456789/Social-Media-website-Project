import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Stack, Typography } from "@mui/material";
import UserAvatar from "../../../components/ui/UserAvatar";
import { tokens } from "../../../theme/tokens";
import FollowButton from "../../profile/components/FollowButton";

export default function PersonRow({ user, subtitle, action, size = 44, showFollow = false }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 1, minWidth: 0 }}>
      <RouterLink to={`/u/${user.id}`}>
        <UserAvatar user={user} size={size} online={user.online} />
      </RouterLink>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link component={RouterLink} to={`/u/${user.id}`} underline="hover" noWrap sx={{ display: "block", color: tokens.ink, fontWeight: 650, fontSize: "0.92rem" }}>
          {user.username}
        </Link>
        {subtitle && (
          <Typography variant="caption" noWrap component="p">
            {subtitle}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexShrink: 0 }}>
        {showFollow && <FollowButton user={user} />}
        {action}
      </Stack>
    </Stack>
  );
}
