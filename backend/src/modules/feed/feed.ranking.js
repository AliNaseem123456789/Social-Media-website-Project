const HOUR = 60 * 60 * 1000;
const HALF_LIFE_HOURS = 24;

/**
 * Engagement-weighted score with exponential time decay. Own posts get a small boost.
 */
export function scorePost({ createdAt, likes, comments, isOwn }, now = Date.now()) {
  const ageHours = Math.max(0, (now - new Date(createdAt).getTime()) / HOUR);
  const engagement = 1 + likes * 1 + comments * 2;
  const decay = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
  return Number((engagement * decay * (isOwn ? 1.2 : 1) * 1000).toFixed(4));
}
