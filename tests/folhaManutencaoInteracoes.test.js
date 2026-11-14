'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const folha = fs.readFileSync(
  path.join(__dirname, '..', 'screens', 'FolhaManutencaoScreen.tsx'),
  'utf8'
);

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
