import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Bell, Home, MessageSquare, Phone, Search, Shield } from "lucide-react";
import { CallScene, FeedScene, MessagesScene, SafetyScene } from "./scenes";

const TABS = [
  { id: "feed", label: "Feed", icon: Home, Scene: FeedScene, hold: 9000 },
  { id: "messages", label: "Messages", icon: MessageSquare, Scene: MessagesScene, hold: 10000 },
  { id: "calls", label: "Calls", icon: Phone, Scene: CallScene, hold: 9000 },
  { id: "safety", label: "Safety", icon: Shield, Scene: SafetyScene, hold: 9000 },
];

/**
 * The product, running. Each tab plays its own short sequence; the tour moves on by itself until
 * someone picks a tab, and then it stays where they put it.
 */
export function AppDemo({ compact = false }) {
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const frame = useRef(null);
  const onScreen = useInView(frame, { amount: 0.35 });
  const reduced = useReducedMotion();

  const active = TABS[index];

  useEffect(() => {
    if (pinned || !onScreen || reduced) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % TABS.length), active.hold);
    return () => clearTimeout(id);
  }, [index, pinned, onScreen, reduced, active.hold]);

  // Pointer tilt. Springs keep it from snapping, and it is skipped entirely for touch and for anyone
  // who asked for less motion.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), { stiffness: 140, damping: 18 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), { stiffness: 140, damping: 18 });

  const track = (event) => {
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return;
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    px.set((event.clientX - box.left) / box.width - 0.5);
    py.set((event.clientY - box.top) / box.height - 0.5);
  };
  const release = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className={`dm ${compact ? "dm--compact" : ""}`}>
      <motion.div
        ref={frame}
        className="dm__frame"
        style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 1400 }}
        onPointerMove={track}
        onPointerLeave={release}
      >
        <div className="dm__chrome">
          <span className="dm__dots" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="dm__url">circle · {active.label.toLowerCase()}</span>
          <span className="dm__badge">sample data</span>
        </div>

        <div className="dm__body">
          <nav className="dm__rail" aria-hidden="true">
            <span className="dm__mark" />
            {TABS.map((tab, i) => (
              <span key={tab.id} className={`dm__rail-item ${i === index ? "is-on" : ""}`}>
                <tab.icon size={16} />
                {tab.id === "messages" && <i className="dm__rail-dot" />}
              </span>
            ))}
            <span className="dm__rail-item dm__rail-item--spacer">
              <Search size={16} />
            </span>
            <span className="dm__rail-item">
              <Bell size={16} />
            </span>
          </nav>

          <div className="dm__stage">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                className="dm__scene-wrap"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                <active.Scene active={onScreen} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <div className="dm__tabs" role="tablist" aria-label="What the app does">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`dm__tab ${i === index ? "is-on" : ""}`}
            onClick={() => {
              setIndex(i);
              setPinned(true);
            }}
          >
            <tab.icon size={15} />
            {tab.label}
            {i === index && !pinned && !reduced && (
              <motion.i
                className="dm__tab-progress"
                key={`${tab.id}-${index}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: tab.hold / 1000, ease: "linear" }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
