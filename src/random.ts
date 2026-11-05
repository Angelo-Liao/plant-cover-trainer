export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function freshSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
export function stratifiedTargets(min: number, max: number, count: number, seed: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 100 || min > max || count < 1) {
    throw new Error('覆蓋度範圍須介於 0–100%，下限不能大於上限。');
  }
  const rng = random(seed);
  const values = Array.from({ length: count }, (_, i) =>
    Math.max(min, Math.min(max, Math.round((min + (max - min) * (i + rng()) / count) * 10) / 10)));
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
