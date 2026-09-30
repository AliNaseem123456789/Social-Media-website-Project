import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A social graph as an object: people scattered over a sphere, the links between them drawn as arcs,
 * and messages travelling along those arcs. It turns slowly and leans toward the pointer.
 *
 * This was three.js first, which cost 191 KB gzipped to draw flat dots and lines — no lights, no
 * shadows, no materials worth the name. Rotating the points and dividing by depth is the whole of
 * what that library was doing here, so it is done directly on a 2D canvas instead.
 *
 * Decorative: it does not run under reduced motion (the caller draws a still version), it stops when
 * scrolled away, and it never touches the DOM beyond its own canvas.
 */

const COUNT = 116;
const LINK_REACH = 0.38;
const LINK_CHANCE = 0.22;
const CAMERA = 3.1;
const EMBER = "224, 67, 31";
const SIGNAL = "28, 122, 84";
const INK = "148, 141, 128";

/** Points spread evenly over a sphere rather than randomly, so there are no clumps. */
function buildNodes() {
  const nodes = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i += 1) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const theta = golden * i;
    nodes.push({
      x: Math.cos(theta) * ring,
      y,
      z: Math.sin(theta) * ring,
      tone: i % 11 === 0 ? EMBER : i % 7 === 0 ? SIGNAL : INK,
      size: i % 11 === 0 || i % 7 === 0 ? 2.4 : 1.7,
    });
  }
  return nodes;
}

/** Links between people who are already near each other, with a control point bowed off the surface. */
function buildLinks(nodes) {
  const links = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dy * dy + dz * dz > LINK_REACH) continue;
      if (Math.random() > LINK_CHANCE) continue;
      const mx = (nodes[i].x + nodes[j].x) / 2;
      const my = (nodes[i].y + nodes[j].y) / 2;
      const mz = (nodes[i].z + nodes[j].z) / 2;
      const length = Math.hypot(mx, my, mz) || 1;
      const bow = 1.09 / length;
      links.push({ a: nodes[i], b: nodes[j], cx: mx * bow, cy: my * bow, cz: mz * bow });
    }
  }
  return links;
}

const bezier = (t, a, c, b) => {
  const inv = 1 - t;
  return inv * inv * a + 2 * inv * t * c + t * t * b;
};

export function GraphCanvas({ className = "lp-orb" }) {
  const canvas = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext("2d");
    if (!ctx) return undefined;

    const nodes = buildNodes();
    const links = buildLinks(nodes);
    // A few arcs from across the sphere carry the travelling messages.
    const stride = Math.max(1, Math.floor(links.length / 8));
    const travellers = [];
    for (let i = 0; i < links.length && travellers.length < 8; i += stride) {
      travellers.push({ link: links[i], t: Math.random(), speed: 0.1 + Math.random() * 0.14 });
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let scale = 1;
    let spin = 0;
    let leanX = 0;
    let leanY = 0;
    const pointer = { x: 0, y: 0 };
    let frame = null;
    let running = true;
    let last = performance.now();

    const resize = () => {
      const box = el.getBoundingClientRect();
      width = box.width;
      height = box.height;
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(width, height) * 0.33;
    };

    // Rotate around Y (the slow turn), then X (the lean), then divide by depth.
    const project = (x, y, z, out) => {
      const cosY = Math.cos(spin);
      const sinY = Math.sin(spin);
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;
      const cosX = Math.cos(leanX);
      const sinX = Math.sin(leanX);
      const ry = y * cosX - rz * sinX;
      const rzz = y * sinX + rz * cosX;
      const depth = CAMERA / (CAMERA - rzz);
      out.x = width / 2 + (rx + leanY * 0.35) * scale * depth;
      out.y = height / 2 + ry * scale * depth;
      out.near = (rzz + 1) / 2;
      return out;
    };

    const a = { x: 0, y: 0, near: 0 };
    const b = { x: 0, y: 0, near: 0 };
    const c = { x: 0, y: 0, near: 0 };
    const p = { x: 0, y: 0, near: 0 };

    const draw = (now) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      spin += delta * 0.12;
      leanX += (pointer.y * 0.22 - leanX) * 0.045;
      leanY += (pointer.x * 0.3 - leanY) * 0.045;

      ctx.clearRect(0, 0, width, height);

      for (const link of links) {
        project(link.a.x, link.a.y, link.a.z, a);
        project(link.b.x, link.b.y, link.b.z, b);
        project(link.cx, link.cy, link.cz, c);
        // Arcs on the far side of the sphere sit behind everything, so they fade out.
        const near = (a.near + b.near) / 2;
        ctx.strokeStyle = `rgba(164, 155, 140, ${0.06 + near * 0.28})`;
        ctx.lineWidth = 0.6 + near * 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
        ctx.stroke();
      }

      for (const node of nodes) {
        project(node.x, node.y, node.z, p);
        ctx.fillStyle = `rgba(${node.tone}, ${0.25 + p.near * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, node.size * (0.55 + p.near * 0.75), 0, Math.PI * 2);
        ctx.fill();
      }

      for (const traveller of travellers) {
        traveller.t += delta * traveller.speed;
        if (traveller.t > 1) traveller.t -= 1;
        const { link, t } = traveller;
        project(
          bezier(t, link.a.x, link.cx, link.b.x),
          bezier(t, link.a.y, link.cy, link.b.y),
          bezier(t, link.a.z, link.cz, link.b.z),
          p,
        );
        // Bright in the middle of the journey, gone at either end.
        const fade = Math.sin(t * Math.PI) * (0.35 + p.near * 0.65);
        const tone = traveller.link.a.tone === SIGNAL ? SIGNAL : EMBER;
        const radius = 2.6 + p.near * 2.6;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
        glow.addColorStop(0, `rgba(${tone}, ${fade * 0.55})`);
        glow.addColorStop(1, `rgba(${tone}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${tone}, ${fade})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const visibility = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
        if (running && !frame) {
          last = performance.now();
          frame = requestAnimationFrame(draw);
        } else if (!running && frame) {
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
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      visibility.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}

export default GraphCanvas;
