'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const folha = fs.readFileSync(
  path.join(__dirname, '..', 'screens', 'FolhaManutencaoScreen.tsx'),
  'utf8'
).replace(/\r\n/g, '\n');

const entre = (inicio, fim) => {
  const a = folha.indexOf(inicio);
  const b = folha.indexOf(fim, a + inicio.length);
  assert.ok(a >= 0 && b > a, 'Bloco de código não encontrado');
  return folha.slice(a, b);
};

test('cartões só fecham ao entrar na folha, não ao receber cache ou API', () => {
  const carregamento = entre('const fetchDadosManutencao = useCallback', 'useFocusEffect(');
  const foco = entre('useFocusEffect(', 'const registrarStatusParametro');

  assert.doesNotMatch(carregamento, /collapseAllParams\(\)/);
  assert.match(foco, /skipNextFocusReloadRef\.current[\s\S]*?return;/);
  assert.match(foco, /collapseAllParams\(\);\s*fetchDadosManutencao\(\);/);
});

test('as três respostas assíncronas não substituem edições feitas entretanto', () => {
  const carregamento = entre('const fetchDadosManutencao = useCallback', 'useFocusEffect(');
  assert.match(carregamento, /const versaoInicial = versaoEdicaoLocalRef\.current/);
  const guardas = carregamento.match(/if \(versaoEdicaoLocalRef\.current !== versaoInicial\) return prev;/g) || [];
  assert.equal(guardas.length, 3, 'cache, API e ausência de parâmetros devem estar protegidos');

  assert.match(folha, /skipNextFocusReloadRef\.current = true;[^\n]*\n\s*versaoEdicaoLocalRef\.current \+= 1;/);
  assert.match(
    entre('const calcularUmParametro = useCallback', 'const mostrarProximoPasso'),
    /versaoEdicaoLocalRef\.current \+= 1;\s*resultadoDoCalculoAtualRef\.current = true;\s*setParametrosQuimicos/
  );
  assert.match(
    entre('const mostrarConteudo = isExpanded', '{/* ✅ Cloro Combinado (dentro do Cloro Total) */}'),
    /versaoEdicaoLocalRef\.current \+= 1;\s*setParametrosQuimicos\(\(prev\) =>/
  );
});

test('Calcular Todos só abre procedimento com cálculo novo e não com resultado antigo', () => {
  const calculos = entre('const calcularTodos = useCallback', 'const parametrosParaMensagens');
  const procedimento = entre('useEffect(() => {\n  if (!abrirProcedimentoAposCalcular)', 'const getCorData');

  assert.match(calculos, /'Nada para calcular'[\s\S]*?return false;/);
  assert.match(calculos, /resultadoDoCalculoAtualRef\.current = false;/);
  assert.match(calculos, /if \(iniciou\) setAbrirProcedimentoAposCalcular\(true\);/);
  assert.match(procedimento, /if \(!resultadoDoCalculoAtualRef\.current\) return;/);
  assert.match(procedimento, /abrirProcedimento\(\);[\s\S]*?resultadoDoCalculoAtualRef\.current = false;/);
});

test('Info só sinaliza texto novo após cálculo, nunca apenas por digitação', () => {
  const calcularUm = entre('const calcularUmParametro = useCallback', 'const mostrarProximoPasso');
  const aviso = entre('const assinaturaInfo = useMemo', 'const abrirProcedimento = useCallback');
  const edicao = entre("placeholder=\"Ex: 1.5\"", '{/* ✅ Cloro Combinado (dentro do Cloro Total) */}');

  assert.match(calcularUm, /setVersaoCalculoInfo\(\(versao\) => versao \+ 1\)/);
  assert.match(aviso, /JSON\.stringify\(\[msg\.titulo, msg\.resumo, msg\.procedimento\]\)/);
  assert.match(aviso, /versaoCalculoInfo === ultimaVersaoCalculoInfoRef\.current\) return;/);
  assert.match(aviso, /jaExistiaCalculo/);
  assert.match(aviso, /if \(assinaturaInfo && assinaturaInfo !== anterior\)/);
  assert.match(aviso, /setInfoNaoLida\(true\)/);
  assert.doesNotMatch(edicao, /setVersaoCalculoInfo/);
});

test('Info assinala por três pulsos e mantém indicação até consultar', () => {
  const animacao = entre('useEffect(() => {\n  if (pulsoInfo === 0)', 'const abrirProcedimento = useCallback');
  const abrir = entre('const abrirProcedimento = useCallback', 'useEffect(() => {\n  if (!abrirProcedimentoAposCalcular)');
  const botao = entre('const renderBotaoInfo = (flutuante:', 'return (\n  <>\n  <View ref={areaInfoRef}');

  assert.match(animacao, /Animated\.loop\(/);
  assert.match(animacao, /iterations: 3/);
  assert.match(animacao, /useNativeDriver: true/);
  assert.match(abrir, /ultimaAssinaturaInfoRef\.current = JSON\.stringify/);
  assert.match(abrir, /setInfoNaoLida\(false\)/);
  assert.match(abrir, /animacaoPulsoInfoRef\.current\?\.stop\(\)/);
  assert.match(botao, /infoNaoLida && <View pointerEvents="none" style=\{styles\.infoPontoNovo\}/);
  assert.match(botao, /styles\.infoMolduraVerde/);
});

test('Info flutua no canto superior direito sem deslocar os outros dois botões', () => {
  const posicao = entre('const atualizarPosicaoInfo = useCallback', 'const renderBotaoInfo = (flutuante:');
  const botoes = entre('<View style={styles.acoesRow}>', '{isParametrosExpanded && parametrosOrdenados.length > 0 ? (');
  assert.match(posicao, /measureInWindow/);
  assert.match(posicao, /topoAreaInfoRef\.current \+ 8/);
  assert.match(posicao, /setInfoFlutuante/);
  assert.match(folha, /<FlatList\s+onScroll=\{atualizarPosicaoInfo\}/);
  assert.match(folha, /\{infoFlutuante && \(\s*<View style=\{styles\.botaoInfoFlutuante\}>/);
  assert.match(botoes, /styles\.testeRapidoBtn/);
  assert.match(botoes, /styles\.calcularTodosBtn/);
  assert.match(botoes, /\{renderBotaoInfo\(false\)\}/);
  assert.doesNotMatch(botoes, /setInfoFlutuante/);
  assert.match(folha, /botaoInfoFlutuante:\s*\{[\s\S]*?position: 'absolute',[\s\S]*?top: 8,[\s\S]*?right: 28/);
});

test('Info original mantém as dimensões e flutuante tem fundo opaco', () => {
  const botao = entre('botaoProcedimento: {', 'botaoProcedimentoTxt: {');
  assert.match(botao, /width: 65/);
  assert.match(botao, /height: 42/);
  assert.match(botao, /borderRadius: 12/);
  assert.match(folha, /botaoInfoSemMargem: \{ marginBottom: 0, backgroundColor: '#ECECEC' \}/);
  assert.match(folha, /!flutuante && infoFlutuante && styles\.botaoInfoOculto/);
  assert.match(folha, /disabled=\{!flutuante && infoFlutuante\}/);
});

test('botões de ação alinham com Último, Atual e Calcular, mantendo botão isolado', () => {
  const campos = entre('rowInputs: {', 'colorRow: {');
  const calcular = entre('buttonCalcular: {', '// ✅ Linha 2 (o bloco do slider)');
  const botoes = entre('actionButtons: {', 'button: {');
  const botoesJSX = entre('{/* ✅ Botões de Ação (mantidos) */}', '{/* ✅ Botão Validar Dentro do Intervalo Ideal */}');
  const avisoCloro = entre('{/* Aviso operacional: mantém-se visível', '{/* ✅ Mensagem do Resultado (mantida) */}');

  assert.match(campos, /gap: 10/);
  assert.match(calcular, /height: 44/);
  assert.match(calcular, /minWidth: 92/);
  assert.match(botoes, /gap: 10/);
  assert.match(botoes, /botaoAcaoAlturaAlinhada: \{[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?marginHorizontal: 0/);
  assert.match(botoes, /botaoDecisaoAlinhado: \{[\s\S]*?flex: 0,[\s\S]*?width: 92,[\s\S]*?height: 44/);
  assert.match(botoesJSX, /style=\{\[styles\.buttonAplicado, styles\.botaoAcaoAlturaAlinhada\]\}/);
  assert.match(botoesJSX, /style=\{\[styles\.buttonSemEstoque, styles\.botaoAcaoAlturaAlinhada\]\}/);
  assert.match(botoesJSX, /style=\{\[styles\.buttonDecisaoTecnica, styles\.botaoDecisaoAlinhado\]\}/);
  assert.match(botoesJSX, /\{'Decisão\\ntécnica'\}/);
  assert.match(avisoCloro, /style=\{styles\.buttonDecisaoTecnica\}/);
});
