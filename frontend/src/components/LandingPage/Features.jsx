import { useEffect, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { AtSign, CalendarClock, Hash, Images, MessagesSquare, Moon, Search, Sun } from "lucide-react";

const spring = { type: "spring", stiffness: 380, damping: 32 };

/** Runs a card's own little animation, but only once it has been scrolled to. */
function useLiveCard() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  const reduced = useReducedMotion();
  return { ref, playing: inView && !reduced, reduced };
}

function ThreadVignette() {
  const { ref, playing, reduced } = useLiveCard();
  const [depth, setDepth] = useState(reduced ? 3 : 0);

  useEffect(() => {
    if (!playing) return undefined;
    setDepth(0);
    const timers = [1, 2, 3].map((n) => setTimeout(() => setDepth(n), n * 620));
    return () => timers.forEach(clearTimeout);
  }, [playing]);

  const replies = [
    { who: "Hana", text: "the crumb though", indent: 0 },
    { who: "Rafi", text: "recipe or it didn't happen", indent: 1 },
    { who: "you", text: "posting it tonight", indent: 2 },
  ];

  return (
    <div className="lp-vig lp-vig--thread" ref={ref}>
      <div className="lp-vig__root">
        <span className="lp-vig__dot lp-vig__dot--ember" />
        Third attempt at sourdough. It worked.
      </div>
      {replies.map((r, i) => (
        <motion.div
          key={r.who}
          className="lp-vig__reply"
          style={{ marginLeft: r.indent * 18 }}
          initial={{ opacity: 0, x: -10 }}
          animate={depth > i ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
          transition={spring}
        >
          <span className="lp-vig__line" />
          <strong>{r.who}</strong>
          {r.text}
        </motion.div>
      ))}
    </div>
  );
}

function PhotoVignette() {
  const { ref, playing, reduced } = useLiveCard();
  const [shown, setShown] = useState(reduced ? 4 : 0);

  useEffect(() => {
    if (!playing) return undefined;
    setShown(0);
    const timers = [1, 2, 3, 4].map((n) => setTimeout(() => setShown(n), n * 320));
    return () => timers.forEach(clearTimeout);
  }, [playing]);

  return (
    <div className="lp-vig lp-vig--photos" ref={ref}>
      <div className="lp-vig__grid">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className={`lp-vig__tile lp-vig__tile--${i}`}
            initial={{ opacity: 0, scale: 0.86 }}
            animate={shown > i ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.86 }}
            transition={spring}
          />
        ))}
      </div>
      <motion.span
        className="lp-vig__alt"
        initial={{ opacity: 0, y: 8 }}
        animate={shown >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={spring}
      >
        <Images size={12} /> alt text on every one
      </motion.span>
    </div>
  );
}

function SearchVignette() {
  const { ref, playing, reduced } = useLiveCard();
  const query = "hiking";
  const [typed, setTyped] = useState(reduced ? query : "");

  useEffect(() => {
    if (!playing) return undefined;
    setTyped("");
    const timers = query.split("").map((_, i) =>
      setTimeout(() => setTyped(query.slice(0, i + 1)), 220 + i * 110),
    );
    return () => timers.forEach(clearTimeout);
  }, [playing]);

  const done = typed.length === query.length;

  return (
    <div className="lp-vig lp-vig--search" ref={ref}>
      <div className="lp-vig__input">
        <Search size={14} />
        <span>{typed}</span>
        {!done && <i className="lp-vig__caret" />}
      </div>
      <motion.div
        className="lp-vig__results"
        initial={{ opacity: 0, y: 8 }}
        animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={spring}
      >
        <span><Hash size={12} /> hiking · 212 posts</span>
        <span><AtSign size={12} /> weekend-club</span>
        <span><Hash size={12} /> hikingtrails · 48 posts</span>
      </motion.div>
    </div>
  );
}

function ScheduleVignette() {
  const { ref, playing, reduced } = useLiveCard();
  const [published, setPublished] = useState(reduced);

  useEffect(() => {
    if (!playing) return undefined;
    setPublished(false);
    const id = setTimeout(() => setPublished(true), 1900);
    return () => clearTimeout(id);
  }, [playing]);

  return (
    <div className="lp-vig lp-vig--schedule" ref={ref}>
      <div className="lp-vig__draft">
        <span className="lp-vig__draft-line" />
        <span className="lp-vig__draft-line lp-vig__draft-line--short" />
      </div>
      <motion.span
        className={`lp-vig__chip ${published ? "is-done" : ""}`}
        animate={{ scale: published ? [1, 1.06, 1] : 1 }}
        transition={{ duration: 0.4 }}
      >
        <CalendarClock size={12} />
        {published ? "Posted at 07:00" : "Scheduled for 07:00"}
      </motion.span>
    </div>
  );
}

function UnreadVignette() {
  const { ref, playing, reduced } = useLiveCard();
  const [count, setCount] = useState(reduced ? 3 : 0);

  useEffect(() => {
    if (!playing) return undefined;
    setCount(0);
    const timers = [1, 2, 3].map((n) => setTimeout(() => setCount(n), n * 700));
    return () => timers.forEach(clearTimeout);
  }, [playing]);

  const rows = [
    { who: "Bilal", what: "replied to your post" },
    { who: "Hana", what: "mentioned you" },
    { who: "Weekend Club", what: "3 new messages" },
  ];

  return (
    <div className="lp-vig lp-vig--unread" ref={ref}>
      <div className="lp-vig__bell">
        <MessagesSquare size={16} />
        <motion.i
          className="lp-vig__badge"
          animate={{ scale: count ? [1, 1.25, 1] : 0 }}
          transition={{ duration: 0.35 }}
        >
          {count}
        </motion.i>
      </div>
      <div className="lp-vig__notes">
        {rows.map((row, i) => (
          <motion.span
            key={row.who}
            initial={{ opacity: 0, x: 12 }}
            animate={count > i ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
            transition={spring}
          >
            <strong>{row.who}</strong> {row.what}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function ThemeVignette() {
  const { ref, playing, reduced } = useLiveCard();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setDark((d) => !d), 2600);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <div className="lp-vig lp-vig--theme" ref={ref}>
      <motion.div
        className={`lp-vig__panel ${dark ? "is-dark" : ""}`}
        animate={{ scale: reduced ? 1 : [1, 0.985, 1] }}
        transition={{ duration: 0.5 }}
      >
        <span className="lp-vig__panel-bar" />
        <span className="lp-vig__panel-bar lp-vig__panel-bar--short" />
        <span className="lp-vig__panel-bar lp-vig__panel-bar--tiny" />
      </motion.div>
      <span className="lp-vig__switch" aria-hidden="true">
        <i className={dark ? "" : "is-on"}><Sun size={12} /></i>
        <i className={dark ? "is-on" : ""}><Moon size={12} /></i>
      </span>
    </div>
  );
}

const FEATURES = [
  {
    id: "threads",
    title: "Replies that keep their shape",
    body: "Comments nest under what they answer, and you can like or edit any of them without the thread turning into a wall.",
    Vignette: ThreadVignette,
  },
  {
    id: "photos",
    title: "Four photos, and none of them mangled",
    body: "Crop them before they go up, write alt text while you still remember what the picture was.",
    Vignette: PhotoVignette,
  },
  {
    id: "search",
    title: "Find the thing you half remember",
    body: "People, posts and hashtags, matched on the way you type it, not the way you should have.",
    Vignette: SearchVignette,
  },
  {
    id: "drafts",
    title: "Write now, post at seven",
    body: "Drafts wait as long as you need. Give one a time and it goes out without you.",
    Vignette: ScheduleVignette,
  },
  {
    id: "unread",
    title: "It tells you what you missed",
    body: "Unread counts per conversation, mentions pulled out, and email for the ones you pick.",
    Vignette: UnreadVignette,
  },
  {
    id: "theme",
    title: "Dark mode that was there from the start",
    body: "Not a filter over a light app. Every colour has a second value, and the whole thing was built against both.",
    Vignette: ThemeVignette,
  },
];

export function Features() {
  return (
    <section className="lp-section-pad" id="features">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div className="lp-section-head__copy">
            <span className="lp-eyebrow">The parts you'll use daily</span>
            <h2 className="lp-h2">Small things, done properly</h2>
            <p className="lp-section-head__sub">
              None of this is exotic. It's the stuff that breaks in every other app, built to not break
              here.
            </p>
          </div>
        </div>

        <div className="lp-feature-grid">
          {FEATURES.map((f, i) => (
            <motion.article
              className="lp-feature"
              key={f.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="lp-feature__stage">
                <f.Vignette />
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
