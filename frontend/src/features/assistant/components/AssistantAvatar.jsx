import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { STATES, paint } from "./avatarPainter";
import { useColorMode } from "../../../context/ColorModeContext";

/**
 * The assistant's face.
 *
 * This component owns the loop, the theme and the easing between states; `avatarPainter.js` owns the
 * drawing. The four states are the assistant's real state, not decoration: someone glancing at this
 * should know whether it is waiting for them, hearing them, working, or answering, before reading a word.
 */
export default function AssistantAvatar({ state = "idle", size = 72, amplitude = 0, sx }) {
  const canvasRef = useRef(null);

  // A ref rather than state: the loop reads this sixty times a second, and re-rendering React that often
  // to move a circle would be absurd. Written in an effect, not during render — a ref mutated while
  // rendering is the kind of thing that works until React decides to render twice.
  const live = useRef({ state: "idle", amplitude: 0 });
  useEffect(() => {
    live.current.state = STATES[state] ? state : "idle";
    live.current.amplitude = amplitude;
  }, [state, amplitude]);

  // The palette lives in CSS variables, and canvas needs a real colour value. They are resolved once per
  // effect run, which is why the mode is a dependency: without it the robot keeps its light-mode shell
  // after a switch to dark.
  const { mode } = useColorMode();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const still = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    // The theme sets these to literal colours, so reading them gives something canvas can use. The
    // fallbacks cover the first paint, before the theme has applied.
    const styles = getComputedStyle(canvas);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    const colors = {
      ink: read("--c-ember", "#e0431f"),
      shell: read("--c-surface", "#ffffff"),
      line: read("--c-line", "#e7e1d5"),
    };

    const pose = { ...STATES.idle };
    let spinAngle = 0;
    let blink = 1;
    let untilBlink = 1400;
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;

    const frame = (now) => {
      const dt = Math.min(now - last, 50);
      last = now;
      elapsed += dt;

      const target = STATES[live.current.state];
      // A first-order filter: each value moves a fixed fraction of the way to its target per frame, so
      // switching state glides instead of snapping. Cheap, and stable at any frame rate a browser
      // actually delivers.
      const ease = 1 - Math.exp(-dt / 140);
      for (const key of Object.keys(pose)) pose[key] += (target[key] - pose[key]) * ease;

      spinAngle += (dt / 1000) * pose.spin * Math.PI;

      if (!still) {
        untilBlink -= dt;
        // Never blink mid-listen: being looked at is the point when you are the one talking.
        if (untilBlink <= 0 && live.current.state !== "listening") {
          blink = 0;
          untilBlink = 2200 + Math.random() * 2600;
        }
        blink = Math.min(1, blink + dt / 110);
      }

      paint(ctx, {
        size,
        dpr,
        colors,
        pose,
        state: live.current.state,
        elapsed,
        spinAngle,
        blink,
        amplitude: live.current.amplitude,
        still,
      });

      if (!still) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, mode]);

  return (
    <Box sx={{ width: size, height: size, flexShrink: 0, lineHeight: 0, ...sx }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, display: "block" }}
        role="img"
        aria-label={`Assistant, ${state}`}
      />
    </Box>
  );
}
