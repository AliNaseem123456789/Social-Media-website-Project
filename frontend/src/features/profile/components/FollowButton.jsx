import { Button } from "@mui/material";
import { UserMinus, UserPlus } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import { useToggleFollow } from "../hooks";

/**
 * One button for the whole app: profile header, follower lists and suggestion cards all share it so
 * the optimistic state stays consistent wherever a person appears twice on one screen.
 */
export default function FollowButton({ user, size = "small", fullWidth = false, variantWhenFollowing = "outlined" }) {
  const { user: me } = useAuth();
  const toggle = useToggleFollow();

  if (!user || !me || user.id === me.id) return null;
  const following = Boolean(user.followedByMe);

  return (
    <Button
      size={size}
      fullWidth={fullWidth}
      variant={following ? variantWhenFollowing : "contained"}
      startIcon={following ? <UserMinus size={15} /> : <UserPlus size={15} />}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ userId: user.id, following })}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
