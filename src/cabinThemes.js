import { LINES, lineAt } from './biomes.js';
import { hex } from './utils.js';

const palette = (colors) => Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, hex(v)]));

/**
 * Cabin look per line. Aurora is the classic car (wood, brass, wine velvet);
 * Horizonte is the modern one (pale panels, brushed metal, petrol-blue fabric).
 */
const THEMES = {
  aurora: palette({
    wall: '#d6c4a0', wood: '#5a3524', woodDark: '#3a2218', frame: '#4a2c1e', frameEdge: '#8a5a3c',
    curtain: '#7a2331', curtainDark: '#4a1119', brass: '#b08d57', ledge: '#6b3f28', ledgeTop: '#8f5a3a',
    seat: '#6e1f2c', seatBase: '#4a121b', cover: '#e9e2d2',
  }),
  horizonte: palette({
    wall: '#d3dcda', wood: '#3d5a60', woodDark: '#26393d', frame: '#5f6b70', frameEdge: '#a9b4b8',
    curtain: '#1f6f78', curtainDark: '#124349', brass: '#c9ced2', ledge: '#4a5a5e', ledgeTop: '#7b8c90',
    seat: '#1f5f68', seatBase: '#123e44', cover: '#eef3f2',
  }),
  estelar: palette({
    wall: '#2b3050', wood: '#1c2038', woodDark: '#12152a', frame: '#2a2f52', frameEdge: '#c9a95a',
    curtain: '#26306b', curtainDark: '#151b44', brass: '#e0c070', ledge: '#232846', ledgeTop: '#3a4170',
    seat: '#2f3a7a', seatBase: '#1b2250', cover: '#e8e2cf',
  }),
};

/** The cabin theme of the train at this distance. */
export const cabinTheme = (distance) => THEMES[LINES[lineAt(distance)].id] ?? THEMES.aurora;
