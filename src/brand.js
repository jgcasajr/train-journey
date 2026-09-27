import { t } from './i18n.js';

export const BRAND = { org: 'NexionAI Systems', project: 'Fractal Nexus', station: 'Nexus' };

const SPLASH_KEY = 'train-journey:splash-seen';
const SPLASH_MS = 4200;
const FADE_MS = 900;

/** One branch of the emblem: a node that splits into three smaller branches, fractal-style. */
function branch(ctx, x, y, angle, len, depth) {
  const nx = x + Math.cos(angle) * len;
  const ny = y + Math.sin(angle) * len;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(nx, ny);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(nx, ny, Math.max(0.8, len * 0.12), 0, Math.PI * 2);
  ctx.fill();
  if (depth <= 0) return;
  [-0.62, 0, 0.62].forEach((turn) => branch(ctx, nx, ny, angle + turn, len * 0.46, depth - 1));
}

/**
 * The Fractal Nexus emblem: a central node with six fractal branches inside a ring.
 * `color` is any canvas color; `depth` controls how many times the branches split.
 */
export function drawNexusEmblem(ctx, x, y, r, color, depth = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, r * 0.035);
  for (let i = 0; i < 6; i++) branch(ctx, x, y, -Math.PI / 2 + (i * Math.PI) / 3, r * 0.5, depth);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function emblemCanvas(doc, size) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = doc.createElement('canvas');
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Emblem: 2D context unavailable');
  ctx.scale(dpr, dpr);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#8fd3ff');
  g.addColorStop(1, '#c69bff');
  drawNexusEmblem(ctx, size / 2, size / 2, size * 0.44, g, 2);
  return canvas;
}

function seenSplash() {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1';
  } catch (err) {
    console.warn('Session storage unavailable:', err);
    return false;
  }
}

function rememberSplash() {
  try {
    sessionStorage.setItem(SPLASH_KEY, '1');
  } catch (err) {
    console.warn('Splash preference not saved:', err);
  }
}

function text(doc, tag, className, content) {
  const node = doc.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}

/**
 * Opening card ("Fractal Nexus · NexionAI Systems presents"), once per browser session.
 * Tap/click or any key skips it; `?nosplash` turns it off.
 */
export function showSplash(doc, params) {
  if (params.has('nosplash') || seenSplash()) return;
  rememberSplash();
  const splash = text(doc, 'div', 'splash', '');
  splash.setAttribute('role', 'presentation');
  splash.append(
    emblemCanvas(doc, 120),
    text(doc, 'p', 'splash-kicker', `${BRAND.project} · ${BRAND.org}`),
    text(doc, 'p', 'splash-presents', t('apresenta')),
    text(doc, 'h1', 'splash-title', 'Train Journey'),
    text(doc, 'p', 'splash-tagline', t('Uma nova fase começa na próxima estação.')),
  );
  doc.body.append(splash);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    splash.classList.add('leaving');
    setTimeout(() => splash.remove(), FADE_MS);
  };
  splash.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  doc.addEventListener('keydown', close, { once: true });
  setTimeout(close, SPLASH_MS);
}
