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
  | 'LAVAGEM_FILTRO'
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

function buildActions(input: {
  cliente?: Cliente | null;
  modoTratamento?: ModoTratamento;
  parametros: Parametro[];
  tacBaixa?: boolean;
}): Action[] {
  const { cliente, modoTratamento, parametros, tacBaixa } = input;
  const actions: Action[] = [];

  const get = (k: string) => parametros.find(p => normParametroNome(p.parametro) === k);

  const pCl = get('cloro_livre');
  const pCya = get('acido_cianurico');
  const pTac = get('alcalinidade');

  const cl = pCl ? toNum(String(pCl.valor_atual ?? '').trim()) : NaN;
  const cya = pCya ? toNum(String(pCya.valor_atual ?? '').trim()) : NaN;
  const tac = pTac ? toNum(String(pTac.valor_atual ?? '').trim()) : NaN;

  const isSal = (modoTratamento === 'sal') || !!cliente?.eletrolise_sal;
  const temOrp = !!cliente?.tem_orp;

  // 🔴 Bloqueio por cloro muito alto (manténs também os Alerts por agora)
  if (Number.isFinite(cl) && cl >= 10) {
    actions.push(A('BLOQUEIO_INTERDICAO_BANHO', 0, 'Piscina interdita (cloro muito alto)', { cl }));
  }

  // 🟠 CYA alto -> renovação água (nota: se não tens TAC medido, pedimos medir/confirmar)
  // (aqui NÃO calculo m3 ainda; só levo dados para as mensagens atuais consumirem depois)
  const cyaMin = toNum(pCya?.valor_minimo);
  const cyaMax = toNum(pCya?.valor_maximo);

  const cyaAlto =
    Number.isFinite(cya) &&
    Number.isFinite(cyaMax) &&
    cya > cyaMax;

  if (cyaAlto) {
    const tacTemValor = Number.isFinite(tac);

    if (!tacTemValor) {
      actions.push(A('MEDIR_VALOR', 1, 'Medir TAC antes de decidir renovação de água', { parametro: 'TAC' }));
      actions.push(A('RENOVAR_AGUA_PARCIAL_CYA', 1, 'Renovação de água (CYA alto)', { cya, precisaConfirmarTAC: true }));
    } else {
      // recomendado: total, mínimo: parcial (a mensagem final decide o copy)
      actions.push(A('RENOVAR_AGUA_TOTAL_CYA', 1, 'Recomenda-se renovação total (CYA alto)', { cya, tac }));
      actions.push(A('RENOVAR_AGUA_PARCIAL_CYA', 1, 'No mínimo renovação parcial (CYA alto)', { cya, tac }));
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


const obrigatorios = new Set(['ph', 'cloro_livre']); // se quiseres incluir cloro_total em gotas, diz-me

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
  if (k === 'cloro_total') continue;

  if (k === 'cloro_combinado') {
    const cc = numOrNaN((p as any).valor_atual);
    if (!Number.isFinite(cc) || cc <= 0.5) continue;
  }
  const nome = labelParametro(p.parametro);
  const atual =
  p.valor_atual == null || String(p.valor_atual).trim() === ''
    ? '—'
    : String(p.valor_atual);

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

// ✅ linha final curta (sem (st) e sem (subir/descer))
linhasResumo.push(`• ${icon} ${nome}: ${atual} — ${linhaExtra}`);
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


proc.push('=== Equilíbrio da água ===');
proc.push(...procedimentoDureza(relevantesProc));
proc.push(...procedimentoTAC(relevantesProc));
proc.push(...procedimentoPH(relevantesProc));
proc.push(...procedimentoCYA(psMedidos, cliente, tacBaixa));


proc.push('');
proc.push('=== Desinfeção ===');
proc.push(...procedimentoDesinfeccao(relevantesProc, cliente, modoTratamento, tacBaixa));

// ✅ NOVO: Choque (só aparece se Cloro Combinado > 0.5)
const choqueLinhas = procedimentoChoque(relevantesProc);
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

function procedimentoDureza(parametros: Parametro[]): string[] {
  const p = parametros.find(x => normParametroNome(x.parametro) === 'dureza');
  if (!p || isIgnoravel(p.status)) return [];

  const st = (p.status ?? 'pendente');

  // ✅ Se estiver "pendente" mas já dentro do ideal, não aparece
  if (st === 'pendente' && dentroDoIntervalo(p)) return [];

  // ✅ se não é problema nem foi aplicado/sem stock, não tem nada a dizer
  if (!(isProblema(st) || isAplicado(st) || st === 'sem estoque')) return [];

  const linhas: string[] = [];
  linhas.push('1) Dureza');

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

  // regra: dureza mexe em TAC/pH (quando se diminui) ou estabiliza (quando se aumenta)
  const acao = inferirAcao(p);
if (tacOuPhAtivo && acao === 'descer') {
  linhas.push('   ⚠️ Ao diminuir a dureza, a Alcalinidade e o pH podem descer;');
  linhas.push('   Aguardar 12–24h em circulação e voltar a medir TAC e pH.');
} else if (tacOuPhAtivo && acao === 'subir') {
  linhas.push('   - Após correção, aguardar 2–4 horas e reavaliar antes de avançar para TAC/pH.');
} else if (acao === 'subir' || acao === 'descer') {
  // ✅ opcional: mensagem neutra, sem falar em TAC/pH
  linhas.push('   - Após correção, aguardar 2–4 horas em circulação e reavaliar.');
}
  return linhas;
}

function procedimentoTAC(parametros: Parametro[]): string[] {
  const p = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  if (!p || isIgnoravel(p.status)) return [];

  const st = (p.status ?? 'pendente');

  // ✅ TAC pendente mas dentro do ideal => não aparece no procedimento
  if (st === 'pendente' && dentroDoIntervalo(p)) return [];

  // ✅ se não é problema nem foi aplicado/sem stock, não tem nada a dizer
  if (!(isProblema(st) || isAplicado(st) || st === 'sem estoque')) return [];

  const linhas: string[] = [];
  linhas.push('2) Alcalinidade');

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
  const acao = inferirAcao(p);
if (phAtivo && acao === 'subir') {
  linhas.push('   - Aumentar TAC tende a subir o pH. Reavaliar pH depois.');
  linhas.push('   - Aguardar 4–6h em circulação e voltar a medir TAC e pH.');
} else if (phAtivo && acao === 'descer') {
  linhas.push('   - Diminuir TAC tende a descer o pH. Reavaliar pH depois.');
  linhas.push('   - Aguardar 4–6h em circulação e voltar a medir TAC e pH.');
} else if (acao === 'subir' || acao === 'descer') {
  // ✅ opcional: manter só as linhas “neutras” sem falar no pH
  linhas.push('   - Aguardar 4–6h em circulação e voltar a medir TAC e pH.');
}

  return linhas;
}

function procedimentoPH(parametros: Parametro[]): string[] {
  const p = parametros.find(x => normParametroNome(x.parametro) === 'ph');
  if (!p || isIgnoravel(p.status)) return [];

  const st = (p.status ?? 'pendente');
  if (st === 'pendente' && dentroDoIntervalo(p)) return [];
  if (!(isProblema(st) || isAplicado(st) || st === 'sem estoque')) return [];

  const pTAC = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  const tacAtivo = isAtivoNoProcedimento(pTAC);

  // ✅ NOVO: TAC foi medido nesta visita? (tem valor_atual preenchido)
  const tacTemValor = !!pTAC && String(pTAC.valor_atual ?? '').trim() !== '';

  // ✅ NOVO: ler variacaoPH guardada no resultado do pH
  const variacaoPH = (p as any)?.resultado?.variacaoPH;
  const variacaoRelevante = Number.isFinite(variacaoPH) && Math.abs(variacaoPH) >= 0.3;


  const linhas: string[] = [];
  linhas.push('3) pH');

  // ✅ só fala de TAC se TAC estiver ativo nesta visita
  if (tacAtivo) {
    linhas.push('   - Regra: pH só deve ser ajustado após a Alcalinidade (TAC) estar estável.');
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
  // ✅ Exceção: variação grande de pH só interessa se TAC NÃO foi medido
  if (variacaoRelevante) {
  if (!tacTemValor) {
    linhas.push(` ΔpH ⚠ ${Number(variacaoPH).toFixed(2)} — confirmar TAC nesta visita.`);
  } else {
    linhas.push(` ΔpH ⚠ ${Number(variacaoPH).toFixed(2)} — monitorizar tendência (próxima visita).`);
  }
}


  // ✅ só mostra este aviso se TAC estiver ativo (senão não faz sentido)
  if (tacAtivo) {
    linhas.push('   - Se TAC foi ajustada hoje, aguardar 2–4 horas em circulação - Reavaliar e corrigir pH.');
  }

  return linhas;
}

function procedimentoCYA(parametros: Parametro[], cliente?: Cliente | null, tacBaixa?: boolean): string[] {
  const p = parametros.find(x => normParametroNome(x.parametro) === 'acido_cianurico');
  if (!p || isIgnoravel(p.status)) return [];
  if (!(isProblema(p.status) || isAplicado(p.status))) return [];

  const pTAC = parametros.find(x => normParametroNome(x.parametro) === 'alcalinidade');
  const tacAtivo = isAtivoNoProcedimento(pTAC);
  const tacMedido = !!pTAC && String(pTAC.valor_atual ?? '').trim() !== '';
  const tacOk = !!pTAC && tacMedido && dentroDoIntervalo(pTAC);


  const linhas: string[] = [];
  linhas.push('4) Ácido Cianúrico');

  if (tacBaixa && tacAtivo) {
    linhas.push('   - Nota: TAC < 65. O CYA pode ser pouco fiável nesta visita.');
    linhas.push('   - Prioridade: corrigir TAC primeiro; reavaliar CYA na próxima visita (ou após estabilização).');
    return linhas;
  }

  // Se ação for descer, sugerir troca de água (sem produtos)
  const acao = inferirAcao(p);
  if (acao === 'descer') {
  linhas.push('   - Para diminuir CYA, recomenda-se renovação parcial de água (não é correção química direta).');

  // ✅ Só damos m³ se TAC foi medido e está dentro do ideal
  if (!tacMedido || !tacOk) {
    linhas.push('   ⚠ Antes de decidir a renovação de água, confirmar a Alcalinidade (TAC).');
    linhas.push('   - TAC baixa pode tornar o teste de CYA pouco fiável.');
    return linhas;
  }

  const vol = toNum(cliente?.volume);
  const atual = toNum(p.valor_atual);
  const alvo = toNum(p.valor_alvo);

  const troca = calcularVolumeTrocaAguaParaCYA(vol, atual, alvo);
  if (typeof troca === 'number' && troca > 0) {
    linhas.push(`   - Sugestão: renovar aproximadamente ${troca} m³ de água (com base no volume e alvo).`);
  } else {
    linhas.push('   - Sugestão: calcular percentagem de renovação com base no volume e no alvo definido.');
  }

  return linhas;
}

  const st = (p.status ?? 'pendente');
if (p.resultado?.resultado) {
  linhas.push(`   - ${p.resultado.resultado}`);
} else if (st === 'aplicado') {
  linhas.push('   - Correção aplicada.');
} else if (st === 'sem estoque') {
  linhas.push('   - Sem stock (agendar correção).');
} else {
  linhas.push(`   - ${fraseAcao(p)}`);
}
  linhas.push('   - Após ajuste, aguardar estabilização e confirmar CYA na visita seguinte.');

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

  const cloroAtivo = isAtivo(pCloroLivre);
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

  const cloro = getNum(pCloroLivre?.valor_atual);
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

  const appendAlternativaNeutralizador = () => {
  const txt = pCloroLivre?.resultado?.resultado;

  // Se existir cálculo (normalmente já traz quantidade + produto)
  if (txt) {
    linhas.push(`   - Alternativa (se necessário): ${txt}`);
    return;
  }

  // Fallback curto (quando ainda não há doseamento)
  linhas.push('   - Alternativa (se necessário): aplicar neutralizador de cloro.');
};


  // ----------------------------------------------------
  // (A) PISCINA A SAL (ORP)
  // ----------------------------------------------------
  if (piscinaSal) {
    const tacAtivo = isAtivo(pTAC);
    const cyaAtivo = isAtivo(pCYA);

    // 1) Sal (se estiver ativo) vem sempre primeiro
    if (salAtivo && pSal && temValor(pSal)) {
      linhas.push(`   - Sal: ${linhaPrincipal(pSal)}`);
    }

    
const cloroLivreTemValor = !!pCloroLivre && temValor(pCloroLivre);

// 2) Contexto ORP só quando NÃO vamos dar já instrução concreta de cloro/setpoint
if ((tacAtivo || cyaAtivo) && !cloroLivreTemValor) {
  linhas.push('   - Eletrólise (ORP): ajustar setpoint só após confirmar Sal, TAC e CYA.');
  if (tacBaixa && tacAtivo) {
    linhas.push('   - TAC baixo pode distorcer ORP. Corrigir TAC e reavaliar cloro.');
  }
}


    // 3) Cloro Livre (mensagem principal = setpoint; produto = plano B)
    if (cloroAtivo && pCloroLivre) {
      // a) Muito alto / interdição
      if (temCloro && cloro >= INTERDITO_CLORO) {
        linhas.push(`   - Cloro Livre: muito alto (${cloro}).`);
        linhas.push('   - Ação: após confirmar Sal, TAC e CYA dentro do ideal, reduzir setpoint da eletrólise (ORP).');
        appendAlternativaNeutralizador();
        return linhas;
      }

      // b) Excesso (>=5) mas <10
      if (temCloro && cloro >= EXCESSO_CLORO) {
        linhas.push(`   - Cloro Livre: excesso (${cloro}).`);
        linhas.push('   - Ação: após confirmar Sal, TAC e CYA dentro do ideal, reduzir setpoint da eletrólise (ORP).');
        appendAlternativaNeutralizador();

        return linhas;
      }

      // c) Acima do ideal (>3) mas abaixo de excesso
      if (temCloro && cloro > IDEAL_MAX_CLORO) {
        linhas.push(`   - Cloro Livre: acima do ideal (${cloro}).`);
        linhas.push('   - Ação: após confirmar Sal, TAC e CYA dentro do ideal, reduzir setpoint da eletrólise (ORP).');
        return linhas;
      }

      // d) Baixo / precisa correção (ou sem número, mas status diz que precisa)
      linhas.push(
        temCloro
          ? `   - Cloro Livre: baixo (${cloro} ppm).`
          : '   - Cloro Livre: baixo.'
      );
      linhas.push('   - Ação: aumentar setpoint da eletrólise (após confirmar Sal, TAC e CYA).');

      // Plano B: só mostra o produto se existir resultado calculado
      const produtoPlanoB = pCloroLivre?.resultado?.resultado;
      if (produtoPlanoB) {
        linhas.push(` - Se não for possível ajustar a eletrólise: ${produtoPlanoB}`);
      }

      return linhas;
    }

    return linhas;
  }

  // ----------------------------------------------------
  // (B) PISCINA A CLORO (não-sal)
  // ----------------------------------------------------
  if (cloroAtivo && pCloroLivre) {
    if (temCloro && cloro >= INTERDITO_CLORO) {
      linhas.push(`   - Cloro Livre: muito alto (${cloro}). Piscina interditada a banhistas.`);
      linhas.push(' - Confirmar valor.');
// ✅ se a Folha calculou neutralizador, aparece aqui com quantidade
if (pCloroLivre?.resultado?.resultado) {
  linhas.push(` - ${pCloroLivre.resultado.resultado}`);
} else {
  linhas.push(' - Aplicar neutralizador se necessário.');
}
return linhas;

    }

    if (temCloro && cloro >= EXCESSO_CLORO) {
      linhas.push(`   - Cloro Livre: excesso (${cloro}).`);
      linhas.push('   - Confirmar valor e não adicionar cloro.');
      return linhas;
    }

    if (temCloro && cloro > IDEAL_MAX_CLORO) {
      linhas.push(`   - Cloro Livre: acima do ideal (${cloro}). Não adicionar cloro.`);
      return linhas;
    }

    // baixo: aqui sim faz sentido “produto”
    linhas.push(`   - Cloro Livre: ${linhaPrincipal(pCloroLivre)}`);

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

function procedimentoChoque(ps: Parametro[]): string[] {
  const choque = alertaChoque(ps);
  if (!choque) return [];

  const linhas: string[] = [];
  linhas.push('6) Choque');
  choque.linhas.forEach(l => linhas.push(`   - ${l}`));
  return linhas;
}





