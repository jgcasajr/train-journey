import { drawNexusEmblem } from './brand.js';
import { trackX } from './frame.js';
import { drawFesta, festaAt } from './rareEvents.js';
import { DWELL, stationsBetween } from './stations.js';
import { shade } from './sky.js';
import { circle, hash, hex, mix, radialGlow, rgba, scale, smoothstep } from './utils.js';

const CONCRETE = hex('#a8a49c');
const SAFETY = hex('#e3c23a');
const CANOPY = hex('#2f4a3f');
const VALANCE = hex('#e8dcc0');
const IRON = hex('#26302c');
const SIGN = hex('#1f3f7a');
const NEXUS_SIGN = hex('#3b2a6e');
const NEXUS_GLOW = hex('#b99bff');
const WHITE = hex('#f4f1ea');
const LAMP = hex('#ffd28c');
const GLASS = hex('#3a4450');
const WOOD = hex('#6b4a33');
const SKIN = ['#e0b18f', '#b9835f', '#8a5a3c', '#f1c9a5'].map(hex);
const COATS = ['#3a5a8a', '#8a3a3a', '#3f6b4a', '#6b5a8a', '#b07a36', '#444444', '#c9c1b0'].map(hex);
const STYLE = {
  rural: { facade: hex('#e2d3b5'), trim: hex('#8a3b2e'), length: 60 },
  grand: { facade: hex('#b9b1a3'), trim: hex('#6d675d'), length: 95 },
  nexus: { facade: hex('#d9d3e6'), trim: hex('#5b43a8'), length: 80 },
};

function geometry(layout, state, env, st) {
  const { win, u, px } = layout;
  const night = smoothstep(0.5, 0.15, env.light);
  return {
    st, env, u, px, win, night,
    toX: trackX(layout, state),
    // At night the station is lit by its own lamps, so colors fall back toward their warm base.
    c: (color) => rgba(mix(shade(color, env), mix(scale(color, 0.7), LAMP, 0.12), night * 0.65)),
    platformTop: win.y + win.h * 0.8,
    canopyBottom: win.y + win.h * 0.14,
    style: STYLE[st.nexus ? 'nexus' : st.grand ? 'grand' : 'rural'],
  };
}

function drawClock(ctx, g, x, y) {
  const r = g.u * 2.2;
  ctx.fillStyle = g.c(WHITE);
  ctx.strokeStyle = g.c(IRON);
  ctx.lineWidth = g.u * 0.35;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.stroke();
  const hours = g.env.dayTime * 24;
  const hand = (angle, len) => {
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
  };
  ctx.lineWidth = g.u * 0.25;
  ctx.beginPath();
  hand(((hours % 12) / 12) * Math.PI * 2 - Math.PI / 2, r * 0.5);
  hand((hours % 1) * Math.PI * 2 - Math.PI / 2, r * 0.8);
  ctx.stroke();
}

function drawFacade(ctx, g) {
  const { st, toX, win, u, style } = g;
  const m0 = st.start + 40;
  const m1 = m0 + style.length;
  const x0 = toX(m0);
  const x1 = toX(m1);
  const top = st.grand ? win.y - 40 : win.y + win.h * 0.3;
  ctx.fillStyle = g.c(style.facade);
  ctx.fillRect(x0, top, x1 - x0, g.platformTop - top);
  ctx.fillStyle = g.c(style.trim);
  if (st.grand) {
    ctx.fillRect(x0, win.y + win.h * 0.36, x1 - x0, u * 0.9);
  } else {
    ctx.beginPath();
    ctx.moveTo(x0 - u * 2, top);
    ctx.lineTo(x0 + u * 5, top - win.h * 0.09);
    ctx.lineTo(x1 - u * 5, top - win.h * 0.09);
    ctx.lineTo(x1 + u * 2, top);
    ctx.fill();
  }
  const winTop = g.platformTop - win.h * 0.34;
  const w = u * 3.2;
  for (let m = m0 + 6, k = 0; m < m1 - 4; m += 9, k++) {
    const x = toX(m);
    const isDoor = k % 3 === 1;
    const h = isDoor ? g.platformTop - winTop : win.h * 0.2;
    const lit = hash(st.id * 41 + k, 811) < 0.8;
    ctx.fillStyle = g.night > 0.05 && lit ? rgba(LAMP, 0.35 + 0.6 * g.night) : g.c(isDoor ? WOOD : GLASS);
    ctx.beginPath();
    ctx.rect(x - w / 2, winTop, w, h);
    ctx.arc(x, winTop, w / 2, Math.PI, 0);
    ctx.fill();
  }
  drawClock(ctx, g, (x0 + x1) / 2, winTop - win.h * 0.09);
}

function drawPlatform(ctx, g) {
  const { st, toX, win, u, px } = g;
  const x0 = toX(st.start);
  const x1 = toX(st.end);
  const ramp = 6 * px;
  const bottom = win.y + win.h + 40;
  ctx.fillStyle = g.c(CONCRETE);
  ctx.beginPath();
  ctx.moveTo(x0 - ramp, bottom);
  ctx.lineTo(x0, g.platformTop);
  ctx.lineTo(x1, g.platformTop);
  ctx.lineTo(x1 + ramp, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = g.c(scale(CONCRETE, 0.75));
  ctx.fillRect(x0, g.platformTop, x1 - x0, u * 0.4);
  ctx.fillRect(x0, win.y + win.h * 0.975, x1 - x0, bottom);
  ctx.fillStyle = g.c(SAFETY);
  ctx.fillRect(x0, win.y + win.h * 0.94, x1 - x0, u * 0.6);
}

function drawBench(ctx, g, x, y) {
  const { u } = g;
  ctx.fillStyle = g.c(IRON);
  ctx.fillRect(x - u * 2.8, y - u * 1.6, u * 0.4, u * 1.6);
  ctx.fillRect(x + u * 2.4, y - u * 1.6, u * 0.4, u * 1.6);
  ctx.fillStyle = g.c(WOOD);
  ctx.fillRect(x - u * 3.2, y - u * 1.9, u * 6.4, u * 0.6);
  ctx.fillRect(x - u * 3.2, y - u * 3.6, u * 6.4, u * 0.9);
}

function drawPerson(ctx, g, x, feet, h, id) {
  const { u } = g;
  const coat = g.c(COATS[Math.floor(hash(id, 821) * COATS.length)]);
  const w = h * 0.26;
  ctx.fillStyle = g.c(scale(COATS[Math.floor(hash(id, 822) * COATS.length)], 0.5));
  ctx.fillRect(x - w * 0.35, feet - h * 0.42, w * 0.28, h * 0.42);
  ctx.fillRect(x + w * 0.07, feet - h * 0.42, w * 0.28, h * 0.42);
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, feet - h * 0.84, w, h * 0.5, w * 0.3);
  ctx.fill();
  ctx.fillStyle = g.c(SKIN[Math.floor(hash(id, 823) * SKIN.length)]);
  ctx.beginPath();
  circle(ctx, x, feet - h * 0.92, h * 0.085);
  ctx.fill();
  if (hash(id, 824) < 0.35) {
    ctx.fillStyle = g.c(scale(COATS[Math.floor(hash(id, 828) * COATS.length)], 0.8));
    ctx.fillRect(x + w * 0.6, feet - h * 0.28, u * 2.2, h * 0.28);
  }
}

/**
 * Seconds into this station's stop: 0 while the train approaches, then the dwell time elapsed,
 * and "long ago" once it has left (so boarding and alighting stay finished).
 */
function stopElapsed(state, st) {
  if (state.served?.id !== st.id) return 0;
  return state.dwell > 0 ? DWELL - state.dwell : Infinity;
}

const doorY = (g) => g.platformTop + g.win.h * 0.17; // where people meet the train doors

/** People waiting on the platform; some walk to the train and board during the stop. */
function waitingPeople(g, elapsed) {
  const { st, toX, win } = g;
  return Array.from({ length: 9 }, (_, k) => {
    const id = st.id * 17 + k;
    const x = toX(st.start + 10 + hash(id, 825) * (st.end - st.start - 20));
    const feet = g.platformTop + win.h * (0.05 + hash(id, 826) * 0.08);
    const h = win.h * (0.2 + hash(id, 827) * 0.05);
    if (hash(id, 828) > 0.45) return { id, x, feet, h, alpha: 1 };
    const start = 2 + hash(id, 829) * 3;
    const walk = smoothstep(start, start + 4, elapsed);
    const vanish = smoothstep(start + 4, start + 4.6, elapsed);
    return { id, x, feet: feet + (doorY(g) - feet) * walk, h: h * (1 + walk * 0.12), alpha: 1 - vanish };
  });
}

/** Passengers stepping off the train and heading for the station building. */
function alightingPeople(g, elapsed) {
  const { st, toX, win } = g;
  const count = 1 + Math.floor(hash(st.id, 831) * 3);
  return Array.from({ length: count }, (_, k) => {
    const id = st.id * 17 + 20 + k;
    const start = 1 + k * 1.3;
    const walk = smoothstep(start + 0.5, start + 7, elapsed);
    const x0 = toX(st.stopAt + 12 + k * 22);
    const x1 = toX(st.start + 52 + k * 9); // toward the doors of the building
    const h = win.h * (0.21 + hash(id, 827) * 0.04);
    return {
      id,
      x: x0 + (x1 - x0) * walk,
      feet: doorY(g) + (g.platformTop + win.h * 0.04 - doorY(g)) * walk,
      h: h * (1.12 - walk * 0.12),
      alpha: smoothstep(start, start + 0.6, elapsed),
    };
  });
}

function drawPeople(ctx, g, state) {
  const { st, toX, win } = g;
  const benches = Array.from({ length: 6 }, (_, k) => st.start + 18 + k * 26);
  benches.forEach((m) => drawBench(ctx, g, toX(m), g.platformTop + win.h * 0.04));
  const elapsed = stopElapsed(state, st);
  [...waitingPeople(g, elapsed), ...alightingPeople(g, elapsed)]
    .filter((p) => p.alpha > 0.01)
    .sort((a, b) => a.feet - b.feet)
    .forEach((p) => {
      ctx.globalAlpha = p.alpha;
      drawPerson(ctx, g, p.x, p.feet, p.h, p.id);
      ctx.globalAlpha = 1;
    });
}

function drawCanopy(ctx, g) {
  const { st, toX, win, u } = g;
  const x0 = toX(st.start + 4);
  const x1 = toX(st.end - 4);
  const colBottom = win.y + win.h * 0.92;
  ctx.fillStyle = g.c(IRON);
  for (let m = st.start + 8; m < st.end - 4; m += 12) {
    const x = toX(m);
    ctx.fillRect(x - u * 0.35, g.canopyBottom, u * 0.7, colBottom - g.canopyBottom);
    ctx.beginPath();
    ctx.moveTo(x - u * 2, g.canopyBottom);
    ctx.lineTo(x + u * 2, g.canopyBottom);
    ctx.lineTo(x, g.canopyBottom + u * 2);
    ctx.fill();
  }
  ctx.fillStyle = g.c(CANOPY);
  ctx.fillRect(x0, win.y - 40, x1 - x0, g.canopyBottom - win.y + 40);
  ctx.fillStyle = g.c(VALANCE);
  ctx.beginPath();
  for (let x = x0; x < x1; x += u * 1.5) {
    ctx.moveTo(x, g.canopyBottom);
    ctx.lineTo(x + u * 0.75, g.canopyBottom + u * 1.2);
    ctx.lineTo(x + u * 1.5, g.canopyBottom);
  }
  ctx.fill();
}

function drawSign(ctx, g, x) {
  const { u, st } = g;
  ctx.font = `600 ${u * 1.7}px system-ui, sans-serif`;
  const emblem = st.nexus ? u * 3.4 : 0;
  const w = Math.max(u * 15, ctx.measureText(st.name).width + u * 3 + emblem);
  const h = u * 3.6;
  const top = g.canopyBottom + u * 3;
  ctx.fillStyle = g.c(IRON);
  ctx.fillRect(x - w * 0.35, g.canopyBottom, u * 0.3, u * 3);
  ctx.fillRect(x + w * 0.35, g.canopyBottom, u * 0.3, u * 3);
  if (st.nexus) radialGlow(ctx, x, top + h / 2, w * 0.7, NEXUS_GLOW, 0.25 + g.night * 0.35);
  ctx.fillStyle = g.c(st.nexus ? NEXUS_SIGN : SIGN);
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.fillStyle = g.c(WHITE);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(st.name, x + emblem / 2, top + h / 2);
  if (st.nexus) drawNexusEmblem(ctx, x - w / 2 + u * 2.3, top + h / 2, h * 0.36, g.c(NEXUS_GLOW), 1);
}

function drawLamps(ctx, g) {
  const { st, toX, u } = g;
  for (let m = st.start + 14; m < st.end - 4; m += 20) {
    const x = toX(m);
    const y = g.canopyBottom + u * 2.5;
    ctx.fillStyle = g.c(IRON);
    ctx.fillRect(x - u * 0.1, g.canopyBottom, u * 0.2, u * 1.6);
    if (g.night > 0.05) {
      radialGlow(ctx, x, y, u * 9, LAMP, 0.45 * g.night);
      radialGlow(ctx, x, g.platformTop + u * 3, u * 12, LAMP, 0.18 * g.night);
    }
    ctx.fillStyle = g.night > 0.05 ? rgba(LAMP) : g.c(WHITE);
    ctx.beginPath();
    circle(ctx, x, y, u * 0.9);
    ctx.fill();
  }
}

function drawStation(ctx, layout, state, env, st) {
  const g = geometry(layout, state, env, st);
  drawFacade(ctx, g);
  drawPlatform(ctx, g);
  drawPeople(ctx, g, state);
  drawCanopy(ctx, g);
  if (festaAt(state, st)) drawFesta(ctx, g, st, state.time);
  [st.stopAt + 18, st.stopAt + 80].forEach((m) => drawSign(ctx, g, g.toX(m)));
  drawLamps(ctx, g);
}

export function drawStations(ctx, layout, state, env) {
  const { win, px } = layout;
  stationsBetween(state.distance - 20, state.distance + win.w / px + 20)
    .forEach((st) => drawStation(ctx, layout, state, env, st));
}
