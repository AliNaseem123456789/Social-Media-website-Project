import { useEffect, useRef } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function InfiniteSentinel({ hasMore, loading, onLoadMore, endLabel = "You're all caught up" }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) onLoadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <Box ref={ref} sx={{ py: 3, display: "flex", justifyContent: "center" }}>
      {loading ? (
        <CircularProgress size={20} thickness={5} sx={{ color: "text.secondary" }} />
      ) : (
        !hasMore &&
        endLabel && (
          <Typography variant="overline" color="text.disabled">
            {endLabel}
          </Typography>
        )
      )}
    </Box>
  );
}
