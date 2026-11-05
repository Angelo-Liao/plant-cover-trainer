import test from 'node:test';
import assert from 'node:assert/strict';
import { area, rasterize, generateQuestion, generateQuestionAsync, geometryMask, TOLERANCE } from '../src/coverage.ts';
import { generateGeometry } from '../src/geometry.ts';
import { DEFAULTS } from '../src/types.ts';
import { stratifiedTargets } from '../src/random.ts';
import { parseEstimate, score, summarize } from '../src/scoring.ts';
import { normalizeSettings, readSaved, save } from '../src/storage.ts';

const rectangle = (x, y, w, h) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];

test('known areas, union, clipping, and empty input', () => {
  assert.equal(area(rasterize([], 100)), 0);
  assert.equal(area(rasterize([rectangle(0, 0, 1, 1)], 100)), 100);
  assert.equal(area(rasterize([rectangle(0, 0, 0.03, 1)], 100)), 3);
  assert.equal(area(rasterize([rectangle(0, 0, 0.5, 1), rectangle(0.25, 0, 0.5, 1)], 100)), 75);
  assert.equal(area(rasterize([rectangle(-0.5, -0.5, 1, 1)], 100)), 25);
  assert.equal(area(rasterize([rectangle(1.1, 0, 1, 1)], 100)), 0);
  const triangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  assert.ok(Math.abs(area(rasterize([triangle], 1024)) - 50) < 0.05);
});

test('calibration covers endpoints and very sparse / dense scenes for both plants', () => {
  for (const plant of ['herb', 'woody']) for (const target of [0, 0.1, 1, 3, 5, 25, 95, 99.9, 100]) {
    const q = generateQuestion(42, { ...DEFAULTS, plant }, target);
    assert.ok(Math.abs(q.actual - target) < TOLERANCE, `${plant}: ${target} → ${q.actual}`);
    assert.equal(q.actual, area(q.mask));
    assert.equal(q.mask.length, 1024 * 1024);
  }
  assert.throws(() => generateQuestion(1, DEFAULTS, NaN));
  assert.throws(() => generateQuestion(1, DEFAULTS, 100.1));
});

test('calibration across seed, leaf size, clustering, and depth variations', () => {
  for (let i = 0; i < 24; i++) {
    const config = { ...DEFAULTS, plant: i % 2 ? 'herb' : 'woody', size: ['small', 'medium', 'large'][i % 3], cluster: Math.floor(i / 3) % 3, depth: i % 4 };
    const target = [0.1, 3, 5, 40, 75, 99.9][i % 6];
    const q = generateQuestion(i * 7919 + 101, config, target);
    assert.ok(Math.abs(q.actual - target) < TOLERANCE, JSON.stringify({ i, target, actual: q.actual, config }));
  }
});

test('doubling raster resolution agrees within the stated 0.05 percentage point tolerance', () => {
  for (const [seed, plant, target, size, depth] of [[89, 'herb', 3, 'small', 3], [42, 'woody', 25, 'medium', 0], [913, 'herb', 95, 'large', 2], [174, 'woody', 5, 'small', 3]]) {
    const q = generateQuestion(seed, { ...DEFAULTS, plant, size, depth }, target);
    const high = area(geometryMask(q.geometry, q.scale, 2048));
    assert.ok(Math.abs(high - q.actual) < 0.05, `${plant} ${target}: ${q.actual} versus ${high}`);
  }
});

test('appearance does not change geometry, mask, or true cover; depth changes geometry and recalibrates', () => {
  const base = generateQuestion(1651, { ...DEFAULTS, plant: 'woody' }, 5);
  const decorated = generateQuestion(1651, { ...DEFAULTS, plant: 'woody', color: true, palette: 'mixed', background: 'dark', texture: 3, shadow: 3 }, 5);
  assert.deepEqual(base.geometry, decorated.geometry); assert.deepEqual(base.mask, decorated.mask); assert.equal(base.actual, decorated.actual);
  const depth = generateQuestion(1651, { ...DEFAULTS, plant: 'woody', depth: 3 }, 5);
  assert.notDeepEqual(base.geometry, depth.geometry);
  assert.ok(Math.abs(depth.actual - 5) < TOLERANCE);
  assert.deepEqual(base, generateQuestion(1651, { ...DEFAULTS, plant: 'woody' }, 5));
});

test('primitive scale yields monotonically increasing unions', () => {
  const geometry = generateGeometry(991, { ...DEFAULTS, depth: 3, plant: 'herb' }, 25);
  let previous = new Uint8Array(256 * 256);
  for (const scale of [0.1, 0.2, 0.5, 1, 2, 4, 8, 16]) {
    const next = geometryMask(geometry, scale, 256);
    for (let i = 0; i < next.length; i++) assert.ok(next[i] >= previous[i]);
    previous = next;
  }
});

test('asynchronous generation matches synchronous results and honors cancellation', async () => {
  const config = { ...DEFAULTS, plant: 'herb', depth: 2 };
  const result = await generateQuestionAsync(82, config, 5, () => false);
  assert.deepEqual(result, generateQuestion(82, config, 5));
  let checks = 0;
  await assert.rejects(generateQuestionAsync(82, config, 95, () => ++checks > 2), /已取消/);
});

test('stratified sampling spans the range, shuffles, and is repeatable', () => {
  const targets = stratifiedTargets(0, 100, 20, 92);
  assert.equal(targets.length, 20);
  assert.deepEqual(targets, stratifiedTargets(0, 100, 20, 92));
  const sorted = targets.toSorted((a, b) => a - b);
  assert.notDeepEqual(targets, sorted);
  sorted.forEach((v, i) => assert.ok(v >= i * 5 && v <= (i + 1) * 5));
  assert.deepEqual(stratifiedTargets(3, 3, 20, 92), Array(20).fill(3));
  assert.throws(() => stratifiedTargets(10, 0, 20, 92));
});

test('input validation and unbiased error metrics handle zero and decimals', () => {
  for (const value of ['', ' ', '-1', '100.1', '3.14', '1e1', 'NaN', '3%']) assert.equal(parseEstimate(value), null, value);
  for (const [value, expected] of [['0', 0], ['100', 100], ['3.5', 3.5], [' 5 ', 5]]) assert.equal(parseEstimate(value), expected);
  assert.deepEqual(score(5, 3), { signed: 2, absolute: 2, relative: 2 / 3 * 100 });
  assert.equal(score(0, 0).relative, null);
  assert.deepEqual(summarize([{ estimate: 5, actual: 3 }, { estimate: 3, actual: 5 }]), { count: 2, mae: 2, bias: 0 });
});

test('storage corruption and denial cannot prevent a session; history is bounded', () => {
  assert.equal(readSaved({ getItem() { throw Error('blocked'); } }).available, false);
  assert.equal(readSaved({ getItem() { return '{broken'; } }).available, false);
  assert.equal(save({ setItem() { throw Error('quota'); } }, DEFAULTS, []), false);
  assert.deepEqual(normalizeSettings({ min: -5, plant: '<script>', shadow: 9 }), DEFAULTS);
  assert.equal(normalizeSettings({ min: 1.11 }).min, 0);
  const session = { date: '2026-11-05T01:00:00Z', settings: DEFAULTS, answers: Array.from({ length: 20 }, () => ({ seed: 1, version: '1.0.0', target: 3, actual: 3, estimate: 5 })) };
  let stored;
  assert.equal(save({ setItem(key, value) { stored = value; } }, DEFAULTS, Array(25).fill(session)), true);
  assert.equal(JSON.parse(stored).sessions.length, 20);
  assert.equal(readSaved({ getItem: () => stored }).sessions.length, 20);
  assert.equal(readSaved({ getItem: () => JSON.stringify({ sessions: [{ ...session, answers: [{ actual: Infinity }] }] }) }).sessions.length, 0);
});
