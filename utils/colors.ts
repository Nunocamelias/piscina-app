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

// ======================================================
// 🎨 Helpers de luminância (para textura adaptativa)
// ======================================================
export function lumaFromHex(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
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

// ======================================================
// 🎛️ Ajuste automático de textura por cor
// ======================================================

export function textureForColor(hexColor: string) {
  const L = lumaFromHex(hexColor);

  // fibra: sempre subtil
  const fiberOpacity = clamp(
    0.10 + (L - 0.5) * 0.10,
    0.06,
    0.16
  );

  // noise: mais visível em cores claras
  const noiseOpacity = clamp(
    0.20 + (L - 0.5) * 0.35,
    0.06,
    0.30
  );

  return {
    fiberOpacity,
    noiseOpacity,
  };
}


// ======================================================
// ✅ Textura “fibra” (UI overlay) — SEM alterar a lógica
// ======================================================
//
// A textura NÃO altera a cor (hex). Ela é aplicada no UI (Image overlay).
// Estes exports servem para os ecrãs usarem SEM duplicar config.
//
// ⚠️ Ajusta os paths conforme a tua pasta de assets.

export type TexturePreset = {
  source: any;        // Image source (require)
  opacity: number;    // 0.10–0.22 tipicamente
  rotationDeg: number; // ~45 para replicar a fita real
  scale: number;
};

// Texturas (45°) — usa a "MID" como padrão principal

export const FIBER_TEXTURE_45_MID   = require('../assets/textures/fiber_45_mid.png');


// Preset default (bom ponto de partida)
export const DEFAULT_FIBER_PRESET: TexturePreset = {
  source: FIBER_TEXTURE_45_MID,
  opacity: 0.1,  // 👈 escala de cores
  rotationDeg: 0,
  scale: 2,
};

export const BOX_FIBER_PRESET: TexturePreset = {
  source: FIBER_TEXTURE_45_MID,
  opacity: 0.1,   // Cor dinamica
  rotationDeg: 0,
  scale: .35,
};

// (Opcional) presets por parâmetro (mesmo papel, “efeito” diferente)
// Ajusta só a opacidade se quiseres mais/menos “fita”.
export const CLORO_FIBER_PRESET: TexturePreset = {
  source: FIBER_TEXTURE_45_MID,
  opacity: 0.15,
  rotationDeg: 45,
  scale: 2,
};

export const PH_FIBER_PRESET: TexturePreset = {
  source: FIBER_TEXTURE_45_MID,
  opacity: 0.15,
  rotationDeg: 45,
  scale: 3,
};

export const ALC_FIBER_PRESET: TexturePreset = {
  source: FIBER_TEXTURE_45_MID,
  opacity: 0.14,
  rotationDeg: 45,
  scale: 1.8,
};

export const CYA_FIBER_PRESET: TexturePreset = {
  source: FIBER_TEXTURE_45_MID,
  opacity: 0.17,
  rotationDeg: 45,
  scale: 1.8,
};

export const DUREZA_FIBER_PRESET: TexturePreset = {
  source: FIBER_TEXTURE_45_MID,
  opacity: 0.13,
  rotationDeg: 45,
  scale: 1.8,
};

export const CLORO_TOTAL_FIBER_PRESET: TexturePreset = {
  source: FIBER_TEXTURE_45_MID,
  opacity: 0.16,
  rotationDeg: 0,
  scale: 1.8,
};
export const NOISE_ALPHA_DARK = require('../assets/textures/pontos_pretos3.png');

export type NoisePreset = {
  source: any;
  opacity: number;
  rotationDeg: number; // ~45 para replicar a fita real
  scale: number;
};

export const DEFAULT_NOISE_PRESET: NoisePreset = {
  source: NOISE_ALPHA_DARK,
  opacity: 0.15, // 👈 escala de cores
  rotationDeg: 0,
  scale: 1,
};

export const BOX_NOISE_PRESET: NoisePreset = {
  source: NOISE_ALPHA_DARK,
  opacity: 0.15,   // Cor dinamica
  rotationDeg: 0,
  scale: .6,     
};



// (Opcional) por parâmetro — se quiseres ligeiras diferenças
export const CLORO_NOISE_PRESET: NoisePreset = { source: NOISE_ALPHA_DARK, opacity: 0.12, rotationDeg: 45, scale: 1 };
export const PH_NOISE_PRESET: NoisePreset = { source: NOISE_ALPHA_DARK, opacity: 0.13, rotationDeg: 45, scale: 1 };
export const ALC_NOISE_PRESET: NoisePreset = { source: NOISE_ALPHA_DARK, opacity: 0.12, rotationDeg: 45, scale: 1 };
export const CYA_NOISE_PRESET: NoisePreset = { source: NOISE_ALPHA_DARK, opacity: 0.14, rotationDeg: 45, scale: 1 };
export const DUREZA_NOISE_PRESET: NoisePreset = { source: NOISE_ALPHA_DARK, opacity: 0.11, rotationDeg: 45, scale: 1 };
export const CLORO_TOTAL_NOISE_PRESET: NoisePreset = { source: NOISE_ALPHA_DARK, opacity: 0.13, rotationDeg: 45, scale: 1 };







