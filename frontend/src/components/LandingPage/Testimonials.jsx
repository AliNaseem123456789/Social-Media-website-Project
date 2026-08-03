const quotes = [
  {
    text: "I run a 300-person book club and this is the first app where people actually show up in the chat, not just the RSVP list.",
    name: "Owen T.",
    role: "Community organizer",
    color: "#e0431f",
  },
  {
    text: "The feed doesn't feel like it's fighting me for attention. It just shows me the people I'd want to hear from anyway.",
    name: "Priya N.",
    role: "Product designer",
    color: "#1c7a54",
  },
  {
    text: "Video calls that open straight from a chat thread sound small until you've used them every week for six months.",
    name: "Rei M.",
    role: "Freelance illustrator",
    color: "#4a463f",
  },
  {
    text: "Moved my whole hiking group over from a group chat that kept losing photos. Nobody's asked to go back.",
    name: "Kian D.",
    role: "Trail Runners NYC",
    color: "#c93a19",
  },
  {
    text: "The birthday reminders sound minor until you realize you've stopped forgetting your closest friends' birthdays.",
    name: "Ferdi A.",
    role: "Software engineer",
    color: "#e0431f",
  },
  {
    text: "Setting up a private group for our extended family took four minutes. My parents actually use it.",
    name: "Amara O.",
    role: "Teacher",
    color: "#1c7a54",
  },
];

export function Testimonials() {
  return (
    <section className="lp-section-pad">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div className="lp-section-head__copy">
            <span className="lp-eyebrow">From the community</span>
            <h2 className="lp-h2">People stay for the conversations</h2>
          </div>
        </div>

        <div className="lp-wall__grid">
          {quotes.map((q) => (
            <div className="lp-quote-card" key={q.name}>
              <p className="lp-quote-card__text">&ldquo;{q.text}&rdquo;</p>
              <div className="lp-quote-card__who">
                <span className="lp-quote-card__avatar" style={{ background: q.color }}>
                  {q.name.charAt(0)}
                </span>
                <div>
                  <div className="lp-quote-card__name">{q.name}</div>
                  <div className="lp-quote-card__role">{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}