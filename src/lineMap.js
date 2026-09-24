import { BIOMES, SEGMENT } from './biomes.js';
import { riversBetween } from './rivers.js';
import { crossingsBetween } from './roads.js';
import { stationsBetween } from './stations.js';
import { tunnelsBetween } from './tunnel.js';
import { rgba } from './utils.js';

export const LOOP = SEGMENT * BIOMES.length; // meters per lap
const NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 1000;
const LINE_Y = 62;

function svgEl(tag, attrs, text) {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
  if (text) node.textContent = text;
  return node;
}

/** Everything the map shows for one lap, in lap-relative meters. */
function lapFeatures(lap) {
  const m0 = lap * LOOP;
  const m1 = m0 + LOOP;
  const rel = (m) => m - m0;
  return {
    stations: stationsBetween(m0, m1).map((s) => ({ name: s.name, at: rel(s.stopAt) })),
    tunnels: tunnelsBetween(m0, m1).map((t) => ({ from: rel(t.start), to: rel(t.end) })),
    bridges: riversBetween(m0, m1).map((r) => rel((r.start + r.end) / 2)),
    crossings: crossingsBetween(m0, m1).map((c) => rel(c.at)),
  };
}

function buildLap(svg, lap) {
  const x = (m) => (m / LOOP) * VIEW_W;
  const f = lapFeatures(lap);
  const nodes = [
    ...BIOMES.map((b, i) => svgEl('rect', {
      x: x(i * SEGMENT), y: LINE_Y + 10, width: x(SEGMENT) - 1, height: 8, rx: 2, fill: rgba(b.field, 0.9),
    })),
    ...BIOMES.map((b, i) => svgEl('text', { x: x(i * SEGMENT + SEGMENT / 2), y: LINE_Y + 32, class: 'biome' }, b.name)),
    svgEl('line', { x1: 0, y1: LINE_Y, x2: VIEW_W, y2: LINE_Y, class: 'track' }),
    ...f.tunnels.map((t) => svgEl('rect', { x: x(t.from), y: LINE_Y - 4, width: Math.max(3, x(t.to - t.from)), height: 8, class: 'tunnel' })),
    ...f.bridges.map((m) => svgEl('path', { d: `M${x(m) - 5} ${LINE_Y + 6} Q${x(m)} ${LINE_Y - 2} ${x(m) + 5} ${LINE_Y + 6}`, class: 'bridge' })),
    ...f.crossings.map((m) => svgEl('path', { d: `M${x(m) - 3} ${LINE_Y - 3} L${x(m) + 3} ${LINE_Y + 3} M${x(m) + 3} ${LINE_Y - 3} L${x(m) - 3} ${LINE_Y + 3}`, class: 'crossing' })),
    ...f.stations.flatMap((s, k) => [
      svgEl('circle', { cx: x(s.at), cy: LINE_Y, r: 5, class: 'station' }),
      svgEl('text', { x: x(s.at), y: k % 2 ? LINE_Y - 24 : LINE_Y - 12, class: 'station-name' }, s.name),
    ]),
  ];
  svg.replaceChildren(...nodes);
  const marker = svgEl('g', { class: 'marker' });
  marker.append(svgEl('rect', { x: -9, y: LINE_Y - 7, width: 18, height: 14, rx: 4 }));
  svg.append(marker);
  return marker;
}

/** Line map overlay: the whole lap with stations, tunnels, bridges, crossings and the train. */
export function createLineMap(svg, lapLabel) {
  let lap = null;
  let marker = null;
  return {
    update(distance) {
      const current = Math.floor(distance / LOOP);
      if (current !== lap) {
        lap = current;
        marker = buildLap(svg, lap);
        lapLabel.textContent = `Volta ${lap + 1} · ${(LOOP / 1000).toFixed(0)} km`;
      }
      const x = ((distance - lap * LOOP) / LOOP) * VIEW_W;
      marker.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
    },
  };
}
