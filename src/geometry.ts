import type { Geometry, Point, Settings, Shape } from './types.ts';
import { random } from './random.ts';

// Convex leaf profiles remain nested when scaled about their center. This makes
// the coverage calibration monotonic, including overlapping leaves and branches.
export function generateGeometry(seed: number, settings: Settings, target: number): Geometry {
  const rng = random(seed);
  const plant = settings.plant === 'random' ? (rng() < 0.5 ? 'herb' : 'woody') : settings.plant;
  const size = { small: 0.62, medium: 1, large: 1.65 }[settings.size];
  const shapes: Shape[] = [];
  const groups = Math.max(1, Math.round((3 + target * 0.16) / (size * size)));
  const anchors = Array.from({ length: settings.cluster === 2 ? 2 : 5 }, () => ({ x: rng(), y: rng() }));
  const pointAt = (a: Point, angle: number, length: number): Point => ({ x: a.x + Math.cos(angle) * length, y: a.y + Math.sin(angle) * length });

  function leaf(center: Point, angle: number, length: number, width: number): void {
    const tilt = 0.25 + rng() * 1.1;
    const roll = (rng() - 0.5) * 0.65;
    // Orthographic projection: tilt reduces width; curl shears a convex profile.
    const foreshorten = Math.cos(tilt * settings.depth / 3);
    const shear = roll * settings.depth / 3;
    const points: Point[] = [];
    for (let i = 0; i < 24; i++) {
      const t = i * Math.PI * 2 / 24;
      const u = Math.cos(t) * length / 2;
      const v = Math.sin(t) * (0.72 + 0.28 * Math.abs(Math.sin(t))) * width / 2 * foreshorten;
      points.push({ x: (u + shear * v) * Math.cos(angle) - v * Math.sin(angle), y: (u + shear * v) * Math.sin(angle) + v * Math.cos(angle) });
    }
    shapes.push({ center, points, kind: 'leaf', tone: rng(), z: rng() });
  }
  function branch(a: Point, b: Point, width: number): void {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const nx = -dy / len * width / 2, ny = dx / len * width / 2;
    shapes.push({ center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, points: [
      { x: -dx / 2 + nx, y: -dy / 2 + ny }, { x: dx / 2 + nx * 0.4, y: dy / 2 + ny * 0.4 },
      { x: dx / 2 - nx * 0.4, y: dy / 2 - ny * 0.4 }, { x: -dx / 2 - nx, y: -dy / 2 - ny },
    ], kind: 'branch', tone: rng(), z: -1 });
  }
  for (let g = 0; g < groups; g++) {
    const anchor = anchors[g % anchors.length];
    const spread = settings.cluster === 2 ? 0.28 : 0.65;
    const base = settings.cluster === 0 ? { x: rng(), y: rng() } :
      { x: anchor.x + (rng() - 0.5) * spread, y: anchor.y + (rng() - 0.5) * spread };
    if (plant === 'herb') {
      const phase = rng() * Math.PI * 2;
      for (let k = 0; k < 13; k++) {
        const angle = phase + k * 2.39996 + (rng() - 0.5) * 0.3;
        const length = (0.055 + rng() * 0.12) * size;
        const center = pointAt(base, angle, length * 0.35);
        leaf(center, angle, length, length * (0.07 + rng() * 0.09));
      }
    } else {
      const direction = rng() * Math.PI * 2;
      const trunkLength = (0.12 + rng() * 0.12) * size;
      const end = pointAt(base, direction, trunkLength);
      branch(base, end, 0.005 * size);
      for (let k = 1; k <= 5; k++) {
        const origin = pointAt(base, direction, trunkLength * k / 6);
        for (const side of [-1, 1]) {
          const angle = direction + side * (0.65 + rng() * 0.4);
          const length = (0.045 + rng() * 0.065) * size;
          const tip = pointAt(origin, angle, length);
          branch(origin, tip, 0.0018 * size);
          for (let n = 1; n <= 3; n++) {
            const center = pointAt(origin, angle, length * n / 3);
            const leafLength = (0.035 + rng() * 0.03) * size;
            leaf(center, angle + side * 0.35, leafLength, leafLength * (0.38 + rng() * 0.2));
          }
        }
      }
    }
  }
  shapes.sort((a, b) => a.z - b.z);
  return { seed, plant, shapes };
}

export function projectShape(shape: Shape, scale: number): Point[] {
  return shape.points.map(p => ({ x: shape.center.x + p.x * scale, y: shape.center.y + p.y * scale }));
}
