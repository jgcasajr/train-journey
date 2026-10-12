import { hex } from './utils.js';

// How the passenger looks: chosen in the panel (Ajustes → Aparência), remembered with the settings.

export const LOOK_OPTIONS = {
  hairColor: { castanho: '#2e1d14', preto: '#111111', ruivo: '#8a3a1e', loiro: '#c9a25a', grisalho: '#b8b0a4' },
  hairStyle: ['coque', 'curto', 'rabo', 'solto'],
  skin: { media: '#d8a07c', clara: '#f1c9a5', morena: '#b9835f', negra: '#8a5a3c' },
  sweater: { caramelo: '#c07a36', vinho: '#8a2f3a', verde: '#3f6b4a', azul: '#3a5a8a', cinza: '#6b6b70', mostarda: '#c9a227' },
  pants: { marinho: '#2c3750', jeans: '#4a6a90', preto: '#1e1e22', caqui: '#a08a62' },
};

export const DEFAULT_LOOK_CHOICES = { hairColor: 'castanho', hairStyle: 'coque', skin: 'media', sweater: 'caramelo', pants: 'marinho', glasses: false, beard: false };

const pick = (table, key, fallback) => (Object.hasOwn(table, key) ? key : fallback);

/** Panel choices (any strings) → a valid look with colors ready to draw. Unknown values fall back to the default. */
export function lookFrom(choices = {}) {
  const c = { ...DEFAULT_LOOK_CHOICES, ...choices };
  const hairColor = pick(LOOK_OPTIONS.hairColor, c.hairColor, DEFAULT_LOOK_CHOICES.hairColor);
  const skin = pick(LOOK_OPTIONS.skin, c.skin, DEFAULT_LOOK_CHOICES.skin);
  const sweater = pick(LOOK_OPTIONS.sweater, c.sweater, DEFAULT_LOOK_CHOICES.sweater);
  const pants = pick(LOOK_OPTIONS.pants, c.pants, DEFAULT_LOOK_CHOICES.pants);
  return {
    hair: hex(LOOK_OPTIONS.hairColor[hairColor]),
    skin: hex(LOOK_OPTIONS.skin[skin]),
    sweater: hex(LOOK_OPTIONS.sweater[sweater]),
    pants: hex(LOOK_OPTIONS.pants[pants]),
    hairStyle: LOOK_OPTIONS.hairStyle.includes(c.hairStyle) ? c.hairStyle : DEFAULT_LOOK_CHOICES.hairStyle,
    glasses: c.glasses === true,
    beard: c.beard === true,
  };
}

export const DEFAULT_LOOK = lookFrom();

const FIELDS = { hairColor: 'look-hair', hairStyle: 'look-style', skin: 'look-skin', sweater: 'look-sweater', pants: 'look-pants' };

/** Reads the look controls of the panel; calls onChange(look) now and whenever they change. */
export function createAppearance(doc, onChange) {
  const nodes = Object.fromEntries(Object.entries(FIELDS).map(([key, id]) => [key, doc.getElementById(id)]));
  const glasses = doc.getElementById('look-glasses');
  const beard = doc.getElementById('look-beard');
  if (Object.values(nodes).some((n) => !n) || !glasses || !beard) throw new Error('Missing appearance controls');
  const read = () => lookFrom({
    ...Object.fromEntries(Object.entries(nodes).map(([key, n]) => [key, n.value])),
    glasses: glasses.checked,
    beard: beard.checked,
  });
  [...Object.values(nodes), glasses, beard].forEach((n) => n.addEventListener('change', () => onChange(read())));
  onChange(read());
}
