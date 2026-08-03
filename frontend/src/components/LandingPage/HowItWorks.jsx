const steps = [
  {
    n: "01",
    title: "Sign up in seconds",
    desc: "Use Google or an email and password — no forms that make you think twice.",
  },
  {
    n: "02",
    title: "Shape your profile",
    desc: "Add a photo, a bio, and the interests that decide which circles find you.",
  },
  {
    n: "03",
    title: "Find your people",
    desc: "Join a community, message a friend, or let the feed introduce you to someone new.",
  },
  {
    n: "04",
    title: "Stay in the loop",
    desc: "Notifications and reminders surface what matters without burying you in noise.",
  },
];

export function HowItWorks() {
  return (
    <section className="lp-section-pad" id="how-it-works">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div className="lp-section-head__copy">
            <span className="lp-eyebrow">Getting started</span>
            <h2 className="lp-h2">From stranger to community in four steps</h2>
          </div>
        </div>

        <div className="lp-flow__body">
          <div className="lp-flow__steps">
            {steps.map((step) => (
              <div className="lp-flow__step" key={step.n}>
                <span className="lp-flow__num">{step.n}</span>
                <div>
                  <h3 className="lp-flow__step-title">{step.title}</h3>
                  <p className="lp-flow__step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lp-flow__mock">
            <div className="lp-flow__mock-top">
              <span className="lp-flow__mock-tag">Profile setup</span>
              <div className="lp-flow__mock-dots">
                <span /><span /><span />
              </div>
            </div>

            <div className="lp-flow__mock-card">
              <div className="lp-flow__mock-name">Welcome, Amara</div>
              <div className="lp-flow__mock-sub">
                Your profile is 70% complete. Add your interests to get
                matched with the right circles.
              </div>
              <div className="lp-flow__mock-bar">
                <span style={{ width: "70%" }} />
              </div>
            </div>

            <div className="lp-flow__mock-card">
              <div className="lp-flow__mock-name">Suggested for you</div>
              <div className="lp-flow__mock-sub">
                Late Night Coders · 340 members<br />
                Home Bakers · 128 members<br />
                Trail Runners NYC · 812 members
              </div>
            </div>

            <div className="lp-flow__mock-card" style={{ marginBottom: 0 }}>
              <div className="lp-flow__mock-name">Next up</div>
              <div className="lp-flow__mock-sub">
                Say hello in Design Circle — 6 people are online now.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}