import React from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Stack,
  Box,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CommentIcon from "@mui/icons-material/Comment";
import ShareIcon from "@mui/icons-material/Share";
import { timeAgo } from "../../../utils/formatters";

const PostCard = ({ post, onLike }) => {
  const postId = post.post_id || post.id;
  const formattedTime = post.created_at
    ? timeAgo(new Date(post.created_at))
    : "Just now";
  const cardStyle = {
    marginBottom: 4,
    borderRadius: "24px",
    border: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
    transition: "all 0.3s ease-in-out",
    "&:hover": {
      boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
      transform: "translateY(-4px)",
    },
  };
  return (
    <Card sx={cardStyle}>
      <CardContent sx={{ p: "24px !important" }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Link
              to={`/profile/${post.user_id}`}
              style={{ textDecoration: "none" }}
            >
              <Avatar
                sx={{
                  width: 50,
                  height: 50,
                  background:
                    "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                  boxShadow: "0 4px 10px rgba(33, 150, 243, .3)",
                }}
              >
                {post.username?.charAt(0).toUpperCase()}
              </Avatar>
            </Link>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                {post.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formattedTime}
              </Typography>
            </Box>
          </Stack>
        </Stack>
        <Link
          to={`/fullpost/${postId}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Typography
            variant="body1"
            sx={{
              mb: 2,
              color: "#374151",
              fontSize: "1.05rem",
              lineHeight: 1.6,
            }}
          >
            {post.content}
          </Typography>
          {post.image_url && (
            <Box
              sx={{
                borderRadius: "16px",
                overflow: "hidden",
                mb: 2,
                border: "1px solid #f0f0f0",
              }}
            >
              <img
                src={post.image_url}
                alt="Post content"
                style={{
                  width: "100%",
                  display: "block",
                  maxHeight: "450px",
                  objectFit: "cover",
                }}
              />
            </Box>
          )}
        </Link>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ pt: 1, borderTop: "1px solid #f9fafb" }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton
              onClick={(e) => onLike(postId, e)}
              sx={{ color: "#ff4757" }}
            >
              {Number(post.total_likes) > 0 ? (
                <FavoriteIcon />
              ) : (
                <FavoriteBorderIcon />
              )}
            </IconButton>
            <Typography variant="body2" fontWeight="600">
              {post.total_likes || 0}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton color="primary">
              <CommentIcon sx={{ color: "#70a1ff" }} />
            </IconButton>
            <Typography variant="body2" fontWeight="600">
              {post.comments?.length || 0}
            </Typography>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton>
            <ShareIcon fontSize="small" sx={{ color: "#a4b0be" }} />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
};
export default PostCard;
