import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A slow drift of points that link up when they come close: the shape of a small network, sitting
 * behind the hero. It is decorative, so it is hidden from assistive tech, it stops when the hero is
 * scrolled away, and it does not run at all for anyone who asked for less motion.
 */
export function ConnectionField() {
  const canvas = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let frame = null;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: -999, y: -999 };

    const nodes = [];
    const build = () => {
      nodes.length = 0;
      // Enough to read as a network, few enough that a phone does not notice.
      const count = width < 700 ? 18 : 34;
      for (let i = 0; i < count; i += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          r: Math.random() * 1.6 + 1,
        });
      }
    };

    const resize = () => {
      const box = el.getBoundingClientRect();
      width = box.width;
      height = box.height;
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;
      }

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.hypot(dx, dy);
          if (distance > 150) continue;
          ctx.strokeStyle = `rgba(224, 67, 31, ${0.1 * (1 - distance / 150)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      for (const node of nodes) {
        // Points near the cursor warm up, so the field feels touched rather than looped.
        const near = Math.hypot(node.x - pointer.x, node.y - pointer.y) < 120;
        ctx.fillStyle = near ? "rgba(224, 67, 31, 0.5)" : "rgba(148, 141, 128, 0.32)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running) frame = requestAnimationFrame(draw);
    };

    const onPointer = (event) => {
      const box = el.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
    };
    const onLeave = () => {
      pointer.x = -999;
      pointer.y = -999;
    };

    const visibility = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
        if (running && !frame) frame = requestAnimationFrame(draw);
        if (!running && frame) {
          cancelAnimationFrame(frame);
          frame = null;
        }
      },
      { threshold: 0 },
    );

    resize();
    visibility.observe(el);
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerleave", onLeave);

    return () => {
      visibility.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvas} className="lp-field" aria-hidden="true" />;
}
