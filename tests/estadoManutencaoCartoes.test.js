'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Testes de regressão das consultas: o cron cria a manutenção no domingo,
// mas o técnico pode marcá-la como não concluída durante a semana seguinte.
const codigoAPI = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

function blocoDaRota(inicio, fim) {
  const posInicio = codigoAPI.indexOf(inicio);
  assert.notEqual(posInicio, -1, `Rota inicial não encontrada: ${inicio}`);
  const posFim = codigoAPI.indexOf(fim, posInicio + inicio.length);
  assert.notEqual(posFim, -1, `Rota final não encontrada: ${fim}`);
  return codigoAPI.slice(posInicio, posFim);
}

const domingoComEstados = /status\s+IN\s*\('pendente',\s*'nao_concluida'\)[\s\S]*?data_manutencao::date\s*=/;

test('lista diária inclui manutenção marcada não concluída após criação no domingo', () => {
  const codigo = blocoDaRota("app.get('/clientes-por-dia'", "app.post('/associar-cliente'");
  assert.match(codigo, /mm\.status\s+IN\s*\('pendente',\s*'nao_concluida'\)/);
  assert.match(codigo, domingoComEstados);
});

test('contadores diários incluem manutenção não concluída criada no domingo', () => {
  const codigo = blocoDaRota("app.get('/contador-clientes'", "app.post('/register'");
  assert.match(codigo, /mm\.status\s+IN\s*\('pendente',\s*'nao_concluida'\)/);
  assert.match(codigo, domingoComEstados);
});

test('iniciar visita quinzenal reutiliza a manutenção não concluída desta semana', () => {
  const codigo = blocoDaRota("app.post('/manutencoes/iniciar-visita'", "app.get('/manutencao-atual'");
  assert.match(codigo, /m\.status\s+IN\s*\('pendente',\s*'nao_concluida'\)/);
  assert.match(codigo, domingoComEstados);
  assert.match(codigo, /if\s*\(existente\.rowCount\)/);
});

test('mudança de concluída para não concluída limpa a data de conclusão', () => {
  const codigo = blocoDaRota("app.put('/manutencoes/:id'", "app.get('/manutencoes/:cliente_id'");
  assert.match(codigo, /WHEN\s+\$1::varchar\s+IN\s*\('pendente',\s*'nao_concluida'\)\s+AND\s+status\s*=\s*'concluida'\s+THEN\s+NULL/);
});
