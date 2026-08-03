const faqs = [
  {
    q: "Is Circle free to use?",
    a: "Yes. The Personal plan is free forever and covers messaging, communities, and your feed. Plus and Community plans add tools for people who want more.",
  },
  {
    q: "Who can see what I post?",
    a: "You choose. Posts can go to your friends, a specific community, or stay visible only to people you've approved — nothing is public by default.",
  },
  {
    q: "How does the AI assistant work?",
    a: "It looks at your activity to suggest posts, people, and replies worth your time. It never sends or posts anything without you tapping to confirm.",
  },
  {
    q: "Can I move my existing group chat over?",
    a: "Most groups migrate in under ten minutes — create a community, invite your members, and pin your shared history at the top.",
  },
  {
    q: "What happens if I delete my account?",
    a: "Your messages, posts, and media are permanently removed from Circle within 30 days, in line with our data policy.",
  },
];

export function FAQ() {
  return (
    <section className="lp-section-pad" id="faq">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div className="lp-section-head__copy">
            <span className="lp-eyebrow">Questions</span>
            <h2 className="lp-h2">Good to know before you join</h2>
          </div>
        </div>

        <div className="lp-faq__list">
          {faqs.map((item, i) => (
            <details className="lp-faq__item" key={item.q} open={i === 0}>
              <summary>
                {item.q}
                <span className="lp-faq__icon" />
              </summary>
              <p className="lp-faq__answer">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}