import { Link as RouterLink } from "react-router-dom";
import { Button } from "@mui/material";
import { Bookmark } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { postService } from "../services/postService";
import PostList from "../components/PostList";
import SuggestionsCard from "../../feed/components/SuggestionsCard";

export default function SavedPostsPage() {
  const query = useInfiniteList(queryKeys.savedPosts, (cursor) => postService.saved({ cursor, limit: 10 }));
  useDocumentTitle("Saved");

  return (
    <ContentLayout aside={<SuggestionsCard />}>
      <PageHeader
        eyebrow="Your library"
        title="Saved"
        subtitle="Posts you bookmarked. Only you can see this list."
        actions={
          <Button variant="text" component={RouterLink} to="/drafts">
            Drafts
          </Button>
        }
      />
      <PostList
        query={query}
        fromSaved
        emptyIcon={Bookmark}
        emptyTitle="Nothing saved yet"
        emptyDescription="Tap the bookmark on a post to keep it here for later."
        emptyAction={
          <Button variant="outlined" component={RouterLink} to="/home">
            Browse the feed
          </Button>
        }
      />
    </ContentLayout>
  );
}
