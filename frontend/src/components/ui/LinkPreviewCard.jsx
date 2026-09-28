import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { Box, Card, Stack, Typography } from "@mui/material";
import { queryKeys } from "../../lib/queryClient";
import { shareService } from "../../lib/shareService";
import { tokens } from "../../theme/tokens";

/**
 * Compact card for a link to another post or profile inside this app. Failures render nothing, so a
 * deleted or private target just leaves the plain link in the text.
 */
export default function LinkPreviewCard({ url }) {
  const { data } = useQuery({
    queryKey: queryKeys.linkPreview(url),
    queryFn: () => shareService.resolve(url),
    enabled: Boolean(url),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!data) return null;
  const to = new URL(data.url).pathname;

  return (
    <Card
      component={RouterLink}
      to={to}
      sx={{
        display: "block",
        mt: 1.5,
        textDecoration: "none",
        overflow: "hidden",
        transition: "border-color .2s",
        "&:hover": { borderColor: tokens.inkFaint },
      }}
    >
      <Stack direction="row" sx={{ alignItems: "stretch" }}>
        {data.image && (
          <Box
            component="img"
            src={data.image}
            alt=""
            loading="lazy"
            sx={{ width: 96, height: 96, objectFit: "cover", flexShrink: 0, borderRight: `1px solid ${tokens.lineSoft}` }}
          />
        )}
        <Box sx={{ p: 1.5, minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: tokens.inkFaint }}>
            {data.kind === "profile" ? "Profile" : "Post"}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: tokens.ink }} noWrap>
            {data.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: tokens.inkSoft,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.description}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
