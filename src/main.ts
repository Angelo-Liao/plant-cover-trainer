import type { Answer, Question, Session, Settings } from './types.ts';
import { DEFAULTS, isAdvanced } from './types.ts';
import { freshSeed, stratifiedTargets } from './random.ts';
import { generateQuestionAsync } from './coverage.ts';
import { paint } from './render.ts';
import { parseEstimate, score, summarize } from './scoring.ts';
import { normalizeSettings, readSaved, save } from './storage.ts';

type Mode = 'practice' | 'exam' | 'demo';
const element = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const input = (id: string): HTMLInputElement => element<HTMLInputElement>(id);
const select = (id: string): HTMLSelectElement => element<HTMLSelectElement>(id);
const show = (id: string, visible: boolean): void => { element(id).hidden = !visible; };
const text = (id: string, value: string): void => { element(id).textContent = value; };
const fmt = (v: number): string => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);
const escapeHTML = (value: string): string => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const settingsDescription = (s: Settings): string => [
  `${s.min}–${s.max}%`, { herb: '草本', woody: '木本', random: '隨機植物' }[s.plant],
  `${{ small: '小', medium: '中', large: '大' }[s.size]}葉片`, ['分散', '中度聚集', '高度聚集'][s.cluster],
  s.color ? `${{ green: '綠葉', dry: '枯葉', mixed: '混合配色' }[s.palette]}／${{ soil: '淺土色', dark: '深土色', sky: '天空' }[s.background]}` : '',
  s.texture ? `紋理${s.texture}` : '', s.shadow ? `陰影${s.shadow}` : '', s.depth ? `立體感${s.depth}` : '',
].filter(Boolean).join('、');

let settings: Settings = { ...DEFAULTS }, sessions: Session[] = [], storageAvailable = true;
try {
  const loaded = readSaved(localStorage);
  settings = loaded.settings; sessions = loaded.sessions; storageAvailable = loaded.available;
} catch { storageAvailable = false; }
let mode: Mode = 'practice', question: Question | null = null, busy = false, revealed = false;
let practiceNumber = 1, targets: number[] = [], targetIndex = 0;
let answers: Answer[] = [], examSettings: Settings | null = null, completed = false;
let demoTarget = 25, demoSeed = freshSeed(), requestId = 0, demoTimer: ReturnType<typeof setTimeout> | undefined;
let pendingMode: Mode | null = null;
let lastRequest: { seed: number; settings: Settings; target: number; review?: Answer } | null = null;

function persist(): void {
  try { storageAvailable = save(localStorage, settings, sessions) && storageAvailable; }
  catch { storageAvailable = false; }
  show('storage-warning', !storageAvailable);
}
function syncControls(): void {
  input('range-min').value = String(settings.min); input('range-max').value = String(settings.max);
  select('plant').value = settings.plant; select('leaf-size').value = settings.size; select('cluster').value = String(settings.cluster);
  input('color').checked = settings.color; select('palette').value = settings.palette; select('background').value = settings.background;
  for (const name of ['texture', 'shadow', 'depth'] as const) select(name).value = String(settings[name]);
  show('color-settings', settings.color);
  element('preset-all').classList.toggle('active', settings.min === 0 && settings.max === 100);
  element('preset-low').classList.toggle('active', settings.min === 0 && settings.max === 10);
}
function updateHistory(): void {
  text('history-count', `${sessions.length} 次`);
  element('history-content').innerHTML = sessions.length ? sessions.map(s => {
    const metrics = summarize(s.answers);
    return `<article class="history-entry"><p>${escapeHTML(new Date(s.date).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' }))} · ${isAdvanced(s.settings) ? '進階' : '基礎'}</p><small>${escapeHTML(settingsDescription(s.settings))}</small><p>平均絕對誤差 ${fmt(metrics.mae)} 個百分點</p><p>${biasText(metrics.bias)}</p></article>`;
  }).join('') + '<p class="hint">保留最近 20 次完整測驗；不同外觀與範圍的成績不宜直接比較。</p>' : '<p class="hint">完成一次 20 題測驗，紀錄就會出現在這裡。資料只儲存在這個瀏覽器。</p>';
}
function biasText(value: number): string {
  if (Math.abs(value) < 0.05) return '平均偏差約 0.0 個百分點';
  return `平均${value > 0 ? '高估' : '低估'} ${fmt(Math.abs(value))} 個百分點`;
}
function resetAids(): void {
  for (const id of ['grid', 'silhouette', 'equivalent-toggle']) input(id).checked = false;
  show('equivalent', false); show('aids', false);
}
function renderQuestion(): void {
  if (!question) return;
  paint(element<HTMLCanvasElement>('plot'), question, { grid: input('grid').checked, silhouette: input('silhouette').checked });
  const percentSide = Math.sqrt(question.actual / 100) * 100;
  element('equivalent-fill').style.width = `${percentSide}%`; element('equivalent-fill').style.height = `${percentSide}%`;
  text('equivalent-label', `實際覆蓋度 ${fmt(question.actual)}%`);
}
function setBusy(value: boolean): void {
  busy = value; show('loading', value);
  element('plot').setAttribute('aria-busy', String(value));
  element<HTMLButtonElement>('submit').disabled = value || !question;
  input('estimate').disabled = value;
  element<HTMLButtonElement>('next').disabled = value;
  element<HTMLButtonElement>('reshuffle').disabled = value;
}
async function loadQuestion(seed: number, config: Settings, target: number, review?: Answer): Promise<void> {
  const id = ++requestId;
  lastRequest = { seed, settings: { ...config }, target, review };
  revealed = false; question = null;
  show('generation-error', false); show('feedback', false); show('next', false); show('input-error', false);
  if (mode === 'demo') show('aids', false); else resetAids();
  input('estimate').value = ''; input('estimate').removeAttribute('aria-invalid'); setBusy(true);
  show('answer-form', mode !== 'demo' && !completed);
  // Give the loading state a paint before the bounded CPU calculation.
  await new Promise<void>(resolve => setTimeout(resolve, 24));
  if (id !== requestId) return;
  try {
    const generated = await generateQuestionAsync(seed, config, target, () => id !== requestId);
    if (id !== requestId) return;
    question = generated;
    renderQuestion();
    const typeLabel = question.geometry.plant === 'herb' ? '草本' : '木本';
    text('appearance-label', `${typeLabel}・${isAdvanced(config) ? '進階外觀' : '純剪影'}`);
    show('aids', mode === 'demo' || !!review);
    if (mode === 'demo') text('demo-actual', `實際覆蓋度 ${fmt(question.actual)}%。切換外觀保留種子與目標；「換一種分布」會重新生成。`);
    setBusy(false);
    if (review) revealAnswer(review.estimate, true);
  } catch (error) {
    if (id !== requestId) return;
    question = null; setBusy(false);
    // Never leave a stale image available for scoring after a failed generation.
    const plot = element<HTMLCanvasElement>('plot'); plot.getContext('2d')!.clearRect(0, 0, plot.width, plot.height);
    element('generation-error').querySelector('span')!.textContent = error instanceof Error ? error.message : '樣方生成失敗，請重新出題。';
    show('generation-error', true); show('answer-form', false); show('aids', false); text('demo-actual', '');
  }
}
function queueTargets(): void { targets = stratifiedTargets(settings.min, settings.max, 20, freshSeed()); targetIndex = 0; }
function nextPractice(focusAnswer = false): void {
  if (targetIndex >= targets.length) queueTargets();
  text('question-label', `第 ${practiceNumber} 題`);
  void loadQuestion(freshSeed(), settings, targets[targetIndex++]).then(() => {
    if (focusAnswer && mode === 'practice' && question && !busy) input('estimate').focus({ preventScroll: true });
  });
}
function revealAnswer(estimate: number, review = false): void {
  if (!question) return;
  revealed = true;
  const result = score(estimate, question.actual);
  const direction = Math.abs(result.signed) < 0.05 ? '與實際值相差不到 0.05 個百分點' :
    `${result.signed > 0 ? '高估' : '低估'} <strong>${fmt(result.absolute)}</strong> 個百分點`;
  element('feedback').innerHTML = `<div class="feedback-top"><h2>${review ? '回顧這一題' : '實際覆蓋度'}</h2><span class="actual">${fmt(question.actual)}<small>%</small></span></div><p>你估計 ${fmt(estimate)}% · ${direction}</p><p class="hint">相對誤差 ${result.relative === null ? '不適用（實際覆蓋度為 0%）' : fmt(result.relative) + '%'}。計算使用未四捨五入的實際面積。</p>`;
  show('feedback', true); show('aids', true); show('answer-form', false); show('next', !review);
  if (!review) element<HTMLButtonElement>('next').focus({ preventScroll: true });
}
function completeExam(): void {
  completed = true; revealed = true;
  const session: Session = { date: new Date().toISOString(), settings: { ...examSettings! }, answers: answers.map(a => ({ ...a })) };
  sessions.unshift(session); sessions = sessions.slice(0, 20); persist(); updateHistory();
  const metrics = summarize(answers), low = summarize(answers.filter(a => a.actual <= 10));
  const summary = element('summary');
  summary.innerHTML = `<p class="eyebrow">${isAdvanced(session.settings) ? '進階外觀' : '基礎剪影'}・20 題完成</p><h2>把誤差看清楚，就是進步的起點。</h2><p class="hint">${escapeHTML(settingsDescription(session.settings))}</p><div class="metrics"><div class="metric"><span>平均絕對誤差</span><strong>${fmt(metrics.mae)}</strong><small>個百分點，越小越接近實際面積</small></div><div class="metric"><span>${metrics.bias >= 0 ? '平均高估' : '平均低估'}</span><strong>${fmt(Math.abs(metrics.bias))}</strong><small>個百分點，觀察是否有固定偏向</small></div></div><p class="hint">${low.count ? `低覆蓋度（≤10%）：${low.count} 題，平均絕對誤差 ${fmt(low.mae)} 個百分點。` : '這次沒有實際覆蓋度 ≤10% 的題目。可選低覆蓋度範圍專門練習。'}</p><div class="table-wrap"><table><caption class="sr-only">逐題作答結果</caption><thead><tr><th scope="col">題目</th><th scope="col">你的估計</th><th scope="col">實際值</th><th scope="col">偏差（百分點）</th><th scope="col">樣方</th></tr></thead><tbody>${answers.map((a, i) => `<tr><td>${i + 1}</td><td>${fmt(a.estimate)}%</td><td>${fmt(a.actual)}%</td><td>${a.estimate - a.actual > 0.05 ? '+' : ''}${fmt(a.estimate - a.actual)}</td><td><button type="button" data-review="${i}" aria-label="查看第 ${i + 1} 題">查看</button></td></tr>`).join('')}</tbody></table></div><p class="hint">沒有合格門檻。比較進步時，請使用相同範圍與外觀設定；現場判讀的改善仍需另外驗證。</p><div class="summary-actions"><button id="restart-exam" class="primary">再測驗一次</button><button id="back-practice" class="secondary">回到練習</button></div>`;
  show('summary', true); show('answer-form', false); show('aids', true);
  revealAnswer(answers[answers.length - 1].estimate, true);
  text('question-label', '測驗完成・回顧第 20 題');
  text('settings-note', '本次測驗設定固定；可回到練習調整，再開始新測驗。');
  summary.querySelectorAll<HTMLButtonElement>('[data-review]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.review), answer = answers[index];
    text('question-label', `測驗完成・回顧第 ${index + 1} 題`);
    void loadQuestion(answer.seed, examSettings!, answer.target, answer);
    element('plot').scrollIntoView({ block: 'start', behavior: 'instant' });
  }));
  element('restart-exam').addEventListener('click', () => startMode('exam'));
  element('back-practice').addEventListener('click', () => startMode('practice'));
  summary.focus({ preventScroll: true }); summary.scrollIntoView({ block: 'start', behavior: 'instant' });
}
function startMode(nextMode: Mode): void {
  clearTimeout(demoTimer); requestId++; mode = nextMode; question = null; answers = []; completed = false; revealed = false;
  show('summary', false); show('feedback', false); show('next', false); show('demo-panel', mode === 'demo'); show('demo-error', false);
  show('answer-form', mode !== 'demo'); resetAids();
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  element<HTMLFieldSetElement>('settings-fields').disabled = mode === 'exam';
  text('mode-label', { practice: '即時練習', exam: '20 題測驗', demo: '自由示範' }[mode]);
  text('settings-note', mode === 'exam' ? '測驗中設定固定，完成 20 題後才揭曉。' : mode === 'demo' ? '外觀立即套用；示範比例由樣方下方調整。' : '調整後，從下一題開始套用。');
  if (mode === 'exam') {
    examSettings = { ...settings }; targets = stratifiedTargets(settings.min, settings.max, 20, freshSeed());
    text('question-label', '第 1 / 20 題'); void loadQuestion(freshSeed(), examSettings, targets[0]);
  } else if (mode === 'demo') {
    demoSeed = freshSeed(); text('question-label', '觀察與比較'); void loadQuestion(demoSeed, settings, demoTarget);
  } else { practiceNumber = 1; queueTargets(); nextPractice(); }
}
element<HTMLFormElement>('answer-form').addEventListener('submit', event => {
  event.preventDefault();
  if (busy || revealed || !question || mode === 'demo' || completed) return;
  const estimate = parseEstimate(input('estimate').value);
  if (estimate === null) {
    text('input-error', '請輸入 0–100 的數字，最多一位小數，例如 3 或 3.5。'); show('input-error', true);
    input('estimate').setAttribute('aria-invalid', 'true'); input('estimate').focus(); return;
  }
  show('input-error', false); input('estimate').removeAttribute('aria-invalid');
  if (mode === 'practice') revealAnswer(estimate);
  else {
    answers.push({ seed: question.seed, version: question.version, target: question.target, actual: question.actual, estimate });
    if (answers.length === 20) completeExam();
    else {
      text('question-label', `第 ${answers.length + 1} / 20 題`);
      void loadQuestion(freshSeed(), examSettings!, targets[answers.length]).then(() => { if (mode === 'exam' && !completed) input('estimate').focus({ preventScroll: true }); });
    }
  }
});
element('next').addEventListener('click', () => { if (busy || mode !== 'practice') return; practiceNumber++; nextPractice(true); });
element('retry').addEventListener('click', () => {
  if (lastRequest && !busy) {
    const seed = lastRequest.review ? lastRequest.seed : freshSeed();
    if (mode === 'demo') demoSeed = seed;
    void loadQuestion(seed, lastRequest.settings, lastRequest.target, lastRequest.review);
  }
});
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const nextMode = button.dataset.mode as Mode;
  if (nextMode === mode) return;
  if (mode === 'exam' && !completed) {
    pendingMode = nextMode; element<HTMLDialogElement>('leave-dialog').showModal();
  } else startMode(nextMode);
}));
element('leave-cancel').addEventListener('click', () => { pendingMode = null; element<HTMLDialogElement>('leave-dialog').close(); });
element('leave-confirm').addEventListener('click', () => {
  element<HTMLDialogElement>('leave-dialog').close(); if (pendingMode) startMode(pendingMode); pendingMode = null;
});
function changeSettings(): void {
  if (mode === 'exam') return;
  const min = parseEstimate(input('range-min').value), max = parseEstimate(input('range-max').value);
  if (min === null || max === null || min > max) {
    text('range-error', '範圍須為 0–100，最多一位小數，下限不可大於上限。'); show('range-error', true); return;
  }
  show('range-error', false);
  settings = normalizeSettings({ min, max, plant: select('plant').value, size: select('leaf-size').value,
    cluster: Number(select('cluster').value), color: input('color').checked, palette: select('palette').value,
    background: select('background').value, texture: Number(select('texture').value), shadow: Number(select('shadow').value), depth: Number(select('depth').value) });
  syncControls(); persist();
  if (mode === 'demo') scheduleDemo(); else queueTargets();
}
element('settings-fields').addEventListener('change', changeSettings);
for (const [id, max] of [['preset-all', 100], ['preset-low', 10]] as const) element(id).addEventListener('click', () => {
  input('range-min').value = '0'; input('range-max').value = String(max); changeSettings();
});
function scheduleDemo(): void {
  clearTimeout(demoTimer);
  demoTimer = setTimeout(() => { if (mode === 'demo') void loadQuestion(demoSeed, settings, demoTarget); }, 150);
}
function changeDemo(value: string): void {
  const next = parseEstimate(value);
  if (next === null) { text('demo-error', '請輸入 0–100，最多一位小數。'); show('demo-error', true); return; }
  show('demo-error', false); demoTarget = next;
  input('demo-target').value = String(next); input('demo-slider').value = String(next); scheduleDemo();
}
input('demo-slider').addEventListener('input', () => changeDemo(input('demo-slider').value));
input('demo-target').addEventListener('input', () => changeDemo(input('demo-target').value));
element('reshuffle').addEventListener('click', () => { if (busy) return; demoSeed = freshSeed(); void loadQuestion(demoSeed, settings, demoTarget); });
for (const id of ['grid', 'silhouette']) input(id).addEventListener('change', renderQuestion);
input('equivalent-toggle').addEventListener('change', () => show('equivalent', input('equivalent-toggle').checked));
element('help-open').addEventListener('click', () => element<HTMLDialogElement>('help-dialog').showModal());
element('help-close').addEventListener('click', () => element<HTMLDialogElement>('help-dialog').close());
if (matchMedia('(max-width: 640px)').matches) element<HTMLDetailsElement>('settings-panel').open = false;
window.addEventListener('beforeunload', event => {
  if (mode === 'exam' && !completed && answers.length > 0) { event.preventDefault(); event.returnValue = ''; }
});
syncControls(); persist(); updateHistory(); startMode('practice');
