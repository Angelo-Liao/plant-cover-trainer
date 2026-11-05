import type { Geometry, Point, Question, Settings } from './types.ts';
import { VERSION } from './types.ts';
import { generateGeometry, projectShape } from './geometry.ts';

export const RESOLUTION = 1024;
export const TOLERANCE = 0.05;

// Deterministic pixel-center scan conversion. A binary union counts each sample
// once; rasterizing outside the quadrat cannot contribute to the answer.
export function rasterize(polygons: Point[][], resolution: number): Uint8Array {
  const mask = new Uint8Array(resolution * resolution);
  for (const points of polygons) {
    if (points.length < 3) continue;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const from = Math.max(0, Math.ceil(minY * resolution - 0.5));
    const to = Math.min(resolution - 1, Math.floor(maxY * resolution - 0.5));
    for (let row = from; row <= to; row++) {
      const y = (row + 0.5) / resolution;
      const intersections: number[] = [];
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[j], b = points[i];
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
          intersections.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) {
        const left = Math.max(0, Math.ceil(intersections[i] * resolution - 0.5));
        const right = Math.min(resolution, Math.ceil(intersections[i + 1] * resolution - 0.5));
        if (right > left) mask.fill(1, row * resolution + left, row * resolution + right);
      }
    }
  }
  return mask;
}
export function area(mask: Uint8Array): number {
  let covered = 0;
  for (let i = 0; i < mask.length; i++) covered += mask[i];
  return covered / mask.length * 100;
}
export function geometryMask(geometry: Geometry, scale: number, resolution = RESOLUTION): Uint8Array {
  return rasterize(geometry.shapes.map(shape => projectShape(shape, scale)), resolution);
}
function* questionSteps(seed: number, settings: Settings, target: number, resolution: number): Generator<void, Question> {
  if (!Number.isFinite(target) || target < 0 || target > 100) throw new Error('目標覆蓋度須介於 0–100%。');
  const geometry = generateGeometry(seed, settings, target);
  let scale = 0, actual = 0;
  let mask: Uint8Array = new Uint8Array(resolution * resolution);
  if (target === 100) { mask.fill(1); actual = 100; scale = Infinity; }
  else if (target > 0) {
    let low = 0, high = 1;
    for (let i = 0; i < 16 && area(geometryMask(geometry, high, resolution)) < target; i++) { high *= 2; yield; }
    let bestError = Infinity;
    for (let i = 0; i < 28; i++) {
      const candidateScale = (low + high) / 2;
      const candidate = geometryMask(geometry, candidateScale, resolution);
      const coverage = area(candidate);
      const error = Math.abs(coverage - target);
      if (error < bestError) { mask = candidate; actual = coverage; scale = candidateScale; bestError = error; }
      // Tighter than the public tolerance, allowing comfortable rounding margin.
      if (error < 0.008) break;
      if (coverage < target) low = candidateScale; else high = candidateScale;
      yield;
    }
    if (Math.abs(actual - target) >= TOLERANCE) throw new Error('這張圖未達面積精度要求，請重新出題。');
  }
  return { seed, version: VERSION, target, actual, scale, geometry, mask, resolution, settings: { ...settings } };
}

export function generateQuestion(seed: number, settings: Settings, target: number, resolution = RESOLUTION): Question {
  const steps = questionSteps(seed, settings, target, resolution);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

// Yield between calibration passes so dense scenes cannot freeze navigation.
// A canceled request must never overwrite a more recent question or mode.
export async function generateQuestionAsync(seed: number, settings: Settings, target: number, canceled: () => boolean): Promise<Question> {
  const steps = questionSteps(seed, settings, target, RESOLUTION);
  while (true) {
    if (canceled()) throw new Error('已取消出題');
    const step = steps.next();
    if (step.done) return step.value;
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
}
