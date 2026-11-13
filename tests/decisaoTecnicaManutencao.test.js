'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const api = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');
const folha = fs.readFileSync(path.join(__dirname, '..', 'screens', 'FolhaManutencaoScreen.tsx'), 'utf8');
const historico = require('../services/historicoProdutosCartoes');

test('decisao tecnica usa estado proprio e motivo obrigatorio sem nova tabela', () => {
  const rota = api.split("app.post('/manutencoes_parametros'")[1].split("app.get('/manutencoes_parametros'")[0];
  assert.match(rota, /'decisao_tecnica'/);
  assert.match(rota, /motivo\.trim\(\)\.length < 5/);
  assert.match(rota, /motivo\.trim\(\)\.length > 500/);
  assert.match(rota, /m\.empresaid = \$3/);
  assert.match(rota, /EXCLUDED\.status = 'decisao_tecnica' THEN NULL/);
  assert.match(rota, /EXCLUDED\.status = 'decisao_tecnica' THEN 0/);
  assert.match(rota, /motivo = EXCLUDED\.motivo/);
});

test('reabrir folha mostra motivo e nao afirma que produto foi aplicado', () => {
  const rota = api.split("app.get('/manutencao-atual'")[1].split("app.put('/manutencoes/:clienteId/confirmar-periodica'")[0];
  assert.match(rota, /parametro\.status === 'decisao_tecnica'/);
  assert.match(rota, /parametro\.motivo/);
  assert.match(folha, /item\.status === 'decisao_tecnica'/);
  assert.match(folha, /item\.motivo/);
});

test('concluir manutencao aceita decisao tecnica como validacao final', () => {
  const ocorrencias = (folha.match(/p\.status === 'decisao_tecnica'/g) || []).length;
  assert.ok(ocorrencias >= 2);
  assert.match(folha, /STATUS_BLOQUEIA_ACOES = \['aplicado', 'sem estoque', 'nao necessario', 'decisao_tecnica'\]/);
});

test('mensagens amarelas nao persistem depois de uma decisao tecnica posterior', () => {
  assert.match(historico.SQL_HISTORICO_PRODUTOS, /'sem estoque', 'aplicado', 'nao necessario', 'decisao_tecnica'/);
  assert.match(historico.SQL_HISTORICO_PRODUTOS, /WHERE uv\.status = 'sem estoque'/);
});

test('validacao simples deixa de abrir popup de sucesso', () => {
  const registar = folha.split('const registrarStatusParametro = async (')[1].split('type ResultadoCalculo =')[0];
  assert.doesNotMatch(registar, /Alert\.alert\('Sucesso'/);
  const botaoValidar = folha.split('{/* ✅ Botão Validar Dentro do Intervalo Ideal */}')[1].split('{/* ✅ Botão Validar (exceção')[0];
  assert.doesNotMatch(botaoValidar, /Alert\.alert\('Sucesso'/);
  assert.match(botaoValidar, /await registrarStatusParametro\(item, 'nao necessario'\)/);
});

test('aviso do controlador pH aparece na confirmacao da alcalinidade com minimo 48 horas', () => {
  assert.match(folha, /norm\(item\.parametro\) === 'alcalinidade'/);
  assert.match(folha, /controlador automático de pH/);
  assert.match(folha, /pelo menos 48 h/);
  assert.match(folha, /nova verificação do pH e da alcalinidade/);
});

test('motivos dependem de pH, cloro alto e eletrólise com ou sem ORP', () => {
  assert.match(folha, /Aguardar estabilização após correção da alcalinidade/);
  assert.match(folha, /Produção do eletrólisador reduzida/);
  assert.match(folha, /Setpoint ORP ajustado/);
  assert.match(folha, /Horário de funcionamento do eletrólisador reduzido/);
  assert.match(folha, /Outro motivo/);
  assert.match(folha, /Alert\.alert\(\s*'Confirmar decisão técnica'/);
});

test('Calcular Todos permanece intacto e terceira opcao usa UI Android', () => {
  assert.match(folha, /const calcularTodos = useCallback/);
  assert.match(folha, /const handleCalcularTodos = useCallback/);
  assert.match(folha, /<Modal/);
  assert.match(folha, /<TextInput[\s\S]*?outroMotivoDecisao/);
  assert.match(folha, /Decisão técnica<\/Text>/);
});
