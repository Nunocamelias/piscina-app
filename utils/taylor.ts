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
  if (delta <= 5) return '#2E7D32';
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
// --- inversos das escalas (para converter y -> valor) ---
export function invYLog(y: number, h: number, vMin = 20, vMax = 1000) {
  const t = 1 - clamp(y / h, 0, 1); // 0..1 de baixo->cima (compatível com yLog)
  const a = Math.log10(vMin);
  const b = Math.log10(vMax);
  const logv = a + t * (b - a);
  return Math.pow(10, logv);
}

export function invYLinear(y: number, h: number, vMin = 5.9, vMax = 9.2) {
  const t = 1 - clamp(y / h, 0, 1);
  return vMin + t * (vMax - vMin);
}

export type TaylorSuggest = {
  phAlvo: number;
  alcAlvo: number;
  modo: 'taylor';
  detalhe?: string;
};

type TaylorSuggestInput = {
  th: number; // dureza atual (TH)
  // opcional: para escolher o "mais perto" do que o técnico já tem
  phAtual?: number | null;
  tacAtual?: number | null;

  // intervalos ideais (podes ajustar)
  thMin?: number;
  thMax?: number;
  phMin?: number;
  phMax?: number;
  tacMin?: number;
  tacMax?: number;

  // precisão
  stepPH?: number;
};

export type TaylorRefineInput = {
  // estado atual medido
  phAtual: number;
  tacAtual: number;
  th: number;

  // sugestão "grossa" do ISL (target inicial)
  phISL: number;
  tacISL: number;

  // limites ideais (ajusta se quiseres)
  phMin?: number;
  phMax?: number;
  tacMin?: number;
  tacMax?: number;
  thMin?: number;
  thMax?: number;

  // tolerância do ângulo (em graus) para considerar "ok"
  tolDeg?: number;
};

export function sugerirAlvosPorTaylorRefinandoISL(input: TaylorRefineInput) {
  const {
    phAtual, tacAtual, th,
    phISL, tacISL,
    phMin = 7.0, phMax = 7.4,
    tacMin = 80, tacMax = 150,
    thMin = 175, thMax = 300,
    tolDeg = 3,
  } = input;

  const roundToStep = (v: number, step: number) => Math.round(v / step) * step;
  const roundPH  = (v: number) => roundToStep(v, 0.05);
  const roundTAC = (v: number) => roundToStep(v, 5);

  // Só faz sentido refinar se TH estiver dentro do ideal
  if (!Number.isFinite(th) || th < thMin || th > thMax) return null;

  // ---------- helpers ----------
  const clampPH  = (v: number) => clamp(v, phMin, phMax);
  const clampTAC = (v: number) => clamp(v, tacMin, tacMax);

  // ⚠️ score NÃO deve arredondar logo (senão o refinamento colapsa)
  // Arredondamos só no fim ou quando testamos grelha discreta.
  const scoreRaw = (phCand: number, tacCand: number) => {
    const ph  = clampPH(phCand);
    const tac = clampTAC(tacCand);

    // geometria só para ângulo (altura arbitrária)
    const pPH  = { x: 1, y: yLinear(ph, 100) };
    const pTac = { x: 0, y: yLog(tac, 100) };
    const pTH  = { x: 2, y: yLog(th, 100) };

    const ang = angleDegAtPH(pTac, pPH, pTH);
    const delta = Math.abs(180 - ang);

    // penalização suave por se afastar do alvo ISL (se existir)
    const hasISLTarget =
      Number.isFinite(phISL) && Number.isFinite(tacISL);

    const pen = hasISLTarget
      ? (0.6 * Math.abs(ph - phISL) + 0.02 * Math.abs(tac - tacISL))
      : 0;

    return { ph, tac, ang, delta, total: delta + pen };
  };

  // ✅ score DISCRETO: aqui sim aplicamos os passos “humanos”
  const scoreStep = (phCand: number, tacCand: number) => {
    const ph  = roundPH(clampPH(phCand));
    const tac = roundTAC(clampTAC(tacCand));

    const pPH  = { x: 1, y: yLinear(ph, 100) };
    const pTac = { x: 0, y: yLog(tac, 100) };
    const pTH  = { x: 2, y: yLog(th, 100) };

    const ang = angleDegAtPH(pTac, pPH, pTH);
    const delta = Math.abs(180 - ang);

    const hasISLTarget =
      Number.isFinite(phISL) && Number.isFinite(tacISL);

    const pen = hasISLTarget
      ? (0.6 * Math.abs(ph - phISL) + 0.02 * Math.abs(tac - tacISL))
      : 0;

    return { ph, tac, ang, delta, total: delta + pen };
  };

  // ---------- base ----------
  let best = scoreStep(phAtual, tacAtual);

  // Se houver alvos ISL válidos, começa também por os considerar
  if (Number.isFinite(phISL) && Number.isFinite(tacISL)) {
    const rISL = scoreStep(phISL, tacISL);
    if (rISL.total < best.total) best = rISL;
  }

  // ---------- 1) scan ao longo do vetor ISL (se existir vetor) ----------
  const dPH  = (Number.isFinite(phISL) ? (phISL - phAtual) : 0);
  const dTAC = (Number.isFinite(tacISL) ? (tacISL - tacAtual) : 0);
  const temVetor = Number.isFinite(dPH) && Number.isFinite(dTAC) && (Math.abs(dPH) + Math.abs(dTAC) > 1e-6);

  if (temVetor) {
    // varre um pouco “antes” e “depois” do alvo ISL
    for (let s = -0.2; s <= 1.8; s += 0.05) {
      const r = scoreRaw(phAtual + s * dPH, tacAtual + s * dTAC);
      // guarda melhor raw
      if (r.total < best.total) best = scoreStep(r.ph, r.tac);
      // se já estiver dentro da tolerância, ainda deixamos acabar o scan (pode melhorar penalização)
    }
  }

  // ---------- 2) refinamento DISCRETO (evita “ficar preso” nos degraus) ----------
  // Procurar em volta do melhor, em passos de 0.05 pH e 5ppm TAC
  const phCenter  = best.ph;
  const tacCenter = best.tac;

  for (let ph = phCenter - 0.20; ph <= phCenter + 0.20; ph += 0.05) {
    for (let tac = tacCenter - 30; tac <= tacCenter + 30; tac += 5) {
      const r = scoreStep(ph, tac);
      if (r.total < best.total) best = r;

      // se já está verde, preferimos o mais “verde” (menor delta) mesmo que total semelhante
      // (opcional, mas ajuda em casos limítrofes)
      if (best.delta <= tolDeg && r.delta < best.delta) best = r;
    }
  }

  // ---------- 3) fallback (se não havia vetor ISL) ----------
  // Mesmo sem vetor, tenta encontrar o melhor “endireitar” dentro dos ideais.
  if (!temVetor) {
    // grelha simples dentro da faixa ideal (rápido e robusto)
    for (let ph = phMin; ph <= phMax + 1e-9; ph += 0.05) {
      for (let tac = tacMin; tac <= tacMax + 1e-9; tac += 5) {
        const r = scoreStep(ph, tac);
        if (r.total < best.total) best = r;
        if (best.delta <= tolDeg && r.delta < best.delta) best = r;
      }
    }
  }

  return {
  phAlvo: Number(best.ph.toFixed(2)),     // força 2 casas
  alcAlvo: Number(best.tac.toFixed(0)),   // inteiro
  angulo: Number(best.ang.toFixed(1)),
  deltaAng: Number(best.delta.toFixed(1)),
  modo: 'ajustar',
};

}

// ------------------------------------------------------------
// Taylor final: refinar a sugestão do ISL para alinhar retas (~180°)
// pH em passos de 0.05 e TAC em passos de 5 ppm
// Condição: TH dentro do ideal (valida isso fora desta função)
// ------------------------------------------------------------
export function sugerirAlvosPorTaylor(input: {
  th: number;          // dureza atual (TH)
  phAtual: number;     // pH atual
  tacAtual: number;    // TAC atual
  phSug?: number;      // sugestão inicial do ISL (opcional)
  tacSug?: number;     // sugestão inicial do ISL (opcional)
  toleranciaDeg?: number; // default 3
}) {
  const {
    th,
    phAtual,
    tacAtual,
    phSug,
    tacSug,
    toleranciaDeg = 3,
  } = input;

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const roundToStep = (v: number, step: number) => Math.round(v / step) * step;
  const roundPH = (v: number) => roundToStep(v, 0.05);
  const roundTAC = (v: number) => roundToStep(v, 5);

  // Limites ideais que tu estás a usar (podes ajustar depois)
  const phMin = 7.0, phMax = 7.4;
  const tacMin = 80, tacMax = 150;

  // Se vier sugestão do ISL, usamos como centro; se não, usamos o atual.
  const phBase = Number.isFinite(phSug as number) ? (phSug as number) : phAtual;
  const tacBase = Number.isFinite(tacSug as number) ? (tacSug as number) : tacAtual;

  // “canvas” virtual só para calcular ângulos (as proporções não interessam, só a geometria relativa)
  const W = 220;
  const H = 300;

  // Reusa as tuas funções existentes neste ficheiro:
  // yLog (TAC/TH) e yLinear (pH) e angleDegAtPH
  // (assumo que já existem acima no ficheiro, como no teu código)
  const xTac = 0;
  const xPH = W / 2;
  const xTH = W;

  const mkAngle = (phCand: number, tacCand: number) => {
    const ph = roundPH(clamp(phCand, phMin, phMax));
    const tac = roundTAC(clamp(tacCand, tacMin, tacMax));

    const pPH = { x: xPH, y: yLinear(ph, H) };
    const pTac = { x: xTac, y: yLog(tac, H) };
    const pTH = { x: xTH, y: yLog(th, H) };

    const ang = angleDegAtPH(pTac, pPH, pTH);
    const delta = Math.abs(180 - ang);

    return { ph, tac, ang, delta };
  };

  // Pesquisa local em grelha à volta do ponto base (ISL ou atual)
  // Passos "humanos": pH 0.05, TAC 5
  const phSteps = [-0.30, -0.25, -0.20, -0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30];
  const tacSteps = [-30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30];

  let best = mkAngle(phBase, tacBase);

  for (const dPh of phSteps) {
    for (const dTac of tacSteps) {
      const cand = mkAngle(phBase + dPh, tacBase + dTac);

      // escolhe o menor delta; em empate, prefere mexer menos (distância ao base)
      const distBest = Math.abs(best.ph - roundPH(phBase)) + Math.abs(best.tac - roundTAC(tacBase)) / 10;
      const distCand = Math.abs(cand.ph - roundPH(phBase)) + Math.abs(cand.tac - roundTAC(tacBase)) / 10;

      if (
        cand.delta < best.delta ||
        (cand.delta === best.delta && distCand < distBest)
      ) {
        best = cand;
      }
    }
  }

  const modo = best.delta <= toleranciaDeg ? 'manter' : 'ajustar';

  return {
    phAlvo: best.ph,
    alcAlvo: best.tac,
    angulo: Number(best.ang.toFixed(1)),
    deltaAng: Number(best.delta.toFixed(1)),
    modo,
  };
}

export function calcTaylorAngleDeg(
  ph: number,
  tac: number,
  th: number,
  w: number,
  h: number
) {
  const xTac = 0;
  const xPH = w / 2;
  const xTH = w;

  const pPH = { x: xPH, y: yLinear(ph, h) };
  const pTac = { x: xTac, y: yLog(tac, h) };
  const pTH = { x: xTH, y: yLog(th, h) };

  return angleDegAtPH(pTac, pPH, pTH);
}
