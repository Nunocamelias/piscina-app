// services/manutencaoMensagens.ts

/* =========================================================
   (1) TIPOS E CONSTANTES (ALINHADAS COM O TEU PROJETO)
   ========================================================= */

export type MetodoAnalise = 'fotometro' | 'gotas' | 'fitas';
export type ModoTratamento = 'sal' | 'cloro';

// ✅ Ajusta aqui se mais tarde adicionares outro status
export type StatusParametro =
  | 'pendente'
  | 'aplicado'
  | 'sem estoque'
  | 'nao necessario'
  | 'nao ajustavel';

export type Cliente = {
  nome: string;
  morada: string;
  telefone: string;
  google_maps?: string;
  info_acesso?: string;

  volume?: number;
  tanque_compensacao?: boolean;
  cobertura?: boolean;
  bomba_calor?: boolean;
  equipamentos_especiais?: boolean;
  eletrolise_sal?: boolean;
  tem_orp?: boolean;
  ultima_substituicao?: string | null;
};

export type Parametro = {
  id: number;
  parametro: string;

  valor_minimo: string;
  valor_maximo: string;
  valor_alvo: string;

  valor_ultimo?: number;
  valor_atual?: string | null;

  produto_aumentar: string;
  produto_diminuir: string;

  dosagem_aumentar: number;
  dosagem_diminuir: number;

  incremento_aumentar: number;
  incremento_diminuir: number;

  volume_calculo: number;

  resultado?: { resultado: string; quantidade?: number; produto?: string };

  bloqueado?: boolean;
  status?: StatusParametro;
  notificacaoEnviada?: boolean;
  requeridoHoje?: boolean;
};

export type MensagensManutencaoInput = {
  empresaid: number | string;
  clienteId: number | string;
  clienteNome?: string;

  cliente?: Cliente | null;
  parametros: Parametro[];

  metodoAnalise?: MetodoAnalise;
  modoTratamento?: ModoTratamento;
};

export type MensagensManutencaoOutput = {
  titulo: string;          // ex: "Resumo de correções — Cliente X (ID 12)"
  resumo: string;          // texto compacto com bullets/linhas
  procedimento: string[];  // passos numerados / linhas
  debug?: any;             // opcional (podes remover se não quiseres)
  temMensagem: boolean; // true se há algo útil para mostrar
  key: string;          // “assinatura” do estado atual (p/ não repetir alert)
};



// ======================================================
// ACTIONS (modelo novo, migração faseada)
// ======================================================

export type ActionLevel = 0 | 1 | 2 | 3 | 4;

export type ActionType =
  // 🔴 BLOQUEIO / SEGURANÇA
  | 'BLOQUEIO_INTERDICAO_BANHO'
  | 'BLOQUEIO_AGUARDAR_ESTABILIZACAO'
  | 'ACAO_CRITICA_RENOVAR_AGUA'

  // 🟠 DIAGNÓSTICO / CORREÇÃO AVANÇADA
  | 'RENOVAR_AGUA_TOTAL_CYA'
  | 'RENOVAR_AGUA_PARCIAL_CYA'
  | 'TRATAMENTO_CHOQUE_CLORAMINAS'
  | 'TRATAMENTO_CHOQUE'
  | 'TRATAMENTO_FLOCULACAO'
  | 'TRATAMENTO_ALGICIDA'
  | 'REAVALIAR_MEDICOES'
  | 'CONFIRMAR_VALOR'
  | 'MEDIR_VALOR'

  // 🟡 OPERAÇÃO / FILTRAÇÃO
  | 'LIMPAR_PRE_FILTRO'
  | 'SUBSTITUIR_CESTO_PRE_FILTRO'
  | 'RETROLAVAGEM'
  | 'LIMPAR_TURBINA_MOTOR'
  | 'LIMPAR_TANQUE_COMPENSACAO'
  | 'LIMPAR_TANQUE_COBERTURA'

  // 🔵 EQUILÍBRIO DA ÁGUA
  | 'AJUSTAR_DUREZA'
  | 'AJUSTAR_TAC'
  | 'AJUSTAR_PH'
  | 'AJUSTAR_CYA'
  | 'AJUSTAR_SALINIDADE'

  // 🟢 DESINFEÇÃO
  | 'CALIBRAR_ORP_SONDA'
  | 'CALIBRAR_PH_SONDA'
  | 'AJUSTAR_SETPOINT_ELETROLISE'          // com ORP (última alternativa)
  | 'AJUSTAR_NIVEL_PRODUCAO_ELETROLISE'    // sem ORP
  | 'APLICAR_CLORO_MANUAL'
  | 'NEUTRALIZAR_CLORO';

export type Action = {
  type: ActionType;
  level: ActionLevel;
  // texto curto para UI/log
  title?: string;
  // dados dinâmicos p/ mensagens (ex.: m3, ppm, horas)
  payload?: Record<string, any>;
};

// helper simples para não repetir
const A = (type: ActionType, level: ActionLevel, title?: string, payload?: Record<string, any>): Action => ({
  type,
  level,
  title,
  payload,
});

// ✅ ORDEM que definiste (com desinfeção no fim)
const ORDEM_CORRECAO = ['dureza', 'alcalinidade', 'ph', 'acido_cianurico', 'desinfeccao'] as const;
type StepKey = (typeof ORDEM_CORRECAO)[number];


/* =========================================================
   (2) NORMALIZAÇÃO DE NOMES (ALINHADO COM O TEU ENDPOINT)
   - Usa exatamente os nomes que vêm do mp.parametro
   ========================================================= */

type ParamKey =
  | 'dureza'
  | 'alcalinidade'
  | 'ph'
  | 'acido_cianurico'
  | 'cloro_livre'
  | 'cloro_total'
  | 'cloro_combinado'
  | 'sal'
  | 'outro';

export function normParametroNome(nome: string): ParamKey {
  const s = String(nome || '').trim().toLowerCase();

  // ⚠️ Mantém estes EXACTOS (são os que vêm do teu SELECT/ORDER BY)
  if (s === 'dureza') return 'dureza';
  if (s === 'alcalinidade') return 'alcalinidade';
  if (s === 'ph') return 'ph';
  if (s === 'ácido cianúrico' || s === 'acido cianurico') return 'acido_cianurico';

  if (s === 'cloro livre em ppm') return 'cloro_livre';
  if (s === 'cloro total em ppm') return 'cloro_total';
  if (s === 'cloro combinado em ppm') return 'cloro_combinado';

  if (s === 'sal em kg/m³' || s === 'sal em kg/m3') return 'sal';

  return 'outro';
}

// Só para apresentar “bonito” no resumo/procedimento
export function labelParametro(nomeOriginal: string): string {
  const k = normParametroNome(nomeOriginal);
  switch (k) {
    case 'ph': return 'pH';
    case 'alcalinidade': return 'Alcalinidade';
    case 'acido_cianurico': return 'Ácido Cianúrico';
    case 'cloro_livre': return 'Cloro Livre';
    case 'cloro_total': return 'Cloro Total';
    case 'cloro_combinado': return 'Cloro Combinado';
    case 'sal': return 'Sal';
    case 'dureza': return 'Dureza';
    default: return nomeOriginal;
  }
}


/* =========================================================
   (3) HELPERS NUMÉRICOS + DETEÇÃO DE AÇÃO (sem marcas)
   ========================================================= */

function toNum(v: any): number {
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(',', '.').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function isIgnoravel(status?: StatusParametro) {
  // "nao necessario" não entra nem no resumo nem no procedimento
  return status === 'nao necessario';
}

function isProblema(status?: StatusParametro) {
  // aparece no resumo
  return status === 'pendente' || status === 'sem estoque' || status === 'nao ajustavel';
}

function isAplicado(status?: StatusParametro) {
  return status === 'aplicado';
}

/**
 * Determina "subir/descer/ok" sem usar nome de produto comercial.
 * Se a calculadora já definiu status/resultado, seguimos isso.
 * Se não houver resultado, inferimos pelo valor_atual vs alvo e min/max.
 */
function inferirAcao(p: Parametro): 'subir' | 'descer' | 'ok' | 'desconhecido' {
  const status = p.status;

  if (status === 'nao necessario') return 'ok';
  if (status === 'nao ajustavel') return 'desconhecido';
  if (status === 'sem estoque') {
    // normalmente significa que havia ação, mas ficou adiada
    // vamos inferir pelo valor_atual vs alvo se existir
  }

  const atual = toNum(p.valor_atual);
  const alvo = toNum(p.valor_alvo);
  const min = toNum(p.valor_minimo);
  const max = toNum(p.valor_maximo);

  if (!Number.isFinite(atual) || !Number.isFinite(alvo) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return 'desconhecido';
  }

  // Se estiver dentro do intervalo, ok
  if (atual >= min && atual <= max) return 'ok';

  // fora do intervalo: decide direção pelo alvo
  if (atual < alvo) return 'subir';
  if (atual > alvo) return 'descer';

  return 'desconhecido';
}

/**
 * Texto curto, neutro e sem marcas (aproveita quantidade se existir).
 */
function fraseAcao(p: Parametro): string {
  // ✅ prioridade total ao texto já calculado (ex: "Adicionar X kg...")
  const r = p?.resultado?.resultado;
  if (typeof r === 'string' && r.trim()) return r.trim();

  const st = (p.status ?? 'pendente');

  if (st === 'nao ajustavel') return 'Não ajustável automaticamente (requer intervenção).';
  if (st === 'pendente') return 'Necessita correção.';
  if (st === 'sem estoque') return 'Agendar correção (sem stock).';
  if (st === 'aplicado') return 'Correção aplicada.';
  if (st === 'nao necessario') return 'Dentro do intervalo.';
  return 'Verificar.';
}

function temResultadoIdeal(p: Parametro): boolean {
  const r = p?.resultado?.resultado ?? '';
  return typeof r === 'string' && r.toLowerCase().includes('dentro do intervalo ideal');
}

function valorAtualNum(p: Parametro): number {
  const v = p?.valor_atual;
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(',', '.').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function dentroDoIntervalo(p: Parametro): boolean {
  // 1) se já tens a frase “Dentro do intervalo ideal” gerada, usa isso
  if (temResultadoIdeal(p)) return true;

  // 2) fallback: compara com min/max
  const n = valorAtualNum(p);
  if (!Number.isFinite(n)) return false;

  const min = Number(String(p.valor_minimo ?? '').replace(',', '.'));
  const max = Number(String(p.valor_maximo ?? '').replace(',', '.'));

  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  return n >= min && n <= max;
}

function precisaCorrecao(p: Parametro): boolean {
  // “precisa correção” = tem valor + está fora do intervalo
  const n = valorAtualNum(p);
  if (!Number.isFinite(n)) return false;
  return !dentroDoIntervalo(p);
}

function temValor(p: Parametro): boolean {
  return p.valor_atual != null && String(p.valor_atual).trim() !== '';
}

function isAtivoNoProcedimento(p?: Parametro | null): boolean {
  if (!p) return false;
  const st = (p.status ?? 'pendente');
  if (isIgnoravel(st)) return false;

  // ✅ se não foi medido e não tem resultado e não é aplicado/sem stock, não entra
  const temValor = String(p.valor_atual ?? '').trim() !== '';
  const temRes = !!p.resultado?.resultado;
  if (!temValor && !temRes && st !== 'aplicado' && st !== 'sem estoque') return false;

  if (st === 'pendente' && dentroDoIntervalo(p)) return false;
  return (isProblema(st) || isAplicado(st) || st === 'sem estoque');
}

const temValorAtual = (p?: Parametro | null) =>
  !!p && String(p.valor_atual ?? '').trim() !== '';

const temResultado = (p?: Parametro | null) =>
  !!p && !!p.resultado?.resultado;

const stNorm = (p?: Parametro | null) => (p?.status ?? 'pendente');

const entraNasMensagens = (p?: Parametro | null) => {
  if (!p) return false;
  const st = stNorm(p);
  if (isIgnoravel(st)) return false;
  return temValorAtual(p) || temResultado(p) || st === 'aplicado' || st === 'sem estoque';
};

function getParam(ps: Parametro[], key: string): Parametro | undefined {
  return ps.find(p => normParametroNome(p.parametro) === key);
}

function numOrNaN(v: any): number {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

// “ativo nesta visita”: só entra se tem valor_atual preenchido OU tem resultado calculado
function isMedidoOuCalculado(p?: Parametro | null): boolean {
  if (!p) return false;
  const v = String((p as any).valor_atual ?? '').trim();
  return v !== '' || !!p.resultado?.resultado;
}

// linha principal reaproveita o que já vem da Folha
function linhaPrincipal(p: Parametro): string {
  const st = (p.status ?? 'pendente');
  if (p.resultado?.resultado) return p.resultado.resultado;
  if (st === 'aplicado') return 'Correção aplicada.';
  if (st === 'sem estoque') return 'Sem stock (agendar correção).';
  if (st === 'nao necessario') return 'Não necessário.';
  if (st === 'nao ajustavel') return 'Não ajustável.';
  return fraseAcao(p);
}

/* =========================================================
   (4) REGRAS ESPECIAIS (TAC<65, tempos de espera, CYA água nova, sal/ORP)
   ========================================================= */

function tacValor(parametros: Parametro[]): number {
  const p = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  return toNum(p?.valor_atual);
}

function cyaValor(parametros: Parametro[]): number {
  const p = parametros.find(x => normParametroNome(x.parametro) === 'acido_cianurico');
  return toNum(p?.valor_atual);
}

/**
 * CYA alto: cálculo de renovação parcial (aproximação correta para mistura).
 * frac = 1 - alvo/atual
 */
export function calcularVolumeTrocaAguaParaCYA(
  volumeM3: number,
  cyaAtual: number,
  cyaAlvo: number
) {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return null;
  if (!Number.isFinite(cyaAtual) || cyaAtual <= 0) return null;
  if (!Number.isFinite(cyaAlvo) || cyaAlvo <= 0) return null;
  if (cyaAlvo >= cyaAtual) return 0;

  const frac = 1 - (cyaAlvo / cyaAtual);
  const fracClamped = clamp(frac, 0, 0.95); // evita 100% (quase nunca é realista numa visita)
  return Math.round(volumeM3 * fracClamped * 10) / 10; // 1 casa decimal
}

// ======================================================
// BUILD ACTIONS (v1: mínimo, sem reescrever mensagens)
// ======================================================
const precisaCorrecaoLocal = (p: Parametro) => precisaCorrecao(p);

function buildActions(input: {
  cliente?: Cliente | null;
  modoTratamento?: ModoTratamento;
  metodoAnalise?: string; // ✅ NOVO
  parametros: Parametro[];
  tacBaixa?: boolean;
}): Action[] {

  const { cliente, modoTratamento, metodoAnalise, parametros, tacBaixa } = input;

  const actions: Action[] = [];

  const get = (k: string) => parametros.find(p => normParametroNome(p.parametro) === k);

  const pClLivre = get('cloro_livre');
  const pClTotal = get('cloro_total');
  const pCl = pClLivre ?? pClTotal;
  const cloroLabel = pClLivre ? 'Cloro Livre' : 'Cloro Total';

  const pDur = get('dureza');
  const pCya = get('acido_cianurico');
  const pTac = get('alcalinidade');
  const pPH = get('ph');
  const pCC = get('cloro_combinado');

  const cl = pCl ? toNum(String(pCl.valor_atual ?? '').trim()) : NaN;
  const cya = pCya ? toNum(String(pCya.valor_atual ?? '').trim()) : NaN;
  const tac = pTac ? toNum(String(pTac.valor_atual ?? '').trim()) : NaN;
  const ccDireto = pCC ? toNum(String((pCC as any).valor_atual ?? '').trim()) : NaN;

   // fallback: se não houver CC preenchido, tenta calcular de Total - Livre (quando existirem)
  const pTotal = get('cloro_total');
  const total = pTotal ? toNum(String((pTotal as any).valor_atual ?? '').trim()) : NaN;

  const cc =
    Number.isFinite(ccDireto) ? ccDireto :
    (Number.isFinite(total) && Number.isFinite(cl)) ? Math.max(0, total - cl) :
    NaN;

  if (Number.isFinite(cc) && cc > 0.5) {
    const deltaBreakpoint = +(10 * cc).toFixed(2); // “regra mestre”: 10x cloro combinado

    actions.push(
      A(
        'TRATAMENTO_CHOQUE_CLORAMINAS',
        0,
        'Cloro combinado alto: choque necessário',
        { cc: +cc.toFixed(2), deltaBreakpoint }
      )
    );
  }

  const isSal = (modoTratamento === 'sal') || !!cliente?.eletrolise_sal;
  const temOrp = !!cliente?.tem_orp;

  // 🔴 Bloqueio por cloro muito alto (manténs também os Alerts por agora)
  if (Number.isFinite(cl) && cl >= 10) {
    actions.push(A('BLOQUEIO_INTERDICAO_BANHO', 0, 'Piscina interdita (cloro muito alto)', { cl }));
  }

  // 🔵 TAC (Alcalinidade) — Equilíbrio da água
if (pTac && !isIgnoravel(pTac.status)) {
  const st = (pTac.status ?? 'pendente');

  const tacMin = toNum((pTac as any).valor_minimo);
  const tacMax = toNum((pTac as any).valor_maximo);
  const tacAlvo = toNum((pTac as any).valor_alvo);

  const tacTemValor = Number.isFinite(tac);

  // se não há valor, mas o TAC está "ativo" (precisa decisão), pede medição
  const tacAtivo =
    (st === 'pendente' && !dentroDoIntervalo(pTac)) ||
    isProblema(st) ||
    isAplicado(st) ||
    st === 'sem estoque';

  if (!tacTemValor && tacAtivo) {
    actions.push(A('MEDIR_VALOR', 2, 'Medir TAC (Alcalinidade)', { parametro: 'TAC' }));
  }

  // Só cria AJUSTAR_TAC quando há valor numérico e está fora do intervalo
  const fora =
    tacTemValor &&
    Number.isFinite(tacMin) &&
    Number.isFinite(tacMax) &&
    (tac < tacMin || tac > tacMax);

  if (fora) {
  const direcao = tac < tacMin ? 'subir' : 'descer';

  actions.push(
    A('AJUSTAR_TAC', 3, 'Ajustar TAC', {
      direcao,
      tac,
      tacMin,
      tacMax,
      tacAlvo: Number.isFinite(tacAlvo) ? tacAlvo : undefined,
      status: st,
    })
  );

  // ✅ só aqui
  actions.push(
    A('BLOQUEIO_AGUARDAR_ESTABILIZACAO', 2, 'Aguardar estabilização após ajuste de TAC', {
      motivo: 'TAC',
      horasMin: 4,
      horasMax: 6,
      reavaliar: ['TAC', 'pH'],
    })
  );
}

  // Se TAC foi “aplicado” nesta visita → aguardar estabilização e reavaliar
  if (st === 'aplicado') {
    actions.push(
      A('BLOQUEIO_AGUARDAR_ESTABILIZACAO', 2, 'Aguardar estabilização após TAC', {
        motivo: 'TAC',
        horasMin: 4,
        horasMax: 6,
        reavaliar: ['TAC', 'pH'],
      })
    );
    actions.push(A('REAVALIAR_MEDICOES', 2, 'Reavaliar TAC e pH após estabilização', { parametros: ['TAC', 'pH'] }));
  }
}

 // 🟠/🔴 CYA -> renovação de água / ação crítica
const isFotometro = String(metodoAnalise || '').toLowerCase() === 'fotometro';
const tacTemValorCYA = Number.isFinite(tac);

const cyaAviso = Number.isFinite(cya) && cya >= 70;
const cyaMuitoAlto = Number.isFinite(cya) && cya >= 100;
const cyaCritico = Number.isFinite(cya) && cya >= 150;

if (cyaAviso) {
  // se TAC não foi medida, continua a pedir medição antes de decidir m³
  if (!tacTemValorCYA) {
    actions.push(
      A('MEDIR_VALOR', 1, 'Medir TAC antes de decidir renovação de água', {
        parametro: 'TAC',
        cya,
      })
    );
  }

  // fitas/gotas: pedir confirmação com fotómetro
  if (!isFotometro) {
    actions.push(
      A('CONFIRMAR_VALOR', 1, 'Confirmar CYA com fotómetro antes de renovar água', {
        parametro: 'CYA',
        metodoAnalise,
        cya,
      })
    );
  }

  // ação crítica só para fotómetro e CYA extremo
  if (cyaCritico && isFotometro) {
    actions.push(
      A('ACAO_CRITICA_RENOVAR_AGUA', 0, 'CYA crítico: suspender tratamentos e renovar água', {
        cya,
        metodoAnalise,
        tac,
      })
    );
  }

  // ações de renovação existem sempre que CYA está alto
  if (cyaMuitoAlto) {
    actions.push(
      A('RENOVAR_AGUA_TOTAL_CYA', isFotometro ? 0 : 1, 'Recomenda-se renovação total da água', {
        cya,
        tac,
        metodoAnalise,
      })
    );

    actions.push(
      A('RENOVAR_AGUA_PARCIAL_CYA', isFotometro ? 0 : 1, 'No mínimo, renovar parcialmente a água', {
        cya,
        tac,
        metodoAnalise,
      })
    );
  } else {
    actions.push(
      A('RENOVAR_AGUA_PARCIAL_CYA', 1, 'Recomenda-se renovação parcial da água', {
        cya,
        tac,
        metodoAnalise,
      })
    );
  }
}

  // 🟢 Eletrólise: separar ORP vs sem ORP (não “manda já”, só regista)
  if (isSal) {
    actions.push(
      temOrp
        ? A('AJUSTAR_SETPOINT_ELETROLISE', 4, 'Eletrólise com ORP: setpoint é última alternativa', { exigeTAC_CYA: true, tacBaixa: !!tacBaixa })
        : A('AJUSTAR_NIVEL_PRODUCAO_ELETROLISE', 4, 'Eletrólise sem ORP: ajustar produção', {})
    );
  }

  // 🔵 pH → ação de ajuste
if (pPH && !isIgnoravel(pPH.status)) {
  const st = (pPH.status ?? 'pendente');

  const phDentro = dentroDoIntervalo(pPH);

  const phAtivo =
  (st === 'pendente' ? !phDentro : (isProblema(st) || isAplicado(st) || st === 'sem estoque'));


  if (phAtivo) {
    actions.push(
      A('AJUSTAR_PH', 2, 'Ajustar pH', {
        ph: toNum(String((pPH as any).valor_atual ?? '').trim()),
      })
    );
  }
}
// 🔵 DUREZA → ação de ajuste + aguardar estabilização (12–24h)
if (pDur && !isIgnoravel(pDur.status)) {
  const st = (pDur.status ?? 'pendente');
  const durDentro = dentroDoIntervalo(pDur);

  const durAtivo =
    !(st === 'pendente' && durDentro) &&
    (isProblema(st) || isAplicado(st) || st === 'sem estoque');

  const dur = toNum(String((pDur as any).valor_atual ?? '').trim());

  // Só cria AJUSTAR_DUREZA quando há valor numérico e está fora do intervalo
  const durMin = toNum(pDur.valor_minimo);
  const durMax = toNum(pDur.valor_maximo);
  const durAlvo = toNum(pDur.valor_alvo);

  const temValor = Number.isFinite(dur);
  const fora =
    temValor &&
    Number.isFinite(durMin) &&
    Number.isFinite(durMax) &&
    (dur < durMin || dur > durMax);

  if (durAtivo && fora) {
    const direcao = dur < durMin ? 'subir' : 'descer';

    actions.push(
      A('AJUSTAR_DUREZA', 2, 'Ajustar Dureza', {
        direcao,
        dur,
        durMin,
        durMax,
        durAlvo: Number.isFinite(durAlvo) ? durAlvo : undefined,
        status: st,
      })
    );

    actions.push(
      A(
        'BLOQUEIO_AGUARDAR_ESTABILIZACAO',
        2,
        'Aguardar estabilização após ajuste de Dureza',
        { motivo: 'DUREZA', horasMin: 12, horasMax: 24 }
      )
    );
  }
}
  return actions;
}

/* =========================================================
   (5) GERADOR PRINCIPAL: RESUMO + PROCEDIMENTO (ORDEM CORRETA)
   ========================================================= */

export function gerarMensagensManutencao(input: MensagensManutencaoInput): MensagensManutencaoOutput {
  const {
    empresaid,
    clienteId,
    clienteNome,
    cliente,
    parametros,
    metodoAnalise,
    modoTratamento,
  } = input;

  const parametrosFiltrados = (parametros ?? []).filter((p) => {
    const k = normParametroNome(p.parametro);

    const piscinaSal = (modoTratamento === 'sal' || !!cliente?.eletrolise_sal);
    if (k === 'sal' && !piscinaSal) return false;

    const st = (p.status ?? 'pendente');
    if (isIgnoravel(st)) return false;

    const temValorAtual = String(p.valor_atual ?? '').trim() !== '';
    const temResultado = !!p.resultado?.resultado;

    if (!temValorAtual && !temResultado && st !== 'aplicado' && st !== 'sem estoque') {
      return false;
    }

    return true;
  });

  const ps = parametrosFiltrados;

  const choque = alertaChoque(ps);

  const pTAC = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  const tacTemValor = !!pTAC && String(pTAC.valor_atual ?? '').trim() !== '';
  const tacAtivo = isAtivoNoProcedimento(pTAC);
  const tac = tacValor(parametrosFiltrados);
  const tacBaixa = Number.isFinite(tac) && tac < 65;
  const actions = buildActions({
  cliente,
  modoTratamento,
  metodoAnalise,          // ✅ agora passa isto
  parametros: parametrosFiltrados,
  tacBaixa,
});


// mais à frente, quando montas o output:
const avisosTopo: string[] = [];
if (choque) {
  avisosTopo.push(choque.titulo);
  choque.linhas.forEach(l => avisosTopo.push(`- ${l}`));
}


  const titulo = `Resumo de correções — ${clienteNome || cliente?.nome || 'Cliente'} (ID ${clienteId})`;

  // ---------- (5.1) RESUMO (curto e reaproveitável no Alert) ----------
  const linhasResumo: string[] = [];

  const relevantesProc = parametrosFiltrados.filter((p) => {
  const st = (p.status ?? 'pendente');

  const vRaw = (p as any).valor_atual;
  const temValor = String(vRaw ?? '').trim() !== '';
  const temResultado = !!p.resultado?.resultado;

  // ✅ se não foi medido e não tem resultado, não aparece no procedimento
  if (!temValor && !temResultado) return false;

  if (st === 'pendente') return precisaCorrecao(p); // só se precisa correção
  if (st === 'aplicado') return true;
  if (st === 'sem estoque') return true;
  if (st === 'nao ajustavel') return true;

  return false;
});


const cloroObrigatorio = (String(metodoAnalise || '').toLowerCase() === 'gotas')
  ? 'cloro_total'
  : 'cloro_livre';

const obrigatorios = new Set<ParamKey>(['ph', cloroObrigatorio]);
 // se quiseres incluir cloro_total em gotas, diz-me

const parametrosComValorOuObrigatorio = parametrosFiltrados.filter((p) => {
  const k = normParametroNome(p.parametro);

  // ✅ se é obrigatório, entra mesmo sem valor (para avisar "em falta")
  if (obrigatorios.has(k)) return true;

  // ✅ se é periódico, só entra se tiver valor preenchido
  return temValor(p);
});

  // inclui só o que precisa de atenção (pendente/sem estoque/nao ajustavel)
  const candidatos = parametrosComValorOuObrigatorio
    .filter(p => !isIgnoravel(p.status))
    .filter(p => isProblema(p.status) || isAplicado(p.status));

  // Ordena o resumo pela tua prioridade (dureza → TAC → pH → CYA → desinfeção)
  const prioridadeResumo = (p: Parametro) => {
    const k = normParametroNome(p.parametro);
    if (k === 'dureza') return 1;
    if (k === 'alcalinidade') return 2;
    if (k === 'ph') return 3;
    if (k === 'acido_cianurico') return 4;
    // desinfeção: cloro_livre / sal entram aqui
    if (k === 'cloro_livre' || k === 'sal' || k === 'cloro_total') return 5;
    return 99;
  };

  candidatos.sort((a, b) => prioridadeResumo(a) - prioridadeResumo(b));

  for (const p of candidatos) {
  const k = normParametroNome(p.parametro);
   if (k === 'sal' && !(modoTratamento === 'sal' || cliente?.eletrolise_sal)) continue;
  // Cloro Total nunca entra no resumo.
  // Cloro Combinado entra APENAS se > 0.5 (para justificar o choque).
  // ✅ só ignora cloro_total quando existe cloro_livre (para não duplicar)
if (k === 'cloro_total') {
  const temLivre = candidatos.some(x => normParametroNome(x.parametro) === 'cloro_livre');
  if (temLivre) continue;
}


  if (k === 'cloro_combinado') {
    const cc = numOrNaN((p as any).valor_atual);
    if (!Number.isFinite(cc) || cc <= 0.5) continue;
  }
  

const st = (p.status ?? 'pendente');

// ✅ texto curto por estado
let linhaExtra = '';

if (st === 'pendente') {
  linhaExtra = dentroDoIntervalo(p) ? 'Dentro do ideal' : 'Necessita correção';
} else if (st === 'aplicado') {
  linhaExtra = 'Correção aplicada';
} else if (st === 'sem estoque') {
  linhaExtra = 'Agendar correção (sem stock)';
} else if (st === 'nao ajustavel') {
  linhaExtra = 'Não ajustável (assistência)';
} else if (st === 'nao necessario') {
  linhaExtra = 'Não necessário';
}

// ✅ ícone simples
const icon =
  st === 'aplicado' ? '✅' :
  st === 'sem estoque' ? '🟠' :
  st === 'nao ajustavel' ? '🔴' :
  (st === 'pendente' && !dentroDoIntervalo(p)) ? '🟡' :
  '🟢';

  const nome = labelParametro(p.parametro);

const atualStr =
  p.valor_atual == null || String(p.valor_atual).trim() === ''
    ? '—'
    : String(p.valor_atual).trim();

const atualNum = toNum(p.valor_atual);

const atualComUnidade =
  (k === 'cloro_livre' ||
    k === 'cloro_total' ||
    k === 'cloro_combinado' ||
    k === 'dureza' ||
    k === 'alcalinidade')
    ? (atualStr === '—' ? '—' : `${atualStr} ppm`)
    : atualStr;

// ✅ exceção visual do CYA
let iconFinal = icon;
if (k === 'acido_cianurico' && Number.isFinite(atualNum)) {
  if (atualNum >= 70) {
    iconFinal = '🔴';
  } else if (atualNum > 50) {
    iconFinal = '🟠';
  }
}

linhasResumo.push(`• ${iconFinal} ${nome}: ${atualComUnidade} — ${linhaExtra}`);
}
  const resumo =
    linhasResumo.length > 0
      ? linhasResumo.join('\n')
      : 'Sem correções pendentes.';

  // ---------- (5.2) PROCEDIMENTO (passo-a-passo com regras e tempos) ----------
const proc: string[] = [];

// helpers de contexto (usar SEMPRE filtrados ✅)

const psMedidos = parametrosFiltrados.filter((p) =>
  String((p as any).valor_atual ?? '').trim() !== ''
);

// ✅ PRIORIDADE por ACTION (sem heurísticas de texto)
const temRenovacaoCYA = actions.some(a =>
  a.type === 'RENOVAR_AGUA_TOTAL_CYA' || a.type === 'RENOVAR_AGUA_PARCIAL_CYA'
);

const temAcaoCriticaRenovarAgua = actions.some(a => a.type === 'ACAO_CRITICA_RENOVAR_AGUA');
const bloquearQuantidadesPorCYA = temRenovacaoCYA;
const msgBloqueioCYA = '   - Não apresentamos quantidades de produtos sem resolver primeiro o Ácido Cianúrico elevado.';

// ✅ CYA vai para o topo SEMPRE que houver renovação
if (temRenovacaoCYA) {
  proc.push(...procedimentoCYA(ps, cliente, tacBaixa, metodoAnalise, modoTratamento, actions));
  proc.push('');
}

proc.push('=== Equilíbrio da água ===');

if (bloquearQuantidadesPorCYA) {
  const temDur = actions.some(a => a.type === 'AJUSTAR_DUREZA');
  const temTac = actions.some(a => a.type === 'AJUSTAR_TAC');
  const temPh  = actions.some(a => a.type === 'AJUSTAR_PH');

  if (temDur) {
    proc.push('1) Dureza');
    proc.push(msgBloqueioCYA);
  }

  if (temTac) {
    proc.push('2) Alcalinidade');
    proc.push(msgBloqueioCYA);
  }

  if (temPh) {
    proc.push('3) pH');
    proc.push(msgBloqueioCYA);
  }
} else {
  proc.push(...procedimentoDureza(relevantesProc, actions));
  proc.push(...procedimentoTAC(relevantesProc, actions));
  proc.push(...procedimentoPH(relevantesProc, actions));
}

// ✅ só volta a chamar CYA se NÃO houve renovação
if (!temRenovacaoCYA) {
  proc.push(...procedimentoCYA(psMedidos, cliente, tacBaixa, metodoAnalise, modoTratamento, actions));
}

proc.push('');
proc.push('=== Desinfeção ===');

const pClLivreResumo = relevantesProc.find(p => normParametroNome(p.parametro) === 'cloro_livre');
const pClTotalResumo = relevantesProc.find(p => normParametroNome(p.parametro) === 'cloro_total');
const pClResumo = pClLivreResumo ?? pClTotalResumo;

const temDesinfecao =
  !!pClResumo ||
  actions.some(a =>
    a.type === 'AJUSTAR_SETPOINT_ELETROLISE' ||
    a.type === 'AJUSTAR_NIVEL_PRODUCAO_ELETROLISE' ||
    a.type === 'APLICAR_CLORO_MANUAL' ||
    a.type === 'NEUTRALIZAR_CLORO'
  );

if (bloquearQuantidadesPorCYA) {
  if (temDesinfecao) {
    proc.push('5) Desinfeção');
    proc.push(msgBloqueioCYA);
  }
} else {
  proc.push(...procedimentoDesinfeccao(relevantesProc, cliente, modoTratamento, tacBaixa));
}
const choqueLinhas = procedimentoChoque(relevantesProc, actions);
if (choqueLinhas.length) {
  proc.push('');
  proc.push('=== Choque ===');
  proc.push(...choqueLinhas);
}

// limpar linhas vazias
const procedimentoLinhas = proc
  .map(s => String(s ?? '').trim())
  .filter(Boolean);

// 🔑 devolve como string (o UI quase de certeza espera string)
const procedimento = proc.map(s => String(s ?? '').trim()).filter(Boolean);


  // ✅ mensagem existe se houver algo útil para mostrar
  const temMensagem = linhasResumo.length > 0 || procedimento.length > 0;

  // ✅ key estável (não uses Date.now)
  const keyBase = (parametros || [])
    .map((p) => {
      const nome = normParametroNome(p.parametro);
      const st = String(p.status ?? 'pendente');
      const v = String(p.valor_atual ?? '').trim();
      return `${nome}:${st}:${v}`;
    })
    .join('|');

  const key = `${empresaid}|${clienteId}|${metodoAnalise}|${modoTratamento}|${keyBase}`;
return {
  titulo,
  resumo,
  procedimento,
  debug: {
    empresaid,
    clienteId,
    metodoAnalise,
    modoTratamento,
    tac,
    tacBaixa,
    resultadosPorParametro: (parametrosFiltrados || []).map((p) => ({
      k: normParametroNome(p.parametro),
      st: (p.status ?? 'pendente'),
      atual: String((p as any).valor_atual ?? ''),
      hasResultado: !!p.resultado?.resultado,
      resultado: p.resultado?.resultado ?? null,
    })),
    actions: actions.map((a) => ({
      type: a.type,
      level: a.level,
      title: a.title,
      payload: a.payload,
    })),
  },
  temMensagem,
  key,
};

}

/* =========================================================
   (6) BLOCOS DE PROCEDIMENTO (por secção, fáceis de ajustar)
   ========================================================= */

function procedimentoDureza(parametros: Parametro[], actions: Action[]): string[] {

  const p = parametros.find(x => normParametroNome(x.parametro) === 'dureza');
  if (!p || isIgnoravel(p.status)) return [];

  const st = (p.status ?? 'pendente');

  // ✅ Se estiver "pendente" mas já dentro do ideal, não aparece
  if (st === 'pendente' && dentroDoIntervalo(p)) return [];

  // ✅ se não é problema nem foi aplicado/sem stock, não tem nada a dizer
  if (!(isProblema(st) || isAplicado(st) || st === 'sem estoque')) return [];

  const linhas: string[] = [];
  linhas.push('1) Dureza');

  const actAjustar = actions.find(a => a.type === 'AJUSTAR_DUREZA');
  const actAguardar = actions.find(
    a => a.type === 'BLOQUEIO_AGUARDAR_ESTABILIZACAO' && a.payload?.motivo === 'DUREZA'
  );

  // ✅ se não há action relevante, não diz nada
  if (!actAjustar && !actAguardar) return [];

  // ✅ 1ª linha do procedimento = a mensagem do cálculo, se existir
  if (p.resultado?.resultado) {
    linhas.push(`   - ${p.resultado.resultado}`);
  } else if (st === 'aplicado') {
    linhas.push('   - Correção aplicada.');
  } else if (st === 'sem estoque') {
    linhas.push('   - Sem stock (agendar correção).');
  } else {
    linhas.push(`   - ${fraseAcao(p)}`);
  }

    const pTAC = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  const pPH  = parametros.find(x => normParametroNome(x.parametro) === 'ph');
  const tacOuPhAtivo = isAtivoNoProcedimento(pTAC) || isAtivoNoProcedimento(pPH);

  // regra: dureza mexe em TAC/pH (sobretudo ao diminuir)
  const acao = inferirAcao(p);

  const direcao = String(actAjustar?.payload?.direcao ?? '');

// ⚠️ só quando a action diz mesmo “descer”
if (tacOuPhAtivo && direcao === 'descer') {
  linhas.push('   ⚠ Ao diminuir a dureza, a Alcalinidade (TAC) e o pH podem descer.');
  // o tempo vem do actAguardar (já adicionas em baixo)
}

  // ✅ tempo vem das Actions (12–24h)
  if (actAguardar) {
  const h1 = Number(actAguardar.payload?.horasMin);
  const h2 = Number(actAguardar.payload?.horasMax);

  if (Number.isFinite(h1) && Number.isFinite(h2)) {
    linhas.push(`   - Aguardar ${h1}–${h2}h em circulação e reavaliar.`);
  } else {
    linhas.push('   - Aguardar estabilização em circulação e reavaliar.');
  }

  const pTAC2 = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  const pPH2  = parametros.find(x => normParametroNome(x.parametro) === 'ph');
  const tacOuPhAtivo2 = isAtivoNoProcedimento(pTAC2) || isAtivoNoProcedimento(pPH2);

  // ✅ reforço só quando TAC/pH entram no procedimento nesta visita
  if (tacOuPhAtivo2) {
    linhas.push('   - Voltar a medir TAC e pH após a estabilização.');
  }
}

  return linhas;
}

function procedimentoTAC(parametros: Parametro[], actions: Action[]): string[] {
  const p = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  if (!p || isIgnoravel(p.status)) return [];

  const st = (p.status ?? 'pendente');

  // ✅ TAC pendente mas dentro do ideal => não aparece no procedimento
  if (st === 'pendente' && dentroDoIntervalo(p)) return [];

  // ✅ se não é problema nem foi aplicado/sem stock, não tem nada a dizer
  if (!(isProblema(st) || isAplicado(st) || st === 'sem estoque')) return [];

  const linhas: string[] = [];
  linhas.push('2) Alcalinidade');

  const actAjustar = actions.find(a => a.type === 'AJUSTAR_TAC');
  const actAguardar = actions.find(a => a.type === 'BLOQUEIO_AGUARDAR_ESTABILIZACAO' && a.payload?.motivo === 'TAC');

  if (!actAjustar && !actAguardar) return [];

  // ✅ 1ª linha do procedimento = a mensagem do cálculo, se existir
  // (ex.: "Adicionar X kg de …" / "Dentro do intervalo ideal")
  if (p.resultado?.resultado) {
    linhas.push(`   - ${p.resultado.resultado}`);
  } else if (st === 'aplicado') {
    linhas.push('   - Correção aplicada.');
  } else if (st === 'sem estoque') {
    linhas.push('   - Sem stock (agendar correção).');
  }

  const pPH = parametros.find(x => normParametroNome(x.parametro) === 'ph');
  const phAtivo = isAtivoNoProcedimento(pPH);

  // ✅ regras curtas só quando há ação real
  
if (actAguardar) {
  const h1 = Number(actAguardar.payload?.horasMin);
  const h2 = Number(actAguardar.payload?.horasMax);

  if (Number.isFinite(h1) && Number.isFinite(h2)) {
    linhas.push(`   - Aguardar ${h1}–${h2}h em circulação e voltar a medir TAC e pH.`);
  } else {
    linhas.push('   - Aguardar estabilização em circulação e voltar a medir TAC e pH.');
  }
}

  return linhas;
}

function procedimentoPH(parametros: Parametro[], actions: Action[]): string[] {
  const p = parametros.find(x => normParametroNome(x.parametro) === 'ph');
  if (!p || isIgnoravel(p.status)) return [];

  const st = (p.status ?? 'pendente');

  // ✅ pendente + dentro do ideal => não aparece
  if (st === 'pendente' && dentroDoIntervalo(p)) return [];

  // ✅ só interessa se há ação real / já aplicado / sem stock
  if (!(isProblema(st) || isAplicado(st) || st === 'sem estoque')) return [];

  const linhas: string[] = [];
  linhas.push('3) pH');

  // --- contexto TAC (só didático) ---
  const pTAC = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  const tacTemValor = !!pTAC && String((pTAC as any).valor_atual ?? '').trim() !== '';

  // --- actions que controlam se o pH deve aparecer / aguardar ---
  const actAjustarPH = actions.find(a => a.type === 'AJUSTAR_PH');
  const actAguardarPH = actions.find(
    a => a.type === 'BLOQUEIO_AGUARDAR_ESTABILIZACAO' && a.payload?.motivo === 'PH'
  );

  // ✅ se não há action relevante, não diz nada
  if (!actAjustarPH && !actAguardarPH) return [];

  // ✅ regra: pH depois do TAC quando TAC está a ser mexido nesta visita
  const actAjustar = actions.find(a => a.type === 'AJUSTAR_PH');
  if (!actAjustar) return [];

  const actAjustarTAC = actions.find(a => a.type === 'AJUSTAR_TAC');
  const actAguardarTAC = actions.find(
    a => a.type === 'BLOQUEIO_AGUARDAR_ESTABILIZACAO' && a.payload?.motivo === 'TAC'
  );
  if (actAjustarTAC || actAguardarTAC) {
    linhas.push('   - Regra: ajustar pH só após a Alcalinidade (TAC) estar estável.');
  }

  // ✅ 1ª linha do procedimento = resultado calculado, se existir
  if (p.resultado?.resultado) {
    linhas.push(`   - ${p.resultado.resultado}`);
  } else if (st === 'aplicado') {
    linhas.push('   - Correção aplicada.');
  } else if (st === 'sem estoque') {
    linhas.push('   - Sem stock (agendar correção).');
  } else {
    linhas.push(`   - ${fraseAcao(p)}`);
  }

  // ✅ variação pH (só alerta forte quando TAC não foi medida)
  const variacaoPH = (p as any)?.resultado?.variacaoPH;
  const variacaoRelevante = Number.isFinite(variacaoPH) && Math.abs(variacaoPH) >= 0.3;

  if (variacaoRelevante) {
    if (!tacTemValor) {
      linhas.push(`   - ΔpH ⚠ ${Number(variacaoPH).toFixed(2)} — confirmar TAC nesta visita.`);
    } else {
      linhas.push(`   - ΔpH ⚠ ${Number(variacaoPH).toFixed(2)} — monitorizar tendência (próxima visita).`);
    }
  }

  // ✅ aguardar só quando existe action de “aguardar estabilização”
  if (actAguardarPH) {
    const h1 = Number(actAguardarPH.payload?.horasMin);
    const h2 = Number(actAguardarPH.payload?.horasMax);

    if (Number.isFinite(h1) && Number.isFinite(h2)) {
      linhas.push(`   - Aguardar ${h1}–${h2}h em circulação e voltar a medir pH (e TAC).`);
    } else {
      linhas.push('   - Aguardar estabilização em circulação e voltar a medir pH (e TAC).');
    }
  }

  return linhas;
}

function procedimentoCYA(
  parametros: Parametro[],
  cliente?: Cliente | null,
  tacBaixa?: boolean,
  metodoAnalise?: string,
  modoTratamento?: ModoTratamento,
  actions: Action[] = []
): string[] {

  const p = parametros.find(x => normParametroNome(x.parametro) === 'acido_cianurico');
  if (!p || isIgnoravel(p.status)) return [];

    const st = (p.status ?? 'pendente');

  // ✅ CYA dentro do ideal só deve aparecer se houve ajuste nesta visita
  const cyaDentroIdeal = dentroDoIntervalo(p);

  const qtd = toNum((p as any)?.resultado?.quantidade);
  const temQtd = Number.isFinite(qtd) && qtd > 0;

  const temResultadoTxt = !!p.resultado?.resultado;

  const houveAjuste = isAplicado(st) && (temQtd || temResultadoTxt);

  // ✅ se está dentro do ideal e NÃO houve ajuste, não mostrar a secção CYA
  if (cyaDentroIdeal && !houveAjuste) return [];

  if (!(isProblema(p.status) || isAplicado(p.status))) return [];

  const pTAC = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  const tacAtivo = isAtivoNoProcedimento(pTAC);
  const tacMedido = !!pTAC && String(pTAC.valor_atual ?? '').trim() !== '';
  const tacOk = !!pTAC && tacMedido && dentroDoIntervalo(pTAC);


  const linhas: string[] = [];
  linhas.push('4) Ácido Cianúrico');
  const atual = toNum(p.valor_atual);
const isTratamentoCloro = modoTratamento === 'cloro';
const cyaModerado = Number.isFinite(atual) && atual > 50 && atual < 70;

  const actCritica = actions.find(a => a.type === 'ACAO_CRITICA_RENOVAR_AGUA');
const actRenovTotal = actions.find(a => a.type === 'RENOVAR_AGUA_TOTAL_CYA');
const actRenovParcial = actions.find(a => a.type === 'RENOVAR_AGUA_PARCIAL_CYA');
const actConfirmarFotometro = actions.find(
  a => a.type === 'CONFIRMAR_VALOR' && a.payload?.parametro === 'CYA'
);

if (actCritica) {
  const cyaCrit = Number(actCritica.payload?.cya);

  linhas.push(`   🚨 ALERTA CRÍTICO: Ácido Cianúrico extremamente elevado (${cyaCrit} ppm).`);
  linhas.push('   - Suspender correções químicas até resolver a renovação de água.');
  linhas.push('   - O cloro fica excessivamente bloqueado e perde eficácia de desinfeção.');
  linhas.push('   - Ação necessária: renovar a água da piscina e repetir análise completa após a renovação.');

  const vol = toNum(cliente?.volume);
  const atual = toNum(p.valor_atual);
  const alvo = toNum(p.valor_alvo);
  const troca = calcularVolumeTrocaAguaParaCYA(vol, atual, alvo);

  if (typeof troca === 'number' && troca > 0) {
    linhas.push(`   - Renovação mínima estimada: ${troca} m³ de água.`);
  }

  return linhas;
}
// 🟠 CYA 51–69 ppm -> alerta moderado, sem bloquear quantidades
if (cyaModerado) {
  linhas.push(`   🚨 ALERTA: Ácido Cianúrico acima do intervalo ideal (${atual} ppm).`);

  if (isTratamentoCloro) {
    linhas.push('   - Em piscinas tratadas a cloro, o Ácido Cianúrico tende a subir gradualmente com o uso de cloro estabilizado.');
    linhas.push('   - Quando sobe acima do ideal, começa a bloquear progressivamente a ação desinfetante do cloro.');
    linhas.push('   - Como medida imediata, substituir temporariamente o cloro estabilizado por cloro líquido sem estabilizador (CYA).');
    linhas.push('   - Se o valor continuar a subir, será necessária renovação parcial da água da piscina.');
  } else {
    linhas.push('   - O Ácido Cianúrico acima do ideal começa a reduzir a eficácia do cloro na desinfeção.');
    linhas.push('   - Monitorizar a tendência nas próximas análises.');
    linhas.push('   - Se o valor continuar a subir, considerar renovação parcial da água da piscina.');
  }

  return linhas;
}

  if (tacBaixa && tacAtivo) {
    linhas.push('   - Nota: TAC < 65. O CYA pode ser pouco fiável nesta visita.');
    linhas.push('   - Prioridade: corrigir TAC primeiro; reavaliar CYA na próxima visita (ou após estabilização).');
    return linhas;
  }

  // Se ação for descer, sugerir troca de água (sem produtos)
  const acao = inferirAcao(p);
  if (acao === 'descer') {
  const atual = toNum(p.valor_atual);
  const isFotometro = String(metodoAnalise || '').toLowerCase() === 'fotometro';

  linhas.push(`   🚨 ALERTA: Ácido Cianúrico elevado (${atual} ppm).`);

  if (isFotometro) {
    linhas.push('   - Não apresentamos quantidades de produtos enquanto o problema do Ácido Cianúrico não for resolvido.');
    linhas.push('   - Suspender correções químicas até renovar a água da piscina.');
  } else {
    linhas.push('   - Confirmar CYA com fotómetro antes de renovar a água.');
    linhas.push('   - Até à confirmação por fotómetro, não apresentamos quantidades de produtos.');
  }

  linhas.push('   - Para diminuir CYA, recomenda-se renovação parcial de água (não é correção química direta).');

  if (!tacMedido || !tacOk) {
    linhas.push('   ⚠ Antes de decidir a renovação de água, confirmar a Alcalinidade (TAC).');
    linhas.push('   - TAC baixa pode tornar o teste de CYA pouco fiável.');
    return linhas;
  }

  const vol = toNum(cliente?.volume);
  const alvo = toNum(p.valor_alvo);
  const troca = calcularVolumeTrocaAguaParaCYA(vol, atual, alvo);

  if (typeof troca === 'number' && troca > 0) {
    linhas.push(`   - Renovação mínima estimada: ${troca} m³ de água.`);
  } else {
    linhas.push('   - Renovação parcial de água necessária (calcular com base no volume e alvo).');
  }

  return linhas;
}

if (p.resultado?.resultado) {
  linhas.push(`   - ${p.resultado.resultado}`);
} else if (st === 'aplicado') {
  linhas.push('   - Correção aplicada.');
} else if (st === 'sem estoque') {
  linhas.push('   - Sem stock (agendar correção).');
} else {
  linhas.push(`   - ${fraseAcao(p)}`);
}
    // ✅ só mostra “Após ajuste…” quando houve mesmo ajuste nesta visita
  if (houveAjuste) {
    linhas.push('   - Após ajuste, aguardar estabilização e confirmar CYA na visita seguinte.');
  }

  return linhas;
}

function procedimentoDesinfeccao(
  parametros: Parametro[],
  cliente?: Cliente | null,
  modoTratamento?: ModoTratamento,
  tacBaixa?: boolean
): string[] {
  const linhas: string[] = [];

  const pCloroLivre = parametros.find(x => normParametroNome(x.parametro) === 'cloro_livre');
  
  const pSal = parametros.find(x => normParametroNome(x.parametro) === 'sal');

  const pCloroTotal = parametros.find(x => normParametroNome(x.parametro) === 'cloro_total');

  // ✅ Cloro de referência: Livre (se existir) senão Total (caso gotas)
  const pCloroRef = pCloroLivre ?? pCloroTotal;
  const cloroLabel = pCloroLivre ? 'Cloro Livre' : 'Cloro Total';

  const pTAC = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  const pCYA = parametros.find(x => normParametroNome(x.parametro) === 'acido_cianurico');
  const pPH  = parametros.find(x => normParametroNome(x.parametro) === 'ph');

  // Helper: parâmetro está "ativo" no procedimento (ação real nesta visita)
  const isAtivo = (p?: Parametro | null): boolean => {
    if (!p) return false;
    const st = (p.status ?? 'pendente');
    if (isIgnoravel(st)) return false;
    if (st === 'pendente' && dentroDoIntervalo(p)) return false;
    return (isProblema(st) || isAplicado(st) || st === 'sem estoque');
  };

  const cloroAtivo = isAtivo(pCloroRef);
  const salAtivo = isAtivo(pSal);
  if (!cloroAtivo && !salAtivo) return [];

  // ---------- thresholds (ajusta se quiseres) ----------
  const IDEAL_MAX_CLORO = 3;   // acima disto: "não adicionar"
  const EXCESSO_CLORO = 5;     // popup de excesso (já tinhas)
  const INTERDITO_CLORO = 10;  // interdição (já tinhas)

  const getNum = (v: any) => {
    const n = toNum(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const cloro = getNum(pCloroRef?.valor_atual);
  const temCloro = Number.isFinite(cloro);

  const salVal = getNum(pSal?.valor_atual);
  const temSal = Number.isFinite(salVal);

  const linhaPrincipal = (p: Parametro): string => {
    const st = (p.status ?? 'pendente');
    if (p.resultado?.resultado) return p.resultado.resultado;
    if (st === 'aplicado') return 'Correção aplicada.';
    if (st === 'sem estoque') return 'Sem stock (agendar correção).';
    return fraseAcao(p);
  };

  linhas.push('5) Desinfeção');

  // Detecta "piscina a sal"
  const piscinaSal = (modoTratamento === 'sal') || !!cliente?.eletrolise_sal;

  const appendNeutralizador = (modo: 'direto' | 'alternativa' | 'alternativa_sem_dose') => {
  const txt = pCloroRef?.resultado?.resultado;

  // ✅ caso especial: queremos SEM dose, mesmo que exista cálculo
  if (modo === 'alternativa_sem_dose') {
    linhas.push('   - Alternativa (se necessário): aplicar neutralizador de cloro.');
    return;
  }

  if (txt) {
    if (modo === 'direto') {
      // ✅ cenário forte: mostra a dose diretamente, sem “Alternativa”
      linhas.push(`   - ${txt}`);
    } else {
      // ✅ cenário moderado: fica como alternativa (com dose)
      linhas.push(`   - Alternativa (se necessário): ${txt}`);
    }
    return;
  }


  // fallback quando ainda não há cálculo
  if (modo === 'direto') {
    linhas.push('   - Aplicar neutralizador de cloro.');
  } else {
    linhas.push('   - Alternativa (se necessário): aplicar neutralizador de cloro.');
  }
};

  // ----------------------------------------------------
  // (A) PISCINA A SAL (ORP)
  // ----------------------------------------------------
  const temOrp = !!cliente?.tem_orp;
  const txtReducao = temOrp
    ? 'reduzir o setpoint da eletrólise (ORP)'
    : 'reduzir o nível de produção da eletrólise';

  if (piscinaSal) {
    const tacAtivo = isAtivo(pTAC);
    const cyaAtivo = isAtivo(pCYA);

    // 1) Sal (se estiver ativo) vem sempre primeiro
    if (salAtivo && pSal && temValor(pSal)) {
      linhas.push(`   - Sal: ${linhaPrincipal(pSal)}`);
    }
    
// 2) Contexto ORP só quando NÃO vamos escrever instruções concretas para Cloro Livre nesta visita
const cloroTemValor = !!pCloroRef && temValor(pCloroRef);

if ((tacAtivo || cyaAtivo) && !cloroTemValor) {
  linhas.push('   - Eletrólise (ORP): ajustar setpoint só após confirmar Sal, TAC e CYA.');
  if (tacBaixa && tacAtivo) {
    linhas.push('   - TAC baixo pode distorcer ORP. Corrigir TAC e reavaliar cloro.');
  }
}

    // 3) Cloro Livre (mensagem principal = setpoint; produto = plano B)
    if (cloroAtivo && pCloroRef) {
      // a) Excesso / interdição
      if (temCloro && cloro >= INTERDITO_CLORO) {
        linhas.push(`   - ${cloroLabel}: excesso (${cloro} ppm).`);
        linhas.push(`   - Ação: após confirmar Sal, TAC e CYA dentro do ideal, ${txtReducao}.`);
        appendNeutralizador('direto');
        return linhas;
      }

      // b) Excesso (>=5) mas <10  → alternativa COM dose (se existir)
if (temCloro && cloro >= EXCESSO_CLORO && cloro < INTERDITO_CLORO) {
  linhas.push(`   - ${cloroLabel}: muito alto (${cloro} ppm).`);
  linhas.push(`   - Ação: após confirmar Sal, TAC e CYA dentro do ideal, ${txtReducao}.`);
  appendNeutralizador('alternativa'); // ✅ aqui queres COM dose quando houver cálculo
  return linhas;
}


      // c) Acima do ideal (>3) mas <5 → alternativa SEM dose
if (temCloro && cloro > IDEAL_MAX_CLORO && cloro < EXCESSO_CLORO) {
  linhas.push(`   - ${cloroLabel}: acima do ideal (${cloro} ppm).`);
  linhas.push(`   - Ação: após confirmar Sal, TAC e CYA dentro do ideal, ${txtReducao}.`);
  appendNeutralizador('alternativa_sem_dose'); // ✅ como pediste
  return linhas;
}


      // d) Baixo / precisa correção (ou sem número, mas status diz que precisa)
      linhas.push(
        temCloro
          ? `   - ${cloroLabel}: baixo (${cloro} ppm).`
          : `   - ${cloroLabel}: baixo.`
      );
      linhas.push('   - Ação: aumentar setpoint da eletrólise (após confirmar Sal, TAC e CYA).');

      // Plano B: só mostra o produto se existir resultado calculado
      const produtoPlanoB = pCloroRef?.resultado?.resultado;

if (produtoPlanoB) {
  const txt = String(produtoPlanoB);

  const pareceDose = /adicionar/i.test(txt) && !/não adicionar/i.test(txt);
  if (pareceDose) {
    linhas.push(` - Se não for possível ajustar a eletrólise: ${txt}`);
  }
}


      return linhas;
    }

    return linhas;
  }

  // ----------------------------------------------------
  // (B) PISCINA A CLORO (não-sal)
  // ----------------------------------------------------
  if (cloroAtivo && pCloroRef) {
    if (temCloro && cloro >= INTERDITO_CLORO) {
  linhas.push(`   - ${cloroLabel}: excesso (${cloro} ppm). Piscina interditada a banhistas.`);
  linhas.push('   - Confirmar valor.');
  const txt = pCloroRef?.resultado?.resultado;
  if (txt) {
    linhas.push(`   - ${txt}`); // ✅ direto com dose
  } else {
    linhas.push('   - Aplicar neutralizador de cloro se necessário.');
  }
  return linhas;
}



    if (temCloro && cloro >= EXCESSO_CLORO && cloro < INTERDITO_CLORO) {
  linhas.push(`   - ${cloroLabel}: muito alto (${cloro} ppm).`);
  linhas.push('   - Confirmar valor e não adicionar cloro.');
  const txt = pCloroRef?.resultado?.resultado;
  if (txt) {
    linhas.push(`   - Alternativa (se necessário): ${txt}`); // ✅ com dose
  } else {
    linhas.push('   - Alternativa (se necessário): aplicar neutralizador de cloro.');
  }
  return linhas;
}

    if (temCloro && cloro > IDEAL_MAX_CLORO) {
      linhas.push(`   - ${cloroLabel}: acima do ideal (${cloro} ppm). Não adicionar cloro.`);
      return linhas;
    }

    // baixo: aqui sim faz sentido “produto”
    linhas.push(`   - ${cloroLabel}: ${linhaPrincipal(pCloroRef)}`);

    // aviso final só se TAC/pH estiverem ativos nesta visita
    const tacAtivo = isAtivo(pTAC);
    const phAtivo = isAtivo(pPH);
    if (tacAtivo || phAtivo) {
      linhas.push('   - Confirmar TAC e pH estáveis antes de correções finais de desinfeção.');
    }
  }

  return linhas;
}

function alertaChoque(ps: Parametro[]) {
  const pCC = getParam(ps, 'cloro_combinado');
  if (!pCC || isIgnoravel(pCC.status)) return null;

  const cc = numOrNaN((pCC as any).valor_atual);
  if (!Number.isFinite(cc) || cc <= 0.5) return null;

  const pPH = getParam(ps, 'ph');
  const ph = numOrNaN((pPH as any)?.valor_atual);

  const linhas: string[] = [];
  linhas.push(`Cloro Combinado = ${cc.toFixed(2)} ppm (> 0.5). Recomenda-se tratamento de choque.`);


  // (sem dose por agora)
  linhas.push('Dose de choque: será apresentada quando o doseamento estiver associado ao Cloro Combinado.');

  // regras curtas (as tuas)
  if (Number.isFinite(ph) && ph > 7.4) {
    linhas.push('Pré-requisito: ajustar pH para ~7.2 antes do choque.');
    linhas.push('Após pH, aguardar 30–60 min antes do choque.');
  } else {
    linhas.push('Se ajustares pH nesta visita: pH primeiro, aguardar 30–60 min, depois choque.');
  }

  linhas.push('Após choque: aguardar 12 h antes de Algicida/Floculante.');
  linhas.push('Banho interdito até Cloro Livre < 4.0 ppm.');

  return { titulo: '🚨 Tratamento de Choque Necessário', linhas, cc };
}

function procedimentoChoque(parametros: Parametro[], actions: Action[]): string[] {
  const act = actions.find(a => a.type === 'TRATAMENTO_CHOQUE_CLORAMINAS');
  if (!act) return [];

  const cc = Number(act.payload?.cc);
  const delta = Number(act.payload?.deltaBreakpoint);

  const linhas: string[] = [];
  linhas.push('6) Choque');

  if (Number.isFinite(cc)) {
    linhas.push(`- Cloro Combinado = ${cc.toFixed(2)} ppm (> 0.5).`);
  } else {
    linhas.push('- Cloro Combinado > 0.5 ppm (cloraminas).');
  }

  linhas.push('- Recomenda-se tratamento de choque.');

  if (Number.isFinite(delta)) {
    linhas.push(`- Alvo (breakpoint): aumentar Cloro Livre em ~${delta.toFixed(2)} ppm (10x o Cloro Combinado).`);
  }

  linhas.push('- Se ajustares pH nesta visita: pH primeiro, aguardar 30–60 min, depois choque.');
  linhas.push('- Após choque: aguardar 12 h antes de Algicida/Floculante.');
  linhas.push('- Banho interdito até Cloro Livre < 4.0 ppm.');

  return linhas;
}






