import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const STEPS = [
  {
    n: "01",
    title: "Make an account",
    body: "Email and a password, or the Google button. Thirty seconds, no card.",
  },
  {
    n: "02",
    title: "Say what you're into",
    body: "A handful of interests. That's what the people suggestions run on, and you can change them later.",
  },
  {
    n: "03",
    title: "Find a few people",
    body: "Public profiles are open to follow. Private ones ask you first, and you'll know either way.",
  },
  {
    n: "04",
    title: "Start something",
    body: "A post, a group, a call. The app doesn't mind which comes first.",
  },
];

export function HowItWorks() {
  const track = useRef(null);
  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start 75%", "end 60%"],
  });
  // The rail fills as the steps go past, so the section has a sense of progress rather than four cards.
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="lp-section-pad lp-how" id="how-it-works">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div className="lp-section-head__copy">
            <span className="lp-eyebrow">Getting started</span>
            <h2 className="lp-h2">Four steps, and none of them are a form</h2>
          </div>
        </div>

        <div className="lp-steps" ref={track}>
          <div className="lp-steps__rail" aria-hidden="true">
            <motion.span className="lp-steps__rail-fill" style={{ height: fill }} />
          </div>

          {STEPS.map((step, i) => (
            <motion.div
              className="lp-step"
              key={step.n}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="lp-step__n">{step.n}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
