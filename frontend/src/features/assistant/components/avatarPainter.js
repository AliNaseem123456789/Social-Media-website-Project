/**
 * Draws the assistant robot on a 2D canvas.
 *
 * Plain JavaScript, no React: the component owns the animation loop and the theme, this owns one frame.
 * Separating them is what lets the drawing be rendered and looked at outside the app — which is how the
 * first version's bug was found, where every radius came out about fifty times too large.
 *
 * Canvas rather than a WebGL library, for the same reason as the landing page graph: the scene is one
 * sphere, two eyes, an antenna and forty points on a circle. Projecting those by hand is a page of
 * arithmetic where three.js would be several hundred kilobytes to draw the same picture. The depth is
 * real — every point is rotated in 3D and perspective-divided, and the ring is drawn in two passes so the
 * half behind the head is hidden by it and the half in front is not. That occlusion is what makes it read
 * as dimensional rather than as a spinning ellipse.
 */

export const STATES = {
  idle: { spin: 0.28, tilt: 0.1, ringR: 1.0, eyeOpen: 1.0, glow: 0.35, bob: 1.0 },
  listening: { spin: 0.55, tilt: 0.18, ringR: 1.1, eyeOpen: 1.25, glow: 0.8, bob: 1.5 },
  thinking: { spin: 1.5, tilt: 0.34, ringR: 0.88, eyeOpen: 0.55, glow: 0.6, bob: 0.5 },
  speaking: { spin: 0.7, tilt: 0.12, ringR: 1.04, eyeOpen: 1.0, glow: 1.0, bob: 1.2 },
};

const RING_POINTS = 44;
// Far enough back that perspective reads as depth without the near half of the ring swinging outside the
// box. A closer camera is more dramatic and spends that drama on clipped dots in the corners.
const CAMERA_Z = 4.5;
const RING_RADIUS = 1.45;
const RING_TILT = 0.72;

/**
 * Rotate around Y, then X, then perspective divide.
 *
 * `k` is the perspective factor alone — roughly 0.8 near the back to 1.4 near the front — and the model
 * scale is applied to the coordinates here. Keeping the two apart matters: callers multiply radii and
 * stroke widths by `k` to make near things bigger, and if `k` also carried the scale those would come out
 * scale-times too large.
 */
export function project(x, y, z, yaw, pitch, scale) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = z * cy - x * sy;

  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // Both outputs read the pre-rotation y and z1. Feeding y1 back into z2 is not a rotation at all — it
  // scales the point as it turns, and the ring visibly breathes in and out as it spins.
  const y1 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;

  // +z is toward the viewer, so a larger z is nearer and gets a larger k. Getting this sign backwards is
  // subtle and ugly: the scene still moves, but the half of the ring behind the head is the half drawn
  // bigger and brighter, and the whole thing stops reading as depth.
  const k = CAMERA_Z / Math.max(0.5, CAMERA_Z - z2);
  return { x: x1 * k * scale, y: y1 * k * scale, z: z2, k };
}

/**
 * One frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {number} options.size      CSS pixels, square
 * @param {number} options.dpr       device pixel ratio the canvas was sized for
 * @param {object} options.colors    { ink, shell, line } as real colour values, not CSS variables
 * @param {object} options.pose      eased state values, shaped like a STATES entry
 * @param {string} options.state     which state, for the three details that are not interpolable
 * @param {number} options.elapsed   ms since the loop started
 * @param {number} options.spinAngle accumulated ring rotation, radians
 * @param {number} options.blink     0 shut to 1 open
 * @param {number} options.amplitude 0 to 1, live voice level
 * @param {boolean} options.still    true for reduced motion: a fixed, pleasant pose
 */
export function paint(ctx, { size, dpr, colors, pose, state, elapsed, spinAngle, blink, amplitude, still }) {
  const { ink, shell, line } = colors;

  const bob = still ? 0 : Math.sin(elapsed / 900) * pose.bob;
  const yaw = still ? 0.4 : Math.sin(elapsed / 1700) * 0.45;
  const pitch = still ? 0.12 : pose.tilt + Math.sin(elapsed / 2300) * 0.08;

  const cx = size / 2;
  const cy = size / 2 + bob;
  // Sized so the antenna tip, its halo, and the near half of the ring all stay inside the box once the
  // bob is added — the near half is the constraint, because perspective makes it the widest thing here.
  const scale = size * 0.185;
  const headR = size * 0.185;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  // ---- the ring, back half ----------------------------------------------------------------------
  const points = [];
  for (let i = 0; i < RING_POINTS; i += 1) {
    const a = (i / RING_POINTS) * Math.PI * 2 + spinAngle;
    const wobble = still ? 0 : Math.sin(a * 3 + elapsed / 500) * 0.06;
    const r = RING_RADIUS * pose.ringR + wobble;
    // y = TILT * z, so the orbital plane leans about 36 degrees: the near half passes below the chin and
    // the far half above the head. A flatter ring looks tidier in the abstract and is wrong in practice —
    // its nearest point sits at face height and draws a line of dots straight across the eyes.
    points.push(project(Math.cos(a) * r, Math.sin(a) * r * RING_TILT, Math.sin(a) * r, yaw, pitch, scale));
  }

  const dot = (p, front) => {
    // Nearer points are bigger and more opaque: the cheapest honest depth cue there is.
    const radius = Math.max(0.7, size * (front ? 0.019 : 0.014) * p.k);
    ctx.globalAlpha = (front ? 0.9 : 0.34) * (0.55 + pose.glow * 0.45);
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  points.filter((p) => p.z <= 0).forEach((p) => dot(p, false));

  // ---- the head ---------------------------------------------------------------------------------
  // A soft shadow under it, which is most of why it reads as floating rather than pasted on. Kept close
  // to the body: pushed further down it stops being a shadow and becomes a second object.
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(cx, cy + headR * 1.35, headR * 0.72, headR * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Light from the upper left, so the sphere has a direction rather than being a flat disc.
  const sphere = ctx.createRadialGradient(
    cx - headR * 0.4,
    cy - headR * 0.45,
    headR * 0.08,
    cx,
    cy,
    headR * 1.3,
  );
  sphere.addColorStop(0, shell);
  sphere.addColorStop(0.55, shell);
  sphere.addColorStop(1, line);
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(cx, cy, headR, 0, Math.PI * 2);
  ctx.fill();

  // A warm rim rather than a neutral outline. The shell is the surface colour, so on a light page the
  // head is white on near-white and on a dark one it is charcoal on charcoal — in both cases the edge is
  // the only thing separating it from the background, and a hairline of the accent does that in both.
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.beginPath();
  ctx.arc(cx, cy, headR, 0, Math.PI * 2);
  ctx.stroke();

  // A specular highlight where the light is coming from, which is what finally reads as "sphere" rather
  // than "circle with a gradient".
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.ellipse(cx - headR * 0.42, cy - headR * 0.48, headR * 0.26, headR * 0.17, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ---- the antenna ------------------------------------------------------------------------------
  const tip = project(0, -1.75, 0, yaw, pitch, scale);
  const base = project(0, -0.96, 0, yaw, pitch, scale);
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1, size * 0.018);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + base.x, cy + base.y);
  ctx.lineTo(cx + tip.x, cy + tip.y);
  ctx.stroke();

  const pulse = still ? 0.7 : 0.6 + Math.sin(elapsed / (state === "thinking" ? 180 : 700)) * 0.4;
  const halo = size * 0.13;
  const tipGlow = ctx.createRadialGradient(cx + tip.x, cy + tip.y, 0, cx + tip.x, cy + tip.y, halo);
  tipGlow.addColorStop(0, ink);
  tipGlow.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.2 + pulse * pose.glow * 0.45;
  ctx.fillStyle = tipGlow;
  ctx.beginPath();
  ctx.arc(cx + tip.x, cy + tip.y, halo, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(cx + tip.x, cy + tip.y, Math.max(1.5, size * 0.033), 0, Math.PI * 2);
  ctx.fill();

  // ---- the face ---------------------------------------------------------------------------------
  // Eye positions are projected too, so they slide across the face as the head turns. Fixed eyes on a
  // turning head is the single thing that makes a face like this look dead.
  const lid = Math.max(0.08, blink) * pose.eyeOpen;
  const eyes = [project(-0.34, -0.1, 0.9, yaw, pitch, scale), project(0.34, -0.1, 0.9, yaw, pitch, scale)];

  ctx.fillStyle = ink;
  eyes.forEach((eye) => {
    const w = size * 0.028 * eye.k;
    const h = size * 0.044 * lid * eye.k;
    ctx.beginPath();
    // An ellipse rather than a dot, so it can squash to a line when it blinks.
    ctx.ellipse(cx + eye.x, cy + eye.y, Math.max(0.9, w), Math.max(0.6, h), 0, 0, Math.PI * 2);
    ctx.fill();
  });

  const mouth = project(0, 0.46, 0.9, yaw, pitch, scale);
  const mx = cx + mouth.x;
  const my = cy + mouth.y;
  ctx.strokeStyle = ink;

  if (state === "speaking") {
    const bars = 5;
    const width = size * 0.19 * mouth.k;
    ctx.lineWidth = Math.max(1.3, size * 0.026);
    for (let i = 0; i < bars; i += 1) {
      const t = i / (bars - 1);
      // Middle bars taller than the edges, plus the live level: it reads as a voice rather than a random
      // equaliser.
      const shape = Math.sin(t * Math.PI);
      const jitter = still ? 0.5 : (Math.sin(elapsed / 90 + i * 1.7) + 1) / 2;
      const h = size * 0.05 * shape * (0.35 + 0.65 * jitter * (0.45 + amplitude));
      const bx = mx - width / 2 + t * width;
      ctx.beginPath();
      ctx.moveTo(bx, my - h);
      ctx.lineTo(bx, my + h);
      ctx.stroke();
    }
  } else if (state === "thinking") {
    // A flat line: it is not talking to you yet.
    ctx.lineWidth = Math.max(1.1, size * 0.018);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(mx - size * 0.045 * mouth.k, my);
    ctx.lineTo(mx + size * 0.045 * mouth.k, my);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.lineWidth = Math.max(1.3, size * 0.024);
    ctx.beginPath();
    ctx.arc(mx, my - size * 0.035, size * 0.062 * mouth.k, 0.3 * Math.PI, 0.7 * Math.PI);
    ctx.stroke();
  }

  // ---- the ring, front half ---------------------------------------------------------------------
  points.filter((p) => p.z > 0).forEach((p) => dot(p, true));
  ctx.globalAlpha = 1;
}
