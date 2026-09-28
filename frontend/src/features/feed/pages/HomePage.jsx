import { useSearchParams } from "react-router-dom";
import { Box, Button, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Compass, Sparkles, Users } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { tokens } from "../../../theme/tokens";
import Composer from "../../posts/components/Composer";
import PostList from "../../posts/components/PostList";
import TrendingCard from "../components/TrendingCard";
import SuggestionsCard from "../components/SuggestionsCard";
import { feedService } from "../services/feedService";

const MODES = [
  { value: "for-you", label: "For you", icon: Sparkles },
  { value: "following", label: "Following", icon: Users },
  { value: "global", label: "Discover", icon: Compass },
];

const EMPTY = {
  "for-you": { title: "Your feed is quiet", description: "Add friends or share your first post to get things going." },
  following: { title: "No posts from your circle yet", description: "When your friends post, it shows up here." },
  global: { title: "No posts yet", description: "Be the first to share something." },
};

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const mode = MODES.some((m) => m.value === params.get("feed")) ? params.get("feed") : "for-you";
  useDocumentTitle("Home");

  const query = useInfiniteList(queryKeys.feed(mode), (cursor) => feedService.get({ mode, cursor, limit: 10 }));
  const servedMode = query.data?.pages?.[0]?.mode;

  return (
    <ContentLayout
      aside={
        <>
          <SuggestionsCard />
          <TrendingCard />
        </>
      }
    >
      <Stack spacing={2}>
        <Composer />

        <Box sx={{ position: "sticky", top: 64, zIndex: 5, bgcolor: tokens.paper, mx: -0.5, px: 0.5, pt: 0.5 }}>
          <Tabs
            value={mode}
            onChange={(_, value) => setParams(value === "for-you" ? {} : { feed: value }, { replace: true })}
            sx={{ borderBottom: `1px solid ${tokens.line}` }}
          >
            {MODES.map(({ value, label, icon: Icon }) => (
              <Tab key={value} value={value} label={label} icon={<Icon size={16} />} iconPosition="start" />
            ))}
          </Tabs>
        </Box>

        {mode === "for-you" && servedMode === "following" && (
          <Typography variant="caption" sx={{ px: 0.5 }}>
            We're personalizing your feed. Showing the latest from your circle meanwhile.
          </Typography>
        )}

        <PostList
          query={query}
          emptyTitle={EMPTY[mode].title}
          emptyDescription={EMPTY[mode].description}
          emptyAction={
            mode !== "global" ? (
              <Button variant="outlined" onClick={() => setParams({ feed: "global" })}>
                Explore Discover
              </Button>
            ) : null
          }
        />
      </Stack>
    </ContentLayout>
  );
}
