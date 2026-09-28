import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, Chip, InputAdornment, Skeleton, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Hash, Search, SearchX } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import EmptyState from "../../../components/ui/EmptyState";
import { useDebounce } from "../../../hooks/useDebounce";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { compactNumber } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import PostCard from "../../posts/components/PostCard";
import PersonRow from "../../friends/components/PersonRow";
import FriendButton from "../../friends/components/FriendButton";
import TrendingCard from "../../feed/components/TrendingCard";
import { searchService } from "../services/searchService";

const TYPES = ["all", "users", "posts", "hashtags"];

function HashtagResults({ hashtags }) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.25 }}>
        Hashtags
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {hashtags.map(({ tag, posts }) => (
          <Chip
            key={tag}
            component={RouterLink}
            to={`/tags/${String(tag).toLowerCase()}`}
            clickable
            icon={<Hash size={14} />}
            label={
              <Box component="span" sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.75 }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {tag}
                </Box>
                <Box component="span" sx={{ color: tokens.inkFaint, fontSize: "0.76rem" }}>
                  {compactNumber(posts)} {posts === 1 ? "post" : "posts"}
                </Box>
              </Box>
            }
            sx={{
              height: 36,
              px: 0.5,
              bgcolor: tokens.surfaceMuted,
              border: `1px solid ${tokens.line}`,
              "& .MuiChip-icon": { color: tokens.inkFaint, ml: 1 },
              "&:hover": { bgcolor: tokens.emberTint, borderColor: `color-mix(in srgb, ${tokens.ember} 35%, transparent)` },
              "&:focus-visible": { outline: `2px solid ${tokens.ink}`, outlineOffset: 2 },
            }}
          />
        ))}
      </Stack>
    </Card>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") || "";
  const type = TYPES.includes(params.get("type")) ? params.get("type") : "all";
  const [term, setTerm] = useState(initial);
  const debounced = useDebounce(term.trim(), 350);
  useDocumentTitle(debounced ? `Search: ${debounced}` : "Search");

  useEffect(() => setTerm(initial), [initial]);

  useEffect(() => {
    if (debounced !== (params.get("q") || "")) {
      setParams(debounced ? { q: debounced, ...(type !== "all" ? { type } : {}) } : {}, { replace: true });
    }
  }, [debounced, params, setParams, type]);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: queryKeys.search(debounced, type),
    queryFn: () => searchService.search(debounced, type, type === "all" ? 8 : 25),
    enabled,
    placeholderData: (previous) => previous,
  });

  const users = data?.users ?? [];
  const posts = data?.posts ?? [];
  const hashtags = data?.hashtags ?? [];
  const nothingFound = users.length === 0 && posts.length === 0 && hashtags.length === 0;

  return (
    <ContentLayout aside={<TrendingCard />}>
      <TextField
        autoFocus
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search people, posts and hashtags"
        slotProps={{
          input: {
            "aria-label": "Search Circle",
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
            sx: { borderRadius: 999, fontSize: "1rem", bgcolor: tokens.surface },
          },
        }}
      />
      <Tabs
        value={type}
        onChange={(_, v) => setParams({ ...(debounced ? { q: debounced } : {}), ...(v !== "all" ? { type: v } : {}) }, { replace: true })}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ my: 2, borderBottom: `1px solid ${tokens.line}` }}
      >
        <Tab value="all" label="Top" />
        <Tab value="users" label="People" />
        <Tab value="posts" label="Posts" />
        <Tab value="hashtags" label="Hashtags" />
      </Tabs>

      {!enabled && (
        <EmptyState
          icon={Search}
          title="Search Circle"
          description="Find people by name, posts by what they say, or hashtags by topic. Type at least 2 characters."
        />
      )}

      {enabled && isFetching && !data && (
        <Stack spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 4 }} />
          ))}
        </Stack>
      )}

      {enabled && data && nothingFound && (
        <EmptyState icon={SearchX} title={`No results for "${debounced}"`} description="Try a different spelling or a shorter search." />
      )}

      {enabled && data && (
        <Stack spacing={2.5} sx={{ opacity: isFetching ? 0.6 : 1, transition: "opacity .2s" }}>
          {users.length > 0 && type !== "posts" && type !== "hashtags" && (
            <Card sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                People
              </Typography>
              {users.map((u) => (
                <PersonRow key={u.id} user={u} showFollow action={<FriendButton userId={u.id} size="small" />} />
              ))}
            </Card>
          )}
          {hashtags.length > 0 && type !== "users" && type !== "posts" && <HashtagResults hashtags={hashtags} />}
          {posts.length > 0 && type !== "users" && type !== "hashtags" && (
            <Stack spacing={2}>
              {type === "all" && (
                <Typography variant="subtitle1" sx={{ px: 0.5 }}>
                  Posts
                </Typography>
              )}
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </ContentLayout>
  );
}
