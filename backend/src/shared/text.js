const HASHTAG_RE = /#([\p{L}\p{N}_]{1,50})/gu;
const MENTION_RE = /@([\p{L}\p{N}_.]{3,30})/gu;

const unique = (values) => [...new Set(values)];

export function extractHashtags(text) {
  if (!text) return [];
  return unique([...text.matchAll(HASHTAG_RE)].map((m) => m[1].toLowerCase())).slice(0, 20);
}

export function extractMentions(text) {
  if (!text) return [];
  return unique([...text.matchAll(MENTION_RE)].map((m) => m[1].toLowerCase())).slice(0, 20);
}

export const preview = (text, size = 140) =>
  text && text.length > size ? `${text.slice(0, size)}...` : text || "";
