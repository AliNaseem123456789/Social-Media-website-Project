// Place at: src/features/profile/components/ProfileTabs.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Tabs, Tab, Box, Typography, Grid, Stack, Skeleton, Button } from "@mui/material";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import WcRoundedIcon from "@mui/icons-material/WcRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import { postService } from "../../posts/services/postService";
import ProfilePostCard from "../../posts/components/ProfilePostCard";
import { T } from "../../../styles/circleTokens";

function EmptyState({ icon, title, subtitle }) {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "16px",
          bgcolor: T.emberTint,
          color: T.emberInk,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 17, color: T.ink }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: T.inkSoft, mt: 0.5, maxWidth: 340, mx: "auto" }}>
        {subtitle}
      </Typography>
    </Box>
  );
}

function PostSkeleton() {
  return (
    <Box sx={{ mb: 2.5, p: 3, bgcolor: T.surface, borderRadius: "20px", border: `1px solid ${T.line}` }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Skeleton variant="circular" width={44} height={44} />
        <Box sx={{ width: "40%" }}>
          <Skeleton width="100%" height={16} sx={{ borderRadius: 1 }} />
          <Skeleton width="60%" height={12} sx={{ borderRadius: 1, mt: 0.5 }} />
        </Box>
      </Stack>
      <Skeleton variant="rectangular" height={170} sx={{ borderRadius: "14px", mb: 2 }} />
      <Skeleton width="90%" height={14} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

const ProfileTabs = ({ userId, isOwn, profile }) => {
  const [value, setValue] = useState(0);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(isOwn);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const fetchPosts = useCallback(async (cursor = null, append = false) => {
    if (!isOwn) return;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await postService.getUserPosts(cursor, 10, "recent", "all", "all", 0);
      const data = res.data || [];
      const pagination = res.pagination || { hasMore: false, nextCursor: null };
      setPosts((prev) => (append ? [...prev, ...data] : data));
      setHasMore(pagination.hasMore);
      setNextCursor(pagination.nextCursor);
    } catch (err) {
      console.error("Error fetching profile posts:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isOwn]);

  useEffect(() => {
    if (isOwn) fetchPosts(null, false);
    else {
      setPosts([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwn, userId]);

  const handleLike = async (postId, e) => {
    e.preventDefault();
    try {
      const res = await postService.likePost(postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => ((p.post_id || p.id) === postId ? { ...p, total_likes: res.total_likes, liked: res.liked } : p))
        );
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const photoPosts = posts.filter((p) => p.image_url);

  return (
    <Box>
      <Tabs
        value={value}
        onChange={(e, val) => setValue(val)}
        sx={{
          mb: 2.5,
          minHeight: 40,
          borderBottom: `1px solid ${T.line}`,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            fontFamily: T.fontBody,
            minHeight: 40,
            color: T.inkFaint,
          },
          "& .Mui-selected": { color: `${T.emberInk} !important` },
          "& .MuiTabs-indicator": { height: 2.5, borderRadius: "3px 3px 0 0", bgcolor: T.ember },
        }}
      >
        <Tab label="Posts" />
        <Tab label="Photos" />
        <Tab label="About" />
      </Tabs>

      {value === 0 &&
        (!isOwn ? (
          <EmptyState
            icon={<LockClockRoundedIcon />}
            title="Posts aren't visible here yet"
            subtitle="Viewing another person's posts needs a per-user posts endpoint on the backend — right now only your own posts can be loaded here."
          />
        ) : loading ? (
          <Box>
            <PostSkeleton />
            <PostSkeleton />
          </Box>
        ) : posts.length === 0 ? (
          <EmptyState icon={<ArticleRoundedIcon />} title="No posts yet" subtitle="Anything you share will show up here." />
        ) : (
          <Box>
            {posts.map((post) => (
              <ProfilePostCard key={post.post_id || post.id} post={post} onLike={handleLike} />
            ))}
            {hasMore && (
              <Box sx={{ textAlign: "center", pb: 2 }}>
                <Button
                  onClick={() => fetchPosts(nextCursor, true)}
                  disabled={loadingMore}
                  sx={{ borderRadius: "999px", textTransform: "none", fontWeight: 600, color: T.emberInk }}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </Box>
            )}
          </Box>
        ))}

      {value === 1 &&
        (!isOwn ? (
          <EmptyState
            icon={<LockClockRoundedIcon />}
            title="Photos aren't visible here yet"
            subtitle="This depends on the same per-user posts data as the Posts tab."
          />
        ) : loading ? (
          <Grid container spacing={1}>
            {Array.from(new Array(6)).map((_, i) => (
              <Grid item xs={4} key={i}>
                <Skeleton variant="rounded" sx={{ aspectRatio: "1/1", borderRadius: "12px" }} />
              </Grid>
            ))}
          </Grid>
        ) : photoPosts.length === 0 ? (
          <EmptyState icon={<PhotoLibraryRoundedIcon />} title="No photos yet" subtitle="Photos from your posts will appear here." />
        ) : (
          <Grid container spacing={1}>
            {photoPosts.map((post) => (
              <Grid item xs={4} key={post.post_id || post.id}>
                <Box
                  component="img"
                  src={post.image_url}
                  alt=""
                  loading="lazy"
                  sx={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "12px" }}
                />
              </Grid>
            ))}
          </Grid>
        ))}

      {value === 2 && (
        <Stack spacing={1.75} sx={{ py: 0.5 }}>
          {profile?.bio && (
            <Typography sx={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.65 }}>{profile.bio}</Typography>
          )}
          <Stack spacing={1.25}>
            {[
              { icon: PublicRoundedIcon, value: profile?.country, fallback: "Location not set" },
              { icon: SchoolRoundedIcon, value: profile?.education, fallback: "Education not set" },
              { icon: WcRoundedIcon, value: profile?.gender, fallback: "Gender not set" },
              { icon: CakeRoundedIcon, value: profile?.age ? `${profile.age} years old` : null, fallback: "Age not set" },
            ].map(({ icon: Icon, value, fallback }, i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                <Icon sx={{ fontSize: 18, color: T.emberInk }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: value ? T.ink : T.inkFaint }}>
                  {value || fallback}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}
    </Box>
  );
};

export default ProfileTabs;