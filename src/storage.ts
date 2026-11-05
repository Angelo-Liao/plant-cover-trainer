import type { Session, Settings } from './types.ts';
import { DEFAULTS } from './types.ts';
export const STORAGE_KEY = 'plant-cover-trainer.v1';
export function normalizeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  const choice = <T>(value: unknown, choices: readonly T[], fallback: T): T => choices.includes(value as T) ? value as T : fallback;
  const validNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 && Math.abs(v * 10 - Math.round(v * 10)) < 1e-8;
  const min = validNumber(s.min) ? s.min : DEFAULTS.min;
  const max = validNumber(s.max) && s.max >= min ? s.max : Math.max(DEFAULTS.max, min);
  return { min, max,
    plant: choice(s.plant, ['herb', 'woody', 'random'] as const, DEFAULTS.plant),
    size: choice(s.size, ['small', 'medium', 'large'] as const, DEFAULTS.size),
    cluster: choice(s.cluster, [0, 1, 2] as const, DEFAULTS.cluster),
    color: s.color === true,
    palette: choice(s.palette, ['green', 'dry', 'mixed'] as const, DEFAULTS.palette),
    background: choice(s.background, ['soil', 'dark', 'sky'] as const, DEFAULTS.background),
    texture: choice(s.texture, [0, 1, 2, 3] as const, 0),
    shadow: choice(s.shadow, [0, 1, 2, 3] as const, 0),
    depth: choice(s.depth, [0, 1, 2, 3] as const, 0),
  };
}
export function readSaved(storage: Pick<Storage, 'getItem'>) {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    const sessions: Session[] = Array.isArray(raw.sessions) ? raw.sessions.filter((s: Session) =>
      s && typeof s.date === 'string' && Number.isFinite(Date.parse(s.date)) && s.settings &&
      Array.isArray(s.answers) && s.answers.length === 20 && s.answers.every(a =>
        a && typeof a.version === 'string' && Number.isInteger(a.seed) && Number.isFinite(a.target) &&
        a.target >= 0 && a.target <= 100 && Number.isFinite(a.actual) && a.actual >= 0 && a.actual <= 100 &&
        Number.isFinite(a.estimate) && a.estimate >= 0 && a.estimate <= 100))
      .slice(0, 20).map((s: Session) => ({ ...s, settings: normalizeSettings(s.settings) })) : [];
    return { settings: normalizeSettings(raw.settings), sessions, available: true };
  } catch { return { settings: { ...DEFAULTS }, sessions: [] as Session[], available: false }; }
}
export function save(storage: Pick<Storage, 'setItem'>, settings: Settings, sessions: Session[]): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ settings, sessions: sessions.slice(0, 20) })); return true; }
  catch { return false; }
}
