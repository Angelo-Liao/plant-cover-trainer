export type Plant = 'herb' | 'woody' | 'random';
export type Level = 0 | 1 | 2 | 3;
export type Point = { x: number; y: number };
export type Settings = {
  min: number; max: number; plant: Plant; size: 'small' | 'medium' | 'large';
  cluster: 0 | 1 | 2; color: boolean; palette: 'green' | 'dry' | 'mixed';
  background: 'soil' | 'dark' | 'sky'; texture: Level; shadow: Level; depth: Level;
};
export type Shape = {
  center: Point; points: Point[]; kind: 'leaf' | 'branch'; tone: number; z: number;
};
export type Geometry = { seed: number; plant: Exclude<Plant, 'random'>; shapes: Shape[] };
export type Question = {
  seed: number; version: string; target: number; actual: number; scale: number;
  geometry: Geometry; mask: Uint8Array; resolution: number; settings: Settings;
};
export type Answer = {
  seed: number; version: string; target: number; actual: number; estimate: number;
};
export type Session = {
  date: string; settings: Settings; answers: Answer[];
};
export const DEFAULTS: Settings = {
  min: 0, max: 100, plant: 'random', size: 'medium', cluster: 1,
  color: false, palette: 'green', background: 'soil', texture: 0, shadow: 0, depth: 0,
};
export const VERSION = '1.0.0';
export const isAdvanced = (s: Settings): boolean => s.color || s.texture > 0 || s.shadow > 0 || s.depth > 0;
