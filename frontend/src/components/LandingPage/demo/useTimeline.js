import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Steps through a scene one beat at a time while it is on screen, so the demo reads as a sequence
 * rather than everything appearing at once. Each entry in `beats` is how long that beat holds, in ms.
 *
 * Off screen it stops, which keeps an idle tab from animating. With reduced motion it jumps straight
 * to the final beat: the scene still shows its finished state, it just never moves to get there.
 */
export function useTimeline(beats, { active = true, loop = true } = {}) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? beats.length - 1 : 0);
  const timer = useRef(null);

  // Callers pass an array literal, which is a new object on every render. Depending on that identity
  // would restart the sequence each time a step lands, so it would never get past the first beat. The
  // timings themselves are what matters, so they are flattened to a string the effect can depend on and
  // read back inside it — which also means no ref, and nothing mutated during render.
  const timings = beats.join(",");

  useEffect(() => {
    const script = timings.split(",").map(Number);

    if (reduced) {
      setStep(script.length - 1);
      return undefined;
    }
    if (!active) return undefined;

    setStep(0);
    let current = 0;

    const advance = () => {
      const isLast = current >= script.length - 1;
      if (isLast && !loop) return;
      current = isLast ? 0 : current + 1;
      setStep(current);
      timer.current = setTimeout(advance, script[current]);
    };

    timer.current = setTimeout(advance, script[0]);
    return () => clearTimeout(timer.current);
  }, [active, loop, reduced, timings]);

  return step;
}

/** Counts from one number to another over a given time, for anything that should tick rather than jump. */
export function useCountUp(to, { active = true, duration = 900, from = 0 } = {}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : from);

  useEffect(() => {
    if (reduced || !active) {
      setValue(to);
      return undefined;
    }
    let frame;
    const started = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      // Ease out, so the number settles instead of stopping dead.
      setValue(Math.round(from + (to - from) * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, from, duration, active, reduced]);

  return value;
}
