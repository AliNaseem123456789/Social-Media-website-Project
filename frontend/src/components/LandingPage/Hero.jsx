import { motion } from "framer-motion";

const initials = ["M", "J", "R", "K"];
const colors = ["#e0431f", "#1c7a54", "#4a463f", "#c93a19"];

export function Hero({ onLogin, onSignup }) {
  return (
    <section className="lp-hero" id="top">
      <div className="lp-wrap lp-hero__inner">
        <div>
          <motion.span
            className="lp-eyebrow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="lp-hero__dot" style={{ background: "#e0431f" }} />
            4,200+ people are active right now
          </motion.span>

          <motion.h1
            className="lp-hero__title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            The internet, but it <em>remembers</em> your friends.
          </motion.h1>

          <motion.p
            className="lp-hero__subtitle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Circle is where conversations, communities, and the people you
            care about actually stay connected — real-time chat, groups built
            around shared interests, and a feed that learns what matters to you.
          </motion.p>

          <motion.div
            className="lp-hero__actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <button className="lp-btn lp-btn--primary" onClick={onSignup}>
              Create your account
            </button>
            <button className="lp-btn lp-btn--ghost" onClick={onLogin}>
              I already have one
            </button>
          </motion.div>

          <div className="lp-hero__trust">
            <div className="lp-hero__avatars">
              {initials.map((letter, i) => (
                <span key={letter} style={{ background: colors[i] }}>
                  {letter}
                </span>
              ))}
            </div>
            <p>
              <strong>60,000+</strong> people already building their circle
            </p>
          </div>
        </div>

        <motion.div
          className="lp-hero__visual"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="lp-hero__card--ring" />

          <motion.div
            className="lp-hero__card lp-hero__card--chat"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="lp-hero__chat-row">
              <div className="lp-hero__bubble">is the hiking group still meeting sat?</div>
            </div>
            <div className="lp-hero__chat-row is-self">
              <div className="lp-hero__bubble is-self">yep — 7am, same trailhead</div>
            </div>
            <div className="lp-hero__chat-row">
              <div className="lp-hero__typing">
                <span /><span /><span />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="lp-hero__card lp-hero__card--post"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          >
            <div className="lp-hero__post-head">
              <div className="lp-hero__avatar-sm" style={{ background: "#1c7a54" }}>R</div>
              <div>
                <div className="lp-hero__post-name">Rei · Design Circle</div>
                <div className="lp-hero__post-time">2m ago</div>
              </div>
            </div>
            <div className="lp-hero__post-body">
              Finally shipped the rebrand. Six weeks of late nights, worth it.
            </div>
            <div className="lp-hero__post-stats">
              <span>128 likes</span>
              <span>34 comments</span>
            </div>
          </motion.div>

          <motion.div
            className="lp-hero__card lp-hero__card--presence"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            <div className="lp-hero__presence-head">
              <span>Design Circle</span>
              <span className="lp-hero__live-tag">
                <span className="lp-hero__dot" /> live
              </span>
            </div>
            <div className="lp-hero__presence-list">
              <div className="lp-hero__presence-row">
                <span className="lp-hero__avatar-sm" style={{ background: "#e0431f" }}>M</span>
                Maya joined the group
              </div>
              <div className="lp-hero__presence-row">
                <span className="lp-hero__avatar-sm" style={{ background: "#4a463f" }}>K</span>
                Kian started a thread
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}