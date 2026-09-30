import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

const QUESTIONS = [
  {
    q: "Is it free?",
    a: "Yes. No ads, no paid tier, nothing to cancel. If that ever changes, it won't change underneath you.",
  },
  {
    q: "Who can see what I post?",
    a: "Your choice, per account: public, followers only, or private. Change it whenever — it applies to what's already there too.",
  },
  {
    q: "Can I stop someone contacting me?",
    a: "Messages can be open to everyone, to people you follow, to friends, or to nobody. Blocking goes further: they can't find you in search, see your posts, or message you, and nothing tells them you did it.",
  },
  {
    q: "Can I delete my account?",
    a: "From settings, with your password. Your profile, posts and comments go with it. Messages you sent in a group stay in that group without your name on them.",
  },
  {
    q: "Is there a phone app?",
    a: "No, and there may never be. It's a website built for a phone screen first, so add it to your home screen and it behaves.",
  },
  {
    q: "Who made this?",
    a: "One developer. A modular Node backend, a React frontend, and the whole thing running on one small server.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section className="lp-section-pad" id="faq">
      <div className="lp-wrap lp-faq">
        <div className="lp-faq__intro">
          <span className="lp-eyebrow">Straight answers</span>
          <h2 className="lp-h2">Before you sign up</h2>
          <p>The questions worth asking of anything you're about to put your friends into.</p>
        </div>

        <div className="lp-faq__list">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div className={`lp-faq__item ${isOpen ? "is-open" : ""}`} key={item.q}>
                <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
                  {item.q}
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                    <Plus size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
