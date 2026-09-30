import { motion, useReducedMotion } from "framer-motion";
import { GraphCanvas } from "./GraphCanvas";
import { StaticGraph } from "./StaticGraph";

const POINTS = [
  { label: "Dots", body: "People you follow, and the ones who follow you back." },
  { label: "Lines", body: "The threads between them: comments, groups, direct messages." },
  { label: "The bright ones", body: "Messages in flight. In the app those arrive over a socket." },
];

export function GraphSection() {
  // With motion turned down the moving version does not run, so the drawn one takes its place rather
  // than leaving a hole where the illustration should be.
  const reduced = useReducedMotion();

  return (
    <section className="lp-section-pad lp-graph">
      <div className="lp-wrap lp-graph__inner">
        <motion.div
          className="lp-graph__copy"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="lp-eyebrow lp-eyebrow--dark">The shape of it</span>
          <h2 className="lp-h2 lp-h2--light">Everyone in one place</h2>
          <p className="lp-graph__lede">
            An illustration, not your account — but it is the right shape for what the app does.
          </p>

          <ul className="lp-graph__legend">
            {POINTS.map((point, i) => (
              <motion.li
                key={point.label}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.1 }}
              >
                <span className={`lp-graph__key lp-graph__key--${i}`} />
                <div>
                  <strong>{point.label}</strong>
                  {point.body}
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <div className="lp-graph__stage">
          {reduced ? <StaticGraph /> : <GraphCanvas />}
          <span className="lp-graph__floor" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
