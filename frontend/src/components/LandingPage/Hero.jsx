import { motion } from "framer-motion";

export function Hero({ onLogin, onSignup }) {
  return (
    <section className="hero">
      <div className="hero-bg" />

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Connect. Share. Belong.</h1>

        <p>
          Join communities, chat with friends, and discover content tailored to you.
        </p>

        <div className="hero-buttons">
          <button className="btn primary" onClick={onSignup}>
            Sign Up Free
          </button>

          <button className="btn outline" onClick={onLogin}>
            Log In
          </button>
        </div>

        <span className="social-proof">
          ⭐ 10k+ users already joined
        </span>
      </motion.div>
    </section>
  );
}
