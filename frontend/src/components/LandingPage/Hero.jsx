import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Bell, UserPlus } from "lucide-react";
import { ConnectionField } from "./ConnectionField";
import { AppDemo } from "./demo/AppDemo";

const enter = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

export function Hero({ onLogin, onSignup }) {
  const reduced = useReducedMotion();
  const float = (distance, seconds, delay = 0) =>
    reduced
      ? {}
      : {
          animate: { y: [0, -distance, 0] },
          transition: { duration: seconds, repeat: Infinity, ease: "easeInOut", delay },
        };

  return (
    <section className="lp-hero" id="top">
      <ConnectionField />

      <div className="lp-wrap lp-hero__inner">
        <div className="lp-hero__copy">
          <motion.span className="lp-eyebrow" {...enter(0)}>
            <span className="lp-hero__dot" />
            Free to use, no ads
          </motion.span>

          <motion.h1 className="lp-hero__title" {...enter(0.05)}>
            Post it. Say it. <em>Call</em> about it.
          </motion.h1>

          <motion.p className="lp-hero__subtitle" {...enter(0.12)}>
            Circle keeps the feed, the group chat and the video call in one place, so a conversation
            doesn't start over every time it moves.
          </motion.p>

          <motion.div className="lp-hero__actions" {...enter(0.18)}>
            <button className="lp-btn lp-btn--primary" onClick={onSignup}>
              Create an account
            </button>
            <button className="lp-btn lp-btn--ghost" onClick={onLogin}>
              I have one
            </button>
          </motion.div>

          <motion.ul className="lp-hero__facts" {...enter(0.24)}>
            <li>Thirty seconds to sign up</li>
            <li>No card, ever</li>
            <li>Delete the whole account yourself</li>
          </motion.ul>
        </div>

        <motion.div
          className="lp-hero__stage"
          initial={{ opacity: 0, y: 26, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <AppDemo />

          <motion.div className="lp-float lp-float--toast" {...float(10, 7)}>
            <span className="lp-float__icon lp-float__icon--ember">
              <Bell size={14} />
            </span>
            <div>
              <strong>Noor is calling</strong>
              <span>Weekend Club</span>
            </div>
          </motion.div>

          <motion.div className="lp-float lp-float--follow" {...float(8, 8.5, 0.8)}>
            <span className="lp-float__icon lp-float__icon--signal">
              <UserPlus size={14} />
            </span>
            <div>
              <strong>Hana follows you</strong>
              <span>2 mutuals</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="lp-wrap">
        <motion.a
          href="#features"
          className="lp-hero__scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <motion.span
            {...(reduced ? {} : { animate: { y: [0, 6, 0] }, transition: { duration: 2, repeat: Infinity } })}
          >
            <ArrowDown size={15} />
          </motion.span>
          What it does
        </motion.a>
      </div>
    </section>
  );
}
