export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const mod = (n, m) => ((n % m) + m) % m;

export function smoothstep(edge0, edge1, v) {
  const t = clamp((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export const approach = (v, target, maxDelta) =>
  v < target ? Math.min(target, v + maxDelta) : Math.max(target, v - maxDelta);

/** Deterministic integer hash -> [0, 1). Same input always yields the same scenery. */
export function hash(n, seed = 0) {
  const a = (Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0;
  const b = Math.imul(a ^ (a >>> 13), 1274126177);
  return ((b ^ (b >>> 16)) >>> 0) / 4294967296;
}

export function noise1(x, seed) {
  const i = Math.floor(x);
  const f = x - i;
  return lerp(hash(i, seed), hash(i + 1, seed), f * f * (3 - 2 * f));
}

/** Fractal value noise in [0, 1]. */
export function fbm(x, seed, octaves = 4) {
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const amp = 0.5 ** (o + 1);
    sum += noise1(x * 2.03 ** o, seed + o * 17) * amp;
    norm += amp;
  }
  return sum / norm;
}

export function hex(str) {
  const n = parseInt(str.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const scale = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export function circle(ctx, x, y, r) {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

export function radialGlow(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  circle(ctx, x, y, radius);
  ctx.fill();
}
