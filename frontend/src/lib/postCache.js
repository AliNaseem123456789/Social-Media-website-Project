function mapInfinite(data, fn) {
  if (!data?.pages) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: fn(page.items) })) };
}

const POST_LISTS = [["feed"], ["posts", "list"], ["posts", "liked"], ["posts", "saved"], ["posts", "hashtag"]];

/**
 * Applies an update to a post wherever it is cached: feeds, lists, saved and hashtag pages, trending
 * and the detail view. Reposts embed the original, so those copies are patched too.
 */
export function updatePostEverywhere(queryClient, postId, updater) {
  const apply = (post) => {
    if (!post) return post;
    if (post.id === postId) return { ...post, ...updater(post) };
    if (post.repostOf?.id === postId) {
      const patch = updater(post.repostOf);
      return { ...post, repostOf: { ...post.repostOf, ...patch } };
    }
    return post;
  };

  POST_LISTS.forEach((key) =>
    queryClient.setQueriesData({ queryKey: key }, (data) => mapInfinite(data, (items) => items.map(apply))),
  );
  queryClient.setQueryData(["posts", "detail", postId], (post) => apply(post));
  queryClient.setQueryData(["analytics", "trending"], (list) => (Array.isArray(list) ? list.map(apply) : list));
}

export function removePostEverywhere(queryClient, postId) {
  const drop = (items) => items.filter((p) => p.id !== postId);
  POST_LISTS.forEach((key) => queryClient.setQueriesData({ queryKey: key }, (data) => mapInfinite(data, drop)));
  queryClient.removeQueries({ queryKey: ["posts", "detail", postId] });
}

export function prependPost(queryClient, post) {
  const add = (data) => {
    if (!data?.pages?.length) return data;
    const [first, ...rest] = data.pages;
    return { ...data, pages: [{ ...first, items: [post, ...first.items] }, ...rest] };
  };
  queryClient.setQueryData(["feed", "for-you"], add);
  queryClient.setQueryData(["feed", "following"], add);
  queryClient.setQueryData(["feed", "global"], add);
  queryClient.invalidateQueries({ queryKey: ["posts", "list"] });
  queryClient.invalidateQueries({ queryKey: ["posts", "hashtag"] });
}

/**
 * Keeps the saved list in step with the save button without refetching the whole page.
 */
export function dropFromSaved(queryClient, postId) {
  queryClient.setQueriesData({ queryKey: ["posts", "saved"] }, (data) =>
    mapInfinite(data, (items) => items.filter((p) => p.id !== postId)),
  );
}
