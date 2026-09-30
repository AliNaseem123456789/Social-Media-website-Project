/**
 * The same idea as the WebGL orb, standing still: what gets drawn when motion is turned down or the
 * browser has no WebGL. Positions are worked out once from a fixed formula, so it is the same picture
 * every time rather than a random scatter.
 */
const SIZE = 420;
const CENTRE = SIZE / 2;
const RADIUS = SIZE * 0.36;
const COUNT = 74;

const nodes = (() => {
  const points = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i += 1) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const theta = golden * i;
    // A flat projection of the sphere: x and y as drawn, z only to decide how near a point looks.
    points.push({
      x: CENTRE + Math.cos(theta) * ring * RADIUS,
      y: CENTRE + y * RADIUS,
      z: Math.sin(theta) * ring,
      i,
    });
  }
  return points;
})();

const links = (() => {
  const pairs = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (distance < 52 && (i + j) % 3 === 0) pairs.push([nodes[i], nodes[j]]);
    }
  }
  return pairs;
})();

export function StaticGraph() {
  return (
    <svg
      className="lp-static-graph"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="A sphere of points connected by lines, standing for people and the threads between them"
    >
      <g stroke="#a49b8c" strokeOpacity="0.28" strokeWidth="1">
        {links.map(([a, b]) => (
          <line key={`${a.i}-${b.i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </g>
      {nodes.map((node) => {
        const near = (node.z + 1) / 2;
        const tone = node.i % 11 === 0 ? "#e0431f" : node.i % 7 === 0 ? "#1c7a54" : "#948d80";
        return (
          <circle
            key={node.i}
            cx={node.x}
            cy={node.y}
            r={1.6 + near * 2.2}
            fill={tone}
            fillOpacity={0.35 + near * 0.5}
          />
        );
      })}
    </svg>
  );
}
