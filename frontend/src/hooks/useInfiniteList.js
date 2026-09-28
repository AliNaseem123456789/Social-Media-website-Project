import { useInfiniteQuery } from "@tanstack/react-query";

/**
 * Wraps a cursor paginated endpoint ({ items, pageInfo: { hasMore, nextCursor } }) in an infinite query.
 */
export function useInfiniteList(queryKey, fetchPage, options = {}) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last, _pages, lastParam) => {
      const next = last?.pageInfo?.hasMore ? last.pageInfo.nextCursor : undefined;
      return next && next !== lastParam ? next : undefined;
    },
    ...options,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...query, items };
}
