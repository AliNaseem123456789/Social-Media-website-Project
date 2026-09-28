import { Card, Skeleton, Stack, Box } from "@mui/material";

export default function PostSkeleton({ count = 3 }) {
  return Array.from({ length: count }, (_, i) => (
    <Card key={i} sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.5}>
        <Skeleton variant="circular" width={42} height={42} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="30%" height={20} />
          <Skeleton width="18%" height={16} />
          <Skeleton height={18} sx={{ mt: 1.5 }} />
          <Skeleton height={18} width="85%" />
          {i % 2 === 0 && <Skeleton variant="rounded" height={200} sx={{ mt: 1.5, borderRadius: 3 }} />}
        </Box>
      </Stack>
    </Card>
  ));
}
