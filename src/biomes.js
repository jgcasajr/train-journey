import { clamp, hex, lerp, mix, mod, smoothstep } from './utils.js';

/** Meters of track per biome; the last BLEND fraction cross-fades into the next one. */
export const SEGMENT = 3500;
const BLEND = 0.22;
const COLOR_KEYS = ['far', 'mid', 'hills', 'field', 'near', 'ground', 'leaf'];
const DEFAULTS = { mtn: 0.5, snow: 0, hillAmp: 1, water: 0, trees: 0.3, houses: 0.2, farm: 0, city: 0, vines: 0, mirror: 0, station: null };

const RAW = [
  {
    name: 'Campos', station: 'Campo Belo', tree: 'round', mtn: 0.45, trees: 0.3, houses: 0.35, farm: 0.25,
    far: '#7d8fb3', mid: '#6f8f86', hills: '#8fb35a', field: '#b0b84e', near: '#5f8f3a', ground: '#6b7f35', leaf: '#4f7f35',
  },
  {
    name: 'Fazenda', station: 'Três Porteiras', tree: 'round', mtn: 0.35, hillAmp: 0.8, trees: 0.2, houses: 0.15, farm: 1,
    far: '#8295b5', mid: '#76927f', hills: '#9cb85a', field: '#c8b650', near: '#6a9440', ground: '#7a7a3a', leaf: '#4f7f35',
  },
  {
    name: 'Floresta', tree: 'pine', mtn: 0.7, hillAmp: 1.3, trees: 1, houses: 0.05,
    far: '#6f84a0', mid: '#4f6f5f', hills: '#3f6f3f', field: '#3d6b35', near: '#2f5a2a', ground: '#3b5528', leaf: '#2d5a30',
  },
  {
    name: 'Montanhas', station: 'Pedra Alta', tree: 'pine', mtn: 1.6, snow: 1, hillAmp: 1.6, trees: 0.5, houses: 0.1,
    far: '#8a9bbf', mid: '#6d7d99', hills: '#6f8a5c', field: '#7d8f55', near: '#56703f', ground: '#6b6a55', leaf: '#3a5a3a',
  },
  {
    name: 'Outono', station: 'Nexus', tree: 'round', mtn: 0.8, hillAmp: 1.1, trees: 0.65, houses: 0.2, farm: 0.3,
    far: '#8c8fb0', mid: '#8a7a6a', hills: '#b07a3a', field: '#c9983f', near: '#9a5a2a', ground: '#7a5a30', leaf: '#c4622d',
  },
  {
    name: 'Subúrbio', station: 'Vila Serena', tree: 'round', mtn: 0.4, hillAmp: 0.7, trees: 0.45, houses: 0.9, city: 0.45,
    far: '#8593ad', mid: '#7b8a86', hills: '#7f9a5f', field: '#8fa060', near: '#5e8440', ground: '#6f7058', leaf: '#4a7a3a',
  },
  {
    name: 'Cidade', station: 'Estação Central', tree: 'round', mtn: 0.3, hillAmp: 0.35, trees: 0.12, houses: 0.1, city: 1,
    far: '#8a95ad', mid: '#7d8590', hills: '#7a806f', field: '#80837a', near: '#6b6e68', ground: '#5c5c58', leaf: '#4d7040',
  },
  {
    name: 'Litoral', station: 'Porto Azul', tree: 'palm', mtn: 0.25, hillAmp: 0.35, water: 1, trees: 0.35, houses: 0.15,
    far: '#8fa6c4', mid: '#7f9eab', hills: '#c9b98a', field: '#d8c890', near: '#6f9a4a', ground: '#c2b27f', leaf: '#4f8f3f',
  },
  {
    name: 'Deserto', station: 'Oásis', tree: 'cactus', mtn: 0.7, hillAmp: 0.6, trees: 0.3, houses: 0.03,
    far: '#c9a27a', mid: '#c98f5a', hills: '#e0b57a', field: '#e8c88f', near: '#d4aa70', ground: '#c9a26a', leaf: '#5f8f4a',
  },
  {
    name: 'Vinhedos', station: 'Vila Videira', tree: 'round', mtn: 0.45, hillAmp: 1.1, trees: 0.2, houses: 0.2, vines: 1,
    far: '#8f9fbf', mid: '#7f8f8f', hills: '#7f9a4a', field: '#9aa84f', near: '#6a8a3a', ground: '#7a6a45', leaf: '#4f7f35',
  },
  {
    name: 'Lago', station: 'Lago Sereno', tree: 'pine', mtn: 1.3, snow: 0.5, hillAmp: 0.2, water: 1, mirror: 1, trees: 0.35, houses: 0.06,
    far: '#8a9ec4', mid: '#6d80a0', hills: '#5f7f60', field: '#6f8a58', near: '#4f6f3a', ground: '#5f6a4a', leaf: '#34583a',
  },
];

export const BIOMES = RAW.map((b) => ({
  ...DEFAULTS,
  ...b,
  ...Object.fromEntries(COLOR_KEYS.map((k) => [k, hex(b[k])])),
}));

/** Meters per lap of a line (every biome once). */
export const LOOP = SEGMENT * BIOMES.length;
/** Each line owns its own stretch of distance, so scenery generated from distance differs per line. */
export const LINE_SPAN = LOOP * 400;

/**
 * The railway lines. Both pass through the Nexus station, where travelers change trains.
 * `order` lists the biomes of one lap; `stations` overrides the station name per biome.
 */
export const LINES = [
  { id: 'aurora', name: 'Linha Aurora', order: BIOMES.map((b) => b.name), stations: {} },
  {
    id: 'horizonte',
    name: 'Linha Horizonte',
    order: ['Litoral', 'Floresta', 'Montanhas', 'Outono', 'Fazenda', 'Vinhedos', 'Campos', 'Lago', 'Cidade', 'Subúrbio', 'Deserto'],
    stations: {
      Litoral: 'Maré Mansa', Floresta: 'Bosque Velho', Montanhas: 'Serra Clara', Outono: 'Nexus',
      Fazenda: 'Vale Novo', Vinhedos: null, Campos: null, Lago: 'Espelho d\'Água', Cidade: 'Horizonte',
      Subúrbio: 'Jardim do Sol', Deserto: 'Dunas Douradas',
    },
  },
];

const LINE_BIOMES = LINES.map((line) => line.order.map((name) => {
  const biome = BIOMES.find((b) => b.name === name);
  if (!biome) throw new Error(`Line ${line.id}: unknown biome ${name}`);
  return { ...biome, station: name in line.stations ? line.stations[name] : biome.station };
}));

/** Index of the line a distance belongs to. */
export const lineAt = (meters) => clamp(Math.floor(meters / LINE_SPAN), 0, LINES.length - 1);
export const lineStart = (line) => line * LINE_SPAN;
/** Kilometers along the current line (what the board and postcards show). */
export const lineKm = (meters) => (meters - lineStart(lineAt(meters))) / 1000;
/** The biomes of one lap of a line, in order. */
export const lineBiomes = (line) => LINE_BIOMES[line];

/** Biome of track segment k (segments count from 0 across all lines). */
export function segmentBiome(k) {
  return LINE_BIOMES[lineAt(k * SEGMENT)][mod(k, BIOMES.length)];
}

export function biomeAt(meters) {
  const k = Math.floor(meters / SEGMENT);
  const local = meters - k * SEGMENT;
  return {
    a: segmentBiome(k),
    b: segmentBiome(k + 1),
    t: smoothstep(SEGMENT * (1 - BLEND), SEGMENT, local),
  };
}

export const num = (bm, key) => lerp(bm.a[key], bm.b[key], bm.t);
export const color = (bm, key) => mix(bm.a[key], bm.b[key], bm.t);
/** Categorical choice (e.g. tree type) inside a blend zone, stable for a given random r. */
export const pick = (bm, r) => (r < bm.t ? bm.b : bm.a);

export function biomeName(meters) {
  const bm = biomeAt(meters);
  return bm.t < 0.5 ? bm.a.name : bm.b.name;
}
