// utils/colors.ts
// Helpers de cor + âncoras (Cloro / pH)

export type Anchor = { value: number; color: string }; // color em #RRGGBB

export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function hexToRgb(hex: string) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number) {
  const to = (x: number) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function interpolateColor(value: number, anchors: Anchor[]) {
  const sorted = anchors;

  // fora do intervalo
  if (value <= sorted[0].value) return sorted[0].color;
  if (value >= sorted[sorted.length - 1].value) return sorted[sorted.length - 1].color;

  // encontra segmento
  let i = 0;
  for (; i < sorted.length - 1; i++) {
    if (value >= sorted[i].value && value <= sorted[i + 1].value) break;
  }

  const a = sorted[i];
  const b = sorted[i + 1];
  const t = (value - a.value) / (b.value - a.value);

  const A = hexToRgb(a.color);
  const B = hexToRgb(b.color);

  return rgbToHex(lerp(A.r, B.r, t), lerp(A.g, B.g, t), lerp(A.b, B.b, t));
}

export function buildScale(min: number, max: number, step: number) {
  const n = Math.round((max - min) / step);
  return Array.from({ length: n + 1 }, (_, i) => Number((min + i * step).toFixed(1)));
}

// ✅ Âncoras Cloro Livre (0–10) — ajustadas para bater melhor com leitura real (AquaChek)
export const CLORO_ANCHORS: Anchor[] = [
  { value: 0, color: '#CDCAAB' },
  { value: 1, color: '#CABAAE' },
  { value: 2, color: '#C1A5B1' },
  { value: 3, color: '#B195A4' },
  { value: 5, color: '#9F7196' },
  { value: 10, color: '#7D3772' },
];

// ✅ Âncoras pH (ajustadas para bater melhor com leitura real)
export const PH_ANCHORS: Anchor[] = [
  { value: 6.2, color: '#F4B93A' }, // mais amarelo, menos laranja
  { value: 6.6, color: '#E79530' }, // amarelo-alaranjado (média coerente)
  { value: 7.0, color: '#DB7A24' }, // laranja
  { value: 7.4, color: '#D96522' }, // laranja-avermelhado (menos “vermelho cedo”)
  { value: 7.8, color: '#D64F1F' }, // vermelho alaranjado
  { value: 8.2, color: '#C83737' }, // vermelho mais forte
];

// ✅ Âncoras Alcalinidade (0–240)
export const ALC_ANCHORS: Anchor[] = [
  { value: 0, color: '#E3C040' },
  { value: 40, color: '#A4A933' },
  { value: 80, color: '#899F3A' },
  { value: 120, color: '#486F36' },
  { value: 180, color: '#23522E' },
  { value: 240, color: '#255762' },
];

// ✅ Âncoras Ácido Cianúrico (0–300)  (corrigido: 40 ppm)
export const CYA_ANCHORS: Anchor[] = [
  { value: 0, color: '#E58730' },
  { value: 40, color: '#CF5E26' },
  { value: 100, color: '#BD261F' },
  { value: 150, color: '#B12679' },
  { value: 300, color: '#761C7E' },
];

// ✅ Âncoras Dureza (0–1000)
export const DUREZA_ANCHORS: Anchor[] = [
  { value: 0, color: '#021A94' },
  { value: 100, color: '#2539A9' },
  { value: 250, color: '#402BA0' },
  { value: 500, color: '#873B9D' },
  { value: 1000, color: '#90218A' },
];

// ✅ Âncoras Cloro Total (0–10)
export const CLORO_TOTAL_ANCHORS: Anchor[] = [
  { value: 0, color: '#FEFEA8' },
  { value: 0.5, color: '#F2FEAA' },
  { value: 1.0, color: '#E7F5A0' },
  { value: 3.0, color: '#B8D88C' },
  { value: 5.0, color: '#90C678' },
  { value: 10.0, color: '#4CA35F' },
];





