import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/socketContext";
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Favorite as FavoriteIcon,
  ChatBubbleOutline as CommentIcon,
  PersonAdd as FollowIcon,
  People as FriendIcon,
  DoneAll as DoneAllIcon,
  Circle as CircleIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { Link, useNavigate, useLocation } from "react-router-dom";
// Styled components
const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#ff4757",
    color: "white",
    fontSize: "10px",
    fontWeight: "bold",
    minWidth: "20px",
    height: "20px",
    borderRadius: "10px",
    padding: "0 5px",
  },
}));

const NotificationItem = styled(ListItem)(({ theme, unread }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: "8px",
  cursor: "pointer",
  backgroundColor: unread ? alpha(theme.palette.primary.main, 0.05) : "transparent",
  borderLeft: unread ? `3px solid ${theme.palette.primary.main}` : "3px solid transparent",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const NotificationBell = () => {
  const theme = useTheme();
  const { unreadCount, setUnreadCount } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const intervalRef = useRef(null);
  const isFirstLoad = useRef(true);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Poll for unread count updates (every 30 seconds)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setUnreadCount]);

 const fetchNotifications = async () => {
  try {
    setLoading(true);
    const response = await fetch("http://localhost:5000/api/notifications", {
      credentials: "include",
    });
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Notifications raw data:", data);
    setNotifications(data);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
  } finally {
    setLoading(false);
    isFirstLoad.current = false;
  }
};
  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(true);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setIsOpen(false);
  };
  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        credentials: "include",
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      const response = await fetch("/api/notifications/read-all", {
        method: "PUT",
        credentials: "include",
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type) => {
    const iconProps = { fontSize: "small" };
    switch (type?.toLowerCase()) {
      case "like":
        return <FavoriteIcon sx={{ color: "#ff4757" }} {...iconProps} />;
      case "comment":
        return <CommentIcon sx={{ color: "#2ecc71" }} {...iconProps} />;
      case "follow":
        return <FollowIcon sx={{ color: "#3498db" }} {...iconProps} />;
      case "friend_request":
        return <FriendIcon sx={{ color: "#f39c12" }} {...iconProps} />;
      case "friend_accept":
        return <FriendIcon sx={{ color: "#2ecc71" }} {...iconProps} />;
      default:
        return <NotificationsNoneIcon sx={{ color: "#95a5a6" }} {...iconProps} />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const open = Boolean(anchorEl);
  const id = open ? "notification-popover" : undefined;
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <>
      <IconButton
        aria-describedby={id}
        onClick={handleOpen}
        sx={{
          borderRadius: "12px",
          padding: "10px",
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        <StyledBadge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? (
            <NotificationsIcon sx={{ color: "#1877f2" }} />
          ) : (
            <NotificationsNoneIcon sx={{ color: "#65676b" }} />
          )}
        </StyledBadge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
            mt: 1,
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Notifications
          </Typography>
          {hasUnread && (
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              sx={{
                textTransform: "none",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              {markingAll ? "Marking..." : "Mark all read"}
            </Button>
          )}
        </Box>

        {/* Notification List */}
        <Box
          sx={{
            maxHeight: 400,
            overflowY: "auto",
            bgcolor: "background.default",
          }}
        >
          {loading && isFirstLoad.current ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 4,
              }}
            >
              <CircularProgress size={30} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 4,
                color: "text.secondary",
              }}
            >
              <NotificationsNoneIcon sx={{ fontSize: 48, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ mt: 1 }}>
                No notifications yet
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                When you get notifications, they'll appear here
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    unread={!notification.read}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: !notification.read
                            ? alpha(theme.palette.primary.main, 0.15)
                            : "action.selected",
                          width: 40,
                          height: 40,
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          fontWeight={!notification.read ? 600 : 400}
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {notification.content}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", display: "block", mt: 0.5 }}
                        >
                          {getTimeAgo(notification.created_at)}
                        </Typography>
                      }
                    />
                    {!notification.read && (
                      <CircleIcon
                        sx={{
                          color: theme.palette.primary.main,
                          fontSize: 10,
                          ml: 1,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </NotificationItem>
                  {index < notifications.length - 1 && <Divider variant="inset" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
              textAlign: "center",
              bgcolor: "background.paper",
            }}
          >
            <Button
              component={Link}
              to="/notifications"
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: "text.secondary",
                "&:hover": { color: "primary.main" },
              }}
              onClick={handleClose}
            >
              View all notifications
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
};

export default NotificationBell;