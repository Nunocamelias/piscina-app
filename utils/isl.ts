// utils/isl.ts
// Índice de Saturação de Langelier (ISL/LSI)
// ISL = pH + D + A + T - S
// onde D, A, T, S são fatores obtidos por tabela (com interpolação linear)

export const LSI_TABLE = {
  dureza: [
    { ppm: 5, D: 0.3 },
    { ppm: 25, D: 1.0 },
    { ppm: 50, D: 1.3 },
    { ppm: 75, D: 1.5 },
    { ppm: 100, D: 1.6 },
    { ppm: 150, D: 1.8 },
    { ppm: 200, D: 1.9 },
    { ppm: 300, D: 2.1 },
    { ppm: 400, D: 2.2 },
    { ppm: 800, D: 2.5 },
  ],
  alcalinidade: [
    { ppm: 5, A: 0.7 },
    { ppm: 25, A: 1.4 },
    { ppm: 50, A: 1.7 },
    { ppm: 75, A: 1.9 },
    { ppm: 100, A: 2.0 },
    { ppm: 150, A: 2.2 },
    { ppm: 200, A: 2.3 },
    { ppm: 300, A: 2.5 },
    { ppm: 400, A: 2.6 },
    { ppm: 800, A: 2.9 },
  ],
  temperatura: [
    { c: 0, T: 0.0 },
    { c: 3, T: 0.1 },
    { c: 8, T: 0.2 },
    { c: 12, T: 0.3 },
    { c: 15, T: 0.4 },
    { c: 19, T: 0.5 },
    { c: 24, T: 0.6 },
    { c: 29, T: 0.7 },
    { c: 34, T: 0.8 },
    { c: 40, T: 0.9 },
  ],
  // Nota: este "S" é a constante a subtrair (varia com TDS)
  tds: [
    { ppm: 0, S: 12.0 },
    { ppm: 1000, S: 12.1 },
    { ppm: 2000, S: 12.2 },
    { ppm: 4000, S: 12.3 },
    { ppm: 6000, S: 12.4 },
    { ppm: 12000, S: 12.5 },
  ],
} as const;

export type ISLIndicacao =
  | 'Corrosão severa'
  | 'Corrosão leve'
  | 'Equilibrada'
  | 'Formação leve de incrustações'
  | 'Formação severa de incrustações';

export type ISLResultado = {
  isl: number;
  D: number;
  A: number;
  T: number;
  S: number;
  indicacao: ISLIndicacao;
};

export function interpretarISL(isl: number): ISLIndicacao {
  if (isl < -0.5) return 'Corrosão severa';
  if (isl < 0) return 'Corrosão leve';
  // Na prática raramente dá exatamente 0, então consideramos “perto de 0”
  if (Math.abs(isl) < 0.05) return 'Equilibrada';
  if (isl < 0.5) return 'Formação leve de incrustações';
  return 'Formação severa de incrustações';
}

type Ponto = { x: number; y: number };

function lerTabelaLinear(x: number, pontos: Ponto[]): number {
  if (!Number.isFinite(x)) return pontos[0].y;

  // clamp
  if (x <= pontos[0].x) return pontos[0].y;
  if (x >= pontos[pontos.length - 1].x) return pontos[pontos.length - 1].y;

  // encontra intervalo
  for (let i = 0; i < pontos.length - 1; i++) {
    const a = pontos[i];
    const b = pontos[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return a.y + t * (b.y - a.y);
    }
  }
  return pontos[pontos.length - 1].y;
}

function toNumberOrNaN(v: unknown): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const normalized = v.replace(',', '.').trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/**
 * Calcula o ISL.
 * - Se TDS não vier, assume 0 (vai usar S=12.0 pela tabela).
 * - Devolve valores arredondados.
 */
export function calcularISL(params: {
  pH: number | string;
  dureza: number | string; // ppm
  alcalinidade: number | string; // ppm
  temperatura: number | string; // °C
  tds?: number | string; // ppm (opcional)
}): ISLResultado {
  const pH = toNumberOrNaN(params.pH);
  const dureza = toNumberOrNaN(params.dureza);
  const alcalinidade = toNumberOrNaN(params.alcalinidade);
  const temperatura = toNumberOrNaN(params.temperatura);
  const tds = params.tds === undefined ? 0 : toNumberOrNaN(params.tds);

  if (![pH, dureza, alcalinidade, temperatura].every(Number.isFinite)) {
    // se algum obrigatório não vier, devolve um “resultado neutro”
    const isl = NaN;
    return {
      isl,
      D: NaN,
      A: NaN,
      T: NaN,
      S: NaN,
      indicacao: 'Equilibrada',
    };
  }

  const D = lerTabelaLinear(
    dureza,
    LSI_TABLE.dureza.map((r) => ({ x: r.ppm, y: r.D }))
  );

  const A = lerTabelaLinear(
    alcalinidade,
    LSI_TABLE.alcalinidade.map((r) => ({ x: r.ppm, y: r.A }))
  );

  const T = lerTabelaLinear(
    temperatura,
    LSI_TABLE.temperatura.map((r) => ({ x: r.c, y: r.T }))
  );

  const S = lerTabelaLinear(
    Number.isFinite(tds) ? tds : 0,
    LSI_TABLE.tds.map((r) => ({ x: r.ppm, y: r.S }))
  );

  const islRaw = pH + D + A + T - S;

  return {
    isl: Number(islRaw.toFixed(2)),
    D: Number(D.toFixed(2)),
    A: Number(A.toFixed(2)),
    T: Number(T.toFixed(2)),
    S: Number(S.toFixed(2)),
    indicacao: interpretarISL(islRaw),
  };
}

/**
 * Helper opcional: se quiseres um “alvo” recomendado.
 * Mantém limites práticos (7.0 a 7.6) e alcalinidade (80 a 150).
 */
export function sugerirAlvosPorISL(isl: number): { phAlvo: number; alcAlvo: number } {
  let phAlvo = 7.2;
  let alcAlvo = 100;

  if (!Number.isFinite(isl)) return { phAlvo, alcAlvo };

  if (isl < -0.5) {
    phAlvo = 7.4;
    alcAlvo = 140;
  } else if (isl < 0) {
    phAlvo = 7.3;
    alcAlvo = 120;
  } else if (isl > 0.5) {
    phAlvo = 7.0;
    alcAlvo = 80;
  } else if (isl > 0) {
    phAlvo = 7.1;
    alcAlvo = 90;
  }

  // clamps
  phAlvo = Math.min(7.6, Math.max(7.0, phAlvo));
  alcAlvo = Math.min(150, Math.max(80, alcAlvo));

  return { phAlvo, alcAlvo };
}
