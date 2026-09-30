// A plain list of what is built, moving past. The old version of this band invented activity
// ("Maya just joined…"); this one only names features that exist in the app.
const CAPABILITIES = [
  "Ranked feed",
  "Group chats",
  "Read receipts",
  "Voice and video calls",
  "Threaded replies",
  "@mentions",
  "#hashtags",
  "Saved posts",
  "Scheduled posts",
  "Multi-photo posts",
  "Alt text",
  "Followers and friends",
  "Private profiles",
  "Blocking and reports",
  "Unread counts",
  "Link previews",
  "Dark mode",
];

export function CapabilityBand() {
  const run = [...CAPABILITIES, ...CAPABILITIES];
  return (
    <div className="lp-band" aria-label="What is built into Circle">
      <div className="lp-band__track">
        {run.map((item, i) => (
          <span className="lp-band__item" key={`${item}-${i}`} aria-hidden={i >= CAPABILITIES.length}>
            <i className="lp-band__dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
