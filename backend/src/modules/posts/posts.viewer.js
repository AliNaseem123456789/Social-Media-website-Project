import { postsRepository } from "./posts.repository.js";

/**
 * Adds the viewer's own like / save / repost flags to already presented posts. Shared by the posts,
 * feed and search modules so every list answers with the same shape.
 */
export async function withPostViewerState(posts, viewerId) {
  const ids = posts.flatMap((p) => [p.id, p.repostOf?.id]).filter(Boolean);
  const state = await postsRepository.viewerState(viewerId, ids);
  return posts.map((p) => ({
    ...p,
    likedByMe: state.liked.has(p.id),
    savedByMe: state.saved.has(p.id),
    repostedByMe: state.reposted.has(p.repostOf?.id ?? p.id),
  }));
}
