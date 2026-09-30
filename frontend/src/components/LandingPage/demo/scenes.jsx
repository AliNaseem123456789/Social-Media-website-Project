import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Check,
  CheckCheck,
  Heart,
  ImageIcon,
  MessageCircle,
  Mic,
  Phone,
  PhoneOff,
  Repeat2,
  Shield,
  Video,
} from "lucide-react";
import { useTimeline, useCountUp } from "./useTimeline";

// Everything below is sample content for the tour. It is the interface running, not a record of
// anything anyone said.

const spring = { type: "spring", stiffness: 420, damping: 34 };
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
};

function Avatar({ name, tone = "ember", size = 32 }) {
  return (
    <span className={`dm-avatar dm-avatar--${tone}`} style={{ width: size, height: size }}>
      {name.charAt(0)}
    </span>
  );
}

/* ----------------------------------------------------------------- messages */

const thread = [
  { id: 1, from: "Noor", tone: "signal", text: "sunrise hike saturday. who's in", mine: false },
  { id: 2, from: "you", tone: "ember", text: "in. same trailhead as last time?", mine: true },
  { id: 3, from: "Bilal", tone: "ink", text: "7am, and I'm bringing the good thermos", mine: false },
];

export function MessagesScene({ active }) {
  // a message lands -> you answer -> someone is typing -> their reply, and your receipt turns -> a photo
  const step = useTimeline([1800, 2000, 1800, 2600, 2400], { active });
  const count = step <= 1 ? step + 1 : step === 2 ? 2 : 3;
  const visible = thread.slice(0, count);
  const read = step >= 3;

  return (
    <div className="dm-scene dm-scene--chat">
      <header className="dm-thread__head">
        <div className="dm-thread__who">
          <Avatar name="Weekend Club" tone="signal" size={34} />
          <div>
            <strong>Weekend Club</strong>
            <span className="dm-thread__meta">
              <i className="dm-presence" aria-hidden="true" />
              Noor, Bilal and 4 others
            </span>
          </div>
        </div>
        <div className="dm-thread__tools">
          <span className="dm-icon-btn"><Phone size={15} /></span>
          <span className="dm-icon-btn"><Video size={15} /></span>
        </div>
      </header>

      <div className="dm-thread__body">
        <AnimatePresence initial={false}>
          {visible.map((m) => (
            <motion.div
              key={m.id}
              className={`dm-bubble ${m.mine ? "dm-bubble--mine" : ""}`}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={spring}
            >
              {!m.mine && <Avatar name={m.from} tone={m.tone} size={26} />}
              <div className="dm-bubble__text">
                {!m.mine && <span className="dm-bubble__name">{m.from}</span>}
                {m.text}
                {m.mine && (
                  <span className="dm-bubble__receipt">
                    {read ? <CheckCheck size={13} /> : <Check size={13} />}
                  </span>
                )}
              </div>
            </motion.div>
          ))}

          {step === 2 && (
            <motion.div
              key="typing"
              className="dm-bubble"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Avatar name="Bilal" tone="ink" size={26} />
              <div className="dm-bubble__text dm-bubble__text--typing">
                <i /><i /><i />
              </div>
            </motion.div>
          )}

          {step >= 4 && (
            <motion.div
              key="photo"
              className="dm-bubble"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={spring}
            >
              <Avatar name="Noor" tone="signal" size={26} />
              <div className="dm-bubble__photo">
                <span className="dm-bubble__photo-art" />
                <span className="dm-bubble__photo-alt">
                  <ImageIcon size={12} /> trail map, 6.4km loop
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="dm-thread__compose">
        <span>Message Weekend Club</span>
        <i className="dm-send" aria-hidden="true" />
      </footer>
    </div>
  );
}

/* --------------------------------------------------------------------- feed */

const posts = [
  {
    id: 1,
    author: "Rafi",
    tone: "ember",
    handle: "@rafi",
    when: "2m",
    text: "Finally shipped the rebrand. Six weeks of late nights, worth every one.",
    likes: 128,
    comments: 34,
    tags: ["#design"],
  },
  {
    id: 2,
    author: "Hana",
    tone: "signal",
    handle: "@hana",
    when: "18m",
    text: "The sourdough worked. Third attempt. Crumb shot in the replies.",
    likes: 61,
    comments: 12,
    tags: ["#baking"],
  },
];

export function FeedScene({ active }) {
  // cards land -> a like lands -> a new post pill drops in -> the list re-ranks
  const step = useTimeline([1400, 1800, 2200, 2400, 2000], { active });
  const likes = useCountUp(step >= 2 ? 129 : 128, { active, from: 128, duration: 500 });
  const liked = step >= 2;
  const fresh = step >= 3;

  return (
    <div className="dm-scene dm-scene--feed">
      <div className="dm-feed__tabs">
        <span className="is-on">For you</span>
        <span>Following</span>
        <span>Everyone</span>
      </div>

      <AnimatePresence>
        {fresh && (
          <motion.button
            className="dm-feed__new"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring}
            type="button"
            tabIndex={-1}
          >
            3 new posts
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        className="dm-feed__list"
        initial="hidden"
        animate={step >= 0 ? "show" : "hidden"}
        variants={{ show: { transition: { staggerChildren: 0.14 } } }}
      >
        {posts.map((p) => (
          <motion.article className="dm-post" key={p.id} variants={rise} layout>
            <header>
              <Avatar name={p.author} tone={p.tone} size={30} />
              <div>
                <strong>{p.author}</strong>
                <span className="dm-post__meta">
                  {p.handle} · {p.when}
                </span>
              </div>
              <Bookmark size={14} className="dm-post__save" />
            </header>
            <p>
              {p.text} <em>{p.tags[0]}</em>
            </p>
            <footer>
              <span className={`dm-act ${p.id === 1 && liked ? "is-on" : ""}`}>
                <motion.span
                  animate={p.id === 1 && liked ? { scale: [1, 1.45, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45 }}
                  style={{ display: "inline-flex" }}
                >
                  <Heart size={14} />
                </motion.span>
                {p.id === 1 ? likes : p.likes}
              </span>
              <span className="dm-act">
                <MessageCircle size={14} />
                {p.comments}
              </span>
              <span className="dm-act">
                <Repeat2 size={14} />
              </span>
            </footer>
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------- calls */

export function CallScene({ active }) {
  // ringing -> connected -> the timer runs -> ended, and it lands in history
  const step = useTimeline([2200, 1200, 3200, 2200], { active });
  const ringing = step === 0;
  const connected = step >= 1 && step < 3;
  const ended = step >= 3;
  const seconds = useCountUp(connected ? 42 : 0, { active: connected, from: 0, duration: 3000 });

  return (
    <div className="dm-scene dm-scene--call">
      <div className={`dm-call ${connected ? "is-connected" : ""}`}>
        <motion.div
          className="dm-call__ring"
          animate={ringing ? { scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] } : { opacity: 0 }}
          transition={{ duration: 1.6, repeat: ringing ? Infinity : 0 }}
        />
        <Avatar name="Noor" tone="signal" size={72} />
        <strong>Noor Rahman</strong>
        <span className="dm-call__state">
          {ringing && "Calling…"}
          {connected && `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`}
          {ended && "Call ended · 00:42"}
        </span>

        {connected && (
          <div className="dm-call__wave" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <motion.i
                key={i}
                animate={{ scaleY: [0.3, 1, 0.45, 0.85, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.09 }}
              />
            ))}
          </div>
        )}

        <div className="dm-call__actions">
          <span className="dm-call__btn"><Mic size={16} /></span>
          <span className="dm-call__btn"><Video size={16} /></span>
          <span className="dm-call__btn dm-call__btn--end"><PhoneOff size={16} /></span>
        </div>
      </div>

      <AnimatePresence>
        {ended && (
          <motion.div
            className="dm-call__log"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
          >
            <Phone size={14} />
            <div>
              <strong>Noor Rahman</strong>
              <span>Outgoing · 42 seconds · just now</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------- safety */

export function SafetyScene({ active }) {
  // a post is reported -> the block is confirmed -> the account disappears from view
  const step = useTimeline([2000, 2200, 2400, 2200], { active });

  return (
    <div className="dm-scene dm-scene--safety">
      <AnimatePresence mode="wait">
        {step < 2 ? (
          <motion.div
            key="report"
            className="dm-safety__card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={spring}
          >
            <header>
              <Shield size={15} />
              Report this post
            </header>
            <ul>
              {["Spam", "Harassment", "Impersonation", "Something else"].map((reason, i) => (
                <motion.li
                  key={reason}
                  className={step >= 1 && i === 1 ? "is-picked" : ""}
                  variants={rise}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: 0.08 * i }}
                >
                  <i />
                  {reason}
                </motion.li>
              ))}
            </ul>
            <button type="button" tabIndex={-1} className={step >= 1 ? "is-ready" : ""}>
              Send report
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            className="dm-safety__done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
          >
            <span className="dm-safety__tick">
              <Check size={20} />
            </span>
            <strong>Reported, and they're blocked</strong>
            <p>
              They can't message you, find you in search, or see what you post. Nothing tells them you
              blocked them.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
