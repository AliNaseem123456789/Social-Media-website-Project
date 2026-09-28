/**
 * The reason list itself comes from the server. This only supplies the wording, so a reason the server
 * adds later still shows up, with its key turned into a readable label.
 */
const REASONS = {
  spam: { label: "Spam", hint: "Repetitive posts, scams or unwanted promotion." },
  harassment: { label: "Harassment or bullying", hint: "Insults, threats or repeated unwanted contact." },
  hate: { label: "Hate speech", hint: "Attacks on people for who they are." },
  violence: { label: "Violence or threats", hint: "Threats of harm, or content that celebrates it." },
  nudity: { label: "Nudity or sexual content", hint: "Sexual content, or images shared without consent." },
  self_harm: { label: "Self-harm or suicide", hint: "Someone may be at risk of hurting themselves." },
  impersonation: { label: "Impersonation", hint: "Pretending to be someone else." },
  misinformation: { label: "False information", hint: "Misleading claims presented as fact." },
  other: { label: "Something else", hint: "Tell us what happened in your own words." },
};

const humanise = (key) => {
  const words = String(key).replace(/_/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Other";
};

export const reasonLabel = (key) => REASONS[key]?.label ?? humanise(key);

export const reasonHint = (key) => REASONS[key]?.hint ?? "";

const SUBJECT_NOUNS = { post: "post", comment: "comment", message: "message", user: "account" };

export const subjectNoun = (subjectType) => SUBJECT_NOUNS[subjectType] ?? "content";
