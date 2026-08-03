export function CTA({ onLogin, onSignup }) {
  return (
    <section className="lp-section-pad">
      <div className="lp-wrap">
        <div className="lp-final-cta">
          <div className="lp-final-cta__ring" />
          <h2>Your circle is one sign-up away.</h2>
          <p>Takes about thirty seconds. No credit card, no waiting list.</p>
          <div className="lp-final-cta__actions">
            <button className="lp-btn lp-btn--primary" onClick={onSignup}>
              Create your account
            </button>
            <button className="lp-btn lp-btn--on-dark" onClick={onLogin}>
              Already have an account?
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}