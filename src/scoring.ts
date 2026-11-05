import type { Answer } from './types.ts';
export function parseEstimate(value: string): number | null {
  if (!/^\d{1,3}(\.\d)?$/.test(value.trim())) return null;
  const number = Number(value);
  return number >= 0 && number <= 100 ? number : null;
}
export function score(estimate: number, actual: number) {
  const signed = estimate - actual;
  return { signed, absolute: Math.abs(signed), relative: actual === 0 ? null : Math.abs(signed) / actual * 100 };
}
export function summarize(answers: Answer[]) {
  if (!answers.length) return { count: 0, mae: 0, bias: 0 };
  return {
    count: answers.length,
    mae: answers.reduce((sum, a) => sum + Math.abs(a.estimate - a.actual), 0) / answers.length,
    bias: answers.reduce((sum, a) => sum + a.estimate - a.actual, 0) / answers.length,
  };
}
