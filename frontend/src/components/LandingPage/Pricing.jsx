import { Check } from "lucide-react";

const plans = [
  {
    name: "Personal",
    tagline: "Everything you need to stay close to your people.",
    price: "0",
    period: "forever",
    features: [
      "Unlimited private messaging",
      "Join up to 10 communities",
      "Standard-definition video calls",
      "Personalized feed",
    ],
    cta: "Start for free",
    featured: false,
  },
  {
    name: "Plus",
    tagline: "For the people who run the group chat.",
    price: "6",
    period: "per month",
    features: [
      "Everything in Personal",
      "Unlimited communities",
      "HD video calls & screen share",
      "AI co-pilot for posts & replies",
      "Priority notifications",
    ],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Community",
    tagline: "For organizers running something bigger.",
    price: "24",
    period: "per month",
    features: [
      "Everything in Plus",
      "Custom community branding",
      "Member roles & moderation tools",
      "Event scheduling for the group",
      "Dedicated support",
    ],
    cta: "Talk to us",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section className="lp-section-pad lp-pricing" id="pricing">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div className="lp-section-head__copy">
            <span className="lp-eyebrow">Pricing</span>
            <h2 className="lp-h2">Free to start. Simple when you grow.</h2>
            <p className="lp-lede">
              No seat minimums, no surprise fees. Upgrade when your circle
              needs more room, not before.
            </p>
          </div>
        </div>

        <div className="lp-pricing__grid">
          {plans.map((plan) => (
            <div
              className={`lp-plan ${plan.featured ? "lp-plan--featured" : ""}`}
              key={plan.name}
            >
              {plan.featured && <span className="lp-plan__badge">Most popular</span>}
              <div className="lp-plan__name">{plan.name}</div>
              <p className="lp-plan__tagline">{plan.tagline}</p>
              <div className="lp-plan__price">
                <span className="lp-plan__price-num">${plan.price}</span>
                <span className="lp-plan__price-period">/ {plan.period}</span>
              </div>
              <ul className="lp-plan__list">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={16} strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="lp-plan__foot">
                <button
                  className={`lp-btn lp-btn--full ${
                    plan.featured ? "lp-btn--primary" : "lp-btn--on-dark"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}