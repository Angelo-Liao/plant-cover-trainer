import type { Question, Shape } from './types.ts';
import { projectShape } from './geometry.ts';
import { random } from './random.ts';

function canvasLayer(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; return canvas;
}
function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, scale: number, size: number): void {
  const points = projectShape(shape, scale);
  ctx.beginPath(); ctx.moveTo(points[0].x * size, points[0].y * size);
  for (const p of points.slice(1)) ctx.lineTo(p.x * size, p.y * size);
  ctx.closePath();
}
export function paint(canvas: HTMLCanvasElement, q: Question, options = { silhouette: false, grid: false }): void {
  const n = q.resolution, s = q.settings;
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  const pure = options.silhouette;
  const rng = random(q.seed ^ 0x5a21);
  ctx.fillStyle = !pure && s.color ? { soil: '#e8dfc9', dark: '#5b5144', sky: '#dcecf4' }[s.background] : '#ffffff';
  ctx.fillRect(0, 0, n, n);
  if (!pure && s.texture) {
    for (let i = 0; i < 900 * s.texture; i++) {
      ctx.fillStyle = i % 2 ? `rgba(50,40,20,${0.025 * s.texture})` : `rgba(255,255,255,${0.06 * s.texture})`;
      ctx.beginPath(); ctx.ellipse(rng() * n, rng() * n, 1 + rng() * 3, 1 + rng() * 1.5, rng() * 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  const maskCanvas = canvasLayer(n), maskContext = maskCanvas.getContext('2d')!;
  const pixels = maskContext.createImageData(n, n);
  for (let i = 0; i < q.mask.length; i++) {
    pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = 255;
    pixels.data[i * 4 + 3] = q.mask[i] * 255;
  }
  maskContext.putImageData(pixels, 0, 0);
  if (!pure && s.shadow) {
    const shadowCanvas = canvasLayer(n), sc = shadowCanvas.getContext('2d')!;
    sc.drawImage(maskCanvas, 0, 0); sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = `rgba(20,27,20,${0.14 + s.shadow * 0.07})`; sc.fillRect(0, 0, n, n);
    ctx.save(); ctx.filter = `blur(${2 + s.shadow}px)`;
    ctx.drawImage(shadowCanvas, 6 + s.shadow * 3, 8 + s.shadow * 4); ctx.restore();
  }
  const foliage = canvasLayer(n), fc = foliage.getContext('2d')!;
  fc.fillStyle = !pure && s.color ? '#385237' : '#263c31';
  fc.fillRect(0, 0, n, n);
  if (!pure && Number.isFinite(q.scale) && q.scale > 0) {
    for (const shape of q.geometry.shapes) {
      shapePath(fc, shape, q.scale, n);
      if (s.color) {
        const dry = s.palette === 'dry' || (s.palette === 'mixed' && shape.tone > 0.65);
        fc.fillStyle = shape.kind === 'branch' ? '#67543a' : dry
          ? `hsl(${32 + shape.tone * 16} 36% ${32 + shape.tone * 18}%)`
          : `hsl(${95 + shape.tone * 38} 32% ${24 + shape.tone * 18}%)`;
      } else fc.fillStyle = '#263c31';
      if (s.shadow) {
        fc.save(); fc.shadowColor = `rgba(15,25,15,${0.12 + s.shadow * 0.07})`;
        fc.shadowBlur = s.shadow * 1.5; fc.shadowOffsetX = s.shadow * 2; fc.shadowOffsetY = s.shadow * 2.5;
        fc.fill(); fc.restore();
      } else fc.fill();
      if (shape.kind === 'leaf' && (s.depth || s.texture || s.shadow)) {
        fc.save(); fc.clip();
        const points = projectShape(shape, q.scale), tip = points[0], base = points[12];
        if (s.depth || s.shadow) {
          const gradient = fc.createLinearGradient(base.x * n, base.y * n, tip.x * n, tip.y * n);
          gradient.addColorStop(0, `rgba(0,0,0,${s.depth * 0.055 + s.shadow * 0.025})`);
          gradient.addColorStop(0.52, 'rgba(255,255,255,0.08)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.03)');
          fc.fillStyle = gradient; fc.fill();
        }
        if (s.texture) {
          fc.lineWidth = 0.5 + s.texture * 0.3;
          fc.strokeStyle = `rgba(235,240,211,${s.texture * 0.15})`;
          fc.beginPath(); fc.moveTo(base.x * n, base.y * n); fc.lineTo(tip.x * n, tip.y * n); fc.stroke();
          for (let j = 2; j <= 10; j += 2) {
            const mid = { x: base.x + (tip.x - base.x) * j / 12, y: base.y + (tip.y - base.y) * j / 12 };
            for (const idx of [12 - j, 12 + j]) {
              fc.beginPath(); fc.moveTo(mid.x * n, mid.y * n); fc.lineTo(points[idx].x * n, points[idx].y * n); fc.stroke();
            }
          }
          for (let j = 0; j < 8; j++) {
            fc.fillStyle = `rgba(230,220,175,${0.04 * s.texture})`;
            const p = points[Math.floor(rng() * points.length)];
            fc.beginPath(); fc.arc((p.x + shape.center.x) * n / 2, (p.y + shape.center.y) * n / 2, 1 + rng() * 2, 0, Math.PI * 2); fc.fill();
          }
        }
        fc.restore();
      }
    }
  }
  // The measured binary union is the final alpha, independent of decoration.
  fc.globalCompositeOperation = 'destination-in'; fc.drawImage(maskCanvas, 0, 0);
  ctx.drawImage(foliage, 0, 0);
  if (options.grid) {
    ctx.strokeStyle = 'rgba(110,110,110,0.65)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(i * n / 10, 0); ctx.lineTo(i * n / 10, n); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * n / 10); ctx.lineTo(n, i * n / 10); ctx.stroke();
    }
  }
}
