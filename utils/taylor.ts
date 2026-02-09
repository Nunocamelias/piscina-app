// utils/taylor.ts
export type TaylorInput = {
  ph?: number | null;
  tac?: number | null;     // alcalinidade
  th?: number | null;      // dureza
  phAlvo?: number | null;
  tacAlvo?: number | null;
  thAlvo?: number | null;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const isFiniteNum = (v: any) => typeof v === 'number' && Number.isFinite(v);

// ---- Escalas (baseadas na Tabela) ----
// TAC/TH: 20 .. 1000 (log) — 1000 em baixo, 20 em cima
export function yLog(v: number, h: number, vMin = 20, vMax = 1000) {
  const vv = clamp(v, vMin, vMax);
  const a = Math.log10(vMin);
  const b = Math.log10(vMax);
  const t = (Math.log10(vv) - a) / (b - a); // 0..1 de 20->1000
  return h * t; // ✅ baixo = max
}

// pH: 5.9 .. 9.2 (linear) — 5.9 em baixo, 9.2 em cima
export function yLinear(v: number, h: number, vMin = 5.9, vMax = 9.2) {
  const vv = clamp(v, vMin, vMax);
  const t = (vv - vMin) / (vMax - vMin); // 0..1 de 5.9->9.2
  return h * (1 - t); // ✅ alto em cima
}

export function angleDegAtPH(
  pTac: { x: number; y: number },
  pPH: { x: number; y: number },
  pTH: { x: number; y: number }
) {
  // Ângulo entre vetores (pPH->pTac) e (pPH->pTH)
  const v1 = { x: pTac.x - pPH.x, y: pTac.y - pPH.y };
  const v2 = { x: pTH.x - pPH.x, y: pTH.y - pPH.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const n1 = Math.hypot(v1.x, v1.y);
  const n2 = Math.hypot(v2.x, v2.y);
  if (!n1 || !n2) return NaN;

  const cos = clamp(dot / (n1 * n2), -1, 1);
  const ang = Math.acos(cos) * (180 / Math.PI);
  return ang; // queremos perto de 180
}

export function corPorDesalinhamento(ang: number) {
  if (!Number.isFinite(ang)) return '#999';

  const delta = Math.abs(180 - ang);

  // Regras que definiste:
  // <=3° verde, 4..12 amarelo, >12 vermelho
  if (delta <= 4) return '#2E7D32';
  if (delta <= 12) return '#F9A825';
  if (delta <= 24) return '#EF6C00';
  return '#C62828';
}

export function buildTaylorGeometry(
  input: TaylorInput,
  w: number,
  h: number
) {
  const xTac = 0;
  const xPH = w / 2;
  const xTH = w;

  const okAtual = isFiniteNum(input.ph) && isFiniteNum(input.tac) && isFiniteNum(input.th);

  const pPH = okAtual ? { x: xPH, y: yLinear(input.ph!, h) } : null;
  const pTac = okAtual ? { x: xTac, y: yLog(input.tac!, h) } : null;
  const pTH = okAtual ? { x: xTH, y: yLog(input.th!, h) } : null;

  const ang = okAtual ? angleDegAtPH(pTac!, pPH!, pTH!) : NaN;
  const corAtual = corPorDesalinhamento(ang);

  // “Target” (ISL alvo) — opcional
  const okAlvo =
    isFiniteNum(input.phAlvo) &&
    isFiniteNum(input.tacAlvo) &&
    isFiniteNum(input.thAlvo);

  const pPHAlvo = okAlvo ? { x: xPH, y: yLinear(input.phAlvo!, h) } : null;
  const pTacAlvo = okAlvo ? { x: xTac, y: yLog(input.tacAlvo!, h) } : null;
  const pTHAlvo = okAlvo ? { x: xTH, y: yLog(input.thAlvo!, h) } : null;

  const angAlvo = okAlvo ? angleDegAtPH(pTacAlvo!, pPHAlvo!, pTHAlvo!) : NaN;

  return {
    xTac, xPH, xTH,
    okAtual, pPH, pTac, pTH, ang, corAtual,
    okAlvo, pPHAlvo, pTacAlvo, pTHAlvo, angAlvo,
  };
}
