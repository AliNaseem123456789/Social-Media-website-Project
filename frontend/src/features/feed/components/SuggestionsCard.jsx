import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Skeleton, Typography } from "@mui/material";
import SectionCard from "../../../components/ui/SectionCard";
import PersonRow from "../../friends/components/PersonRow";
import FollowButton from "../../profile/components/FollowButton";
import { queryKeys } from "../../../lib/queryClient";
import { suggestionService } from "../services/suggestionService";

const LIMIT = 5;

export default function SuggestionsCard() {
  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.suggestedPeople,
    queryFn: () => suggestionService.people({ limit: LIMIT }),
    select: (result) => result?.items ?? [],
    staleTime: 120_000,
  });

  return (
    <SectionCard
      title="Suggested for you"
      action={
        <Button size="small" component={RouterLink} to="/friends?tab=discover">
          See all
        </Button>
      }
    >
      {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} height={52} />)}
      {!isLoading && data.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No suggestions right now. Check back as more people join.
        </Typography>
      )}
      {data.map((person) => (
        <PersonRow
          key={person.id}
          user={person}
          size={40}
          subtitle={person.reason || person.bio}
          action={<FollowButton user={person} />}
        />
      ))}
    </SectionCard>
  );
}
