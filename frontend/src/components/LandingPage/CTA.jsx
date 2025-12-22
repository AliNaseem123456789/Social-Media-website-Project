export function CTA({ onLogin, onSignup }) {
  return (
    <section className="cta">
      <h2>Start your journey now</h2>
      <p>It only takes 30 seconds to connect with your community</p>

      <div className="cta-buttons">
        <button className="btn primary" onClick={onSignup}>
          Sign Up with Email
        </button>

        <button className="btn outline" onClick={onLogin}>
          Already have an account?
        </button>
      </div>
    </section>
  );
}
