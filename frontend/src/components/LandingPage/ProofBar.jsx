const tickerItems = [
  { text: <>Maya just joined <strong>Design Circle</strong></>, },
  { text: <>Ferdi started a thread in <strong>Photography</strong></>, },
  { text: <>12 people are live in <strong>Late Night Coders</strong></>, },
  { text: <>Priya shared 6 new photos</>, },
  { text: <>A new group formed: <strong>Home Bakers</strong></>, },
  { text: <>Kian and 3 friends started a call</>, },
];

export function LiveTicker() {
  const items = [...tickerItems, ...tickerItems];
  return (
    <div className="lp-ticker" aria-hidden="true">
      <div className="lp-ticker__track">
        {items.map((item, i) => (
          <div className="lp-ticker__item" key={i}>
            <span className="lp-ticker__dot" />
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

const stats = [
  { num: "60K+", label: "People connected" },
  { num: "1.4M", label: "Messages this month" },
  { num: "3,900", label: "Active communities" },
  { num: "99.95%", label: "Uptime, quietly" },
];

export function StatsStrip() {
  return (
    <div className="lp-wrap">
      <div className="lp-stats">
        {stats.map((s) => (
          <div className="lp-stats__item" key={s.label}>
            <div className="lp-stats__num">{s.num}</div>
            <div className="lp-stats__label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}