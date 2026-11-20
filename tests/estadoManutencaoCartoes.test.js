'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const codigoAPI = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

function blocoDaRota(inicio, fim) {
  const posInicio = codigoAPI.indexOf(inicio);
  assert.notEqual(posInicio, -1, `Rota inicial não encontrada: ${inicio}`);
  const posFim = codigoAPI.indexOf(fim, posInicio + inicio.length);
  assert.notEqual(posFim, -1, `Rota final não encontrada: ${fim}`);
  return codigoAPI.slice(posInicio, posFim);
}

const lista = blocoDaRota("app.get('/clientes-por-dia'", "app.post('/associar-cliente'");
const contador = blocoDaRota("app.get('/contador-clientes'", "app.post('/register'");
const iniciarVisita = blocoDaRota("app.post('/manutencoes/iniciar-visita'", "app.get('/manutencao-atual'");
const folha = blocoDaRota("app.get('/manutencao-atual'", "app.put('/manutencoes/:clienteId/confirmar-periodica'");
const reset = blocoDaRota("async function resetStatusEmpresa(empresaid)", "app.post('/reset-status'");

test('lista e contadores reconhecem domingo anterior em qualquer estado', () => {
  assert.match(lista, /mm\.data_manutencao::date = date_trunc\('week', \$4::date\)::date - 1/);
  assert.match(contador, /mm\.data_manutencao::date = date_trunc\('week', \$3::date\)::date - 1/);
  assert.doesNotMatch(lista, /mm\.status IN \('pendente', 'nao_concluida'\)/);
  assert.doesNotMatch(contador, /mm\.status IN \('pendente', 'nao_concluida'\)/);
});

test('lista, contadores e folha usam a semana de abertura e não data_conclusao', () => {
  for (const codigo of [lista, contador, iniciarVisita]) {
    const inicio = codigo.indexOf('data_manutencao::date BETWEEN');
    assert.notEqual(inicio, -1);
    const trecho = codigo.slice(inicio, inicio + 420);
    assert.doesNotMatch(trecho, /data_conclusao::date BETWEEN/);
  }
  const consulta = folha.slice(folha.indexOf('const manutencaoQuery ='), folha.indexOf('const manutencaoResult ='));
  assert.match(consulta, /data_manutencao::date BETWEEN/);
  assert.match(consulta, /data_manutencao::date = date_trunc\('week', \$4::date\)::date - 1/);
  assert.doesNotMatch(consulta, /data_conclusao/);
});

test('conclusão da visita criada ao domingo não permite outra criação na mesma semana', () => {
  const consulta = folha.slice(folha.indexOf('const manutencaoQuery ='), folha.indexOf('const manutencaoResult ='));
  assert.doesNotMatch(consulta, /status\s+IN|status\s*=/);
  assert.match(folha, /if \(manutencaoResult\.rows\.length === 0\)/);
  assert.match(folha, /FOR UPDATE/);
  assert.match(folha, /await client\.query\('COMMIT'\)/);
  assert.match(folha, /await client\.query\('ROLLBACK'\)/);
});

test('antecipação quinzenal reutiliza a visita existente mesmo se já concluída', () => {
  assert.match(iniciarVisita, /m\.data_manutencao::date = \$5::date - 1/);
  assert.match(iniciarVisita, /if \(existente\.rowCount\)/);
  assert.match(iniciarVisita, /existente\.rows\[0\]\.status === 'concluida'/);
});

test('reset cria novas visitas a partir das associações e não só das concluídas', () => {
  assert.match(reset, /FROM associados a/);
  assert.match(reset, /LEFT JOIN LATERAL/);
  assert.doesNotMatch(reset, /WHERE m\.status = 'concluida'/);
  assert.match(reset, /status_semana_anterior === 'nao_concluida'/);
  assert.match(reset, /if \(agenda\.frequencia === 'quinzenal' && !agenda\.visita_programada\) continue/);
});

test('reset é idempotente e verifica visita existente antes de inserir', () => {
  assert.match(reset, /FOR UPDATE/);
  assert.match(reset, /if \(existente\.rowCount\) continue/);
  assert.match(reset, /data_manutencao::date = \$5::date - 1/);
});

test('novas visitas recuperam a última medição real, sem N/A artificial', () => {
  for (const codigo of [folha, reset]) {
    assert.match(codigo, /historico\.status = 'concluida'/);
    assert.match(codigo, /mp\.valor_atual IS NOT NULL/);
    assert.match(codigo, /anterior\.valor_atual/);
  }
});

test('alterar concluída para não concluída limpa a data da conclusão', () => {
  const codigo = blocoDaRota("app.put('/manutencoes/:id'", "app.get('/manutencoes/:cliente_id'");
  assert.match(codigo, /WHEN\s+\$1::varchar\s+IN\s*\('pendente',\s*'nao_concluida'\)\s+AND\s+status\s*=\s*'concluida'\s+THEN\s+NULL/);
});

test('cartão não concluído mantém o fundo vermelho dentro da mesma semana', () => {
  const codigoCartao = fs.readFileSync(path.join(__dirname, '..', 'screens', 'EquipesPiscinasPorDiaScreen.tsx'), 'utf8');
  assert.match(codigoCartao, /item\.status === 'nao_concluida' && styles\.cardNaoConcluida/);
  assert.match(codigoCartao, /backgroundColor: '#FFB3B3'/);
});

test('reset antecipado cria data da próxima semana e domingo mantém a hora real', () => {
  assert.match(reset, /const hojeLisboa = dataLisboaISO\(\)/);
  assert.match(reset, /const dataCriacaoAntecipada = moment\(hojeLisboa, 'YYYY-MM-DD'\)\.isoWeekday\(\) === 7/);
  assert.match(reset, /\? null\s*: semanaAlvo/);
  assert.match(reset, /COALESCE\(\$7::timestamp, NOW\(\)\)/);
  assert.match(reset, /metodo, modo, dataCriacaoAntecipada\]/);
});
