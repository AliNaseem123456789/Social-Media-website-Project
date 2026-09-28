import { Link as RouterLink, useParams } from "react-router-dom";
import { Button } from "@mui/material";
import { Hash } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { compactNumber } from "../../../lib/format";
import { postService } from "../services/postService";
import { useTrendingHashtags } from "../hooks";
import PostList from "../components/PostList";
import TrendingCard from "../../feed/components/TrendingCard";

export default function HashtagPage() {
  const tag = String(useParams().tag ?? "")
    .replace(/^#/, "")
    .toLowerCase();

  const query = useInfiniteList(queryKeys.hashtagPosts(tag), (cursor) =>
    postService.list({ hashtag: tag, cursor, limit: 10 }),
  );
  const { data: trending = [] } = useTrendingHashtags();
  const trend = trending.find((entry) => entry.tag === tag);
  useDocumentTitle(tag ? `#${tag}` : "Hashtag");

  return (
    <ContentLayout aside={<TrendingCard />}>
      <PageHeader
        eyebrow="Hashtag"
        title={`#${tag}`}
        subtitle={
          trend
            ? `${compactNumber(trend.posts)} ${trend.posts === 1 ? "post" : "posts"} in the last week`
            : "Every post carrying this tag, newest first."
        }
      />
      <PostList
        query={query}
        emptyIcon={Hash}
        emptyTitle={`Nothing tagged #${tag} yet`}
        emptyDescription="Be the first to use this tag in a post."
        emptyAction={
          <Button variant="outlined" component={RouterLink} to="/home">
            Go to feed
          </Button>
        }
      />
    </ContentLayout>
  );
}
