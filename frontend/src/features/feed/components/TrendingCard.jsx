import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { Heart, MessageCircle } from "lucide-react";
import SectionCard from "../../../components/ui/SectionCard";
import { queryKeys } from "../../../lib/queryClient";
import { compactNumber } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import { useTrendingHashtags } from "../../posts/hooks";
import { feedService } from "../services/feedService";

const TAG_LIMIT = 6;

const rowSx = {
  display: "flex",
  gap: 1.5,
  py: 1,
  px: 1,
  mx: -1,
  borderRadius: 2,
  textDecoration: "none",
  color: "inherit",
  "&:hover": { bgcolor: tokens.paper },
};

export default function TrendingCard() {
  const { data = [], isLoading } = useQuery({ queryKey: queryKeys.trending, queryFn: () => feedService.trending(5), staleTime: 120_000 });
  const { data: tags = [], isLoading: tagsLoading } = useTrendingHashtags();
  const topTags = tags.slice(0, TAG_LIMIT);

  return (
    <SectionCard title="Trending this week" subtitle="Most loved posts across Circle">
      {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} height={46} />)}
      {!isLoading && data.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Nothing trending yet.
        </Typography>
      )}
      <Stack spacing={0.5}>
        {data.map((post, index) => (
          <Box key={post.id} component={RouterLink} to={`/posts/${post.id}`} sx={rowSx}>
            <Typography sx={{ fontFamily: tokens.fontMono, color: tokens.inkFaint, fontSize: "0.8rem", pt: 0.25 }}>{String(index + 1).padStart(2, "0")}</Typography>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {post.content || "Photo post"}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 0.25, color: tokens.inkFaint, alignItems: "center" }}>
                <Typography variant="caption">{post.author?.username}</Typography>
                <Stack direction="row" spacing={0.4} sx={{ alignItems: "center" }}>
                  <Heart size={12} />
                  <Typography variant="caption">{compactNumber(post.likeCount)}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.4} sx={{ alignItems: "center" }}>
                  <MessageCircle size={12} />
                  <Typography variant="caption">{compactNumber(post.commentCount)}</Typography>
                </Stack>
              </Stack>
            </Box>
          </Box>
        ))}
      </Stack>

      {(tagsLoading || topTags.length > 0) && (
        <>
          <Divider sx={{ my: 1.75 }} />
          <Typography variant="overline" color="text.disabled" sx={{ display: "block", mb: 0.5 }}>
            Hashtags
          </Typography>
          {tagsLoading && [0, 1, 2].map((i) => <Skeleton key={i} height={34} />)}
          <Stack spacing={0.25}>
            {topTags.map((entry) => (
              <Box key={entry.tag} component={RouterLink} to={`/tags/${entry.tag}`} sx={{ ...rowSx, py: 0.75, alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ fontWeight: 650, color: tokens.ink, minWidth: 0 }} noWrap>
                  #{entry.tag}
                </Typography>
                <Typography variant="caption" sx={{ flexShrink: 0 }}>
                  {compactNumber(entry.posts)} {entry.posts === 1 ? "post" : "posts"}
                </Typography>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </SectionCard>
  );
}
