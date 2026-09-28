import { Bell, Bookmark, Compass, House, MessagesSquare, Settings, ShieldAlert, UserRound, Users } from "lucide-react";

export const navItems = (userId, { moderator = false } = {}) => [
  { to: "/home", label: "Home", icon: House },
  { to: "/search", label: "Explore", icon: Compass },
  { to: "/messages", label: "Messages", icon: MessagesSquare, badge: "messages" },
  { to: "/friends", label: "Friends", icon: Users, badge: "friendRequests" },
  { to: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: `/u/${userId}`, label: "Profile", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
  ...(moderator ? [{ to: "/moderation", label: "Moderation", icon: ShieldAlert, badge: "reports" }] : []),
];
