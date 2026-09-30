import { motion } from "framer-motion";

export function CTA({ onLogin, onSignup }) {
  return (
    <section className="lp-section-pad">
      <div className="lp-wrap">
        <motion.div
          className="lp-final-cta"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="lp-final-cta__glow" aria-hidden="true" />
          <span className="lp-final-cta__ring" aria-hidden="true" />

          <h2>Bring three people and it's already worth it.</h2>
          <p>That's the whole trick with this kind of thing. Start with the group chat you're tired of.</p>

          <div className="lp-final-cta__actions">
            <button className="lp-btn lp-btn--primary" onClick={onSignup}>
              Create an account
            </button>
            <button className="lp-btn lp-btn--on-dark" onClick={onLogin}>
              Log in instead
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
