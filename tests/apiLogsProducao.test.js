'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const api = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

test('API não imprime notificações, objetos de empresa ou pedidos completos nos logs', () => {
  assert.doesNotMatch(api, /console\.log\('📥 Notificações carregadas \(únicas\):',\s*resposta\)/);
  assert.doesNotMatch(api, /console\.log\('🏢 Empresa atualizada:',\s*result\.rows\[0\]\)/);
  assert.doesNotMatch(api, /console\.(?:log|debug|info|warn)\([^\n]*,\s*req\.body\)/);
  assert.doesNotMatch(api, /console\.log\('📨 BODY:',\s*req\.body\)/);
  assert.doesNotMatch(api, /console\.log\('🛠️ SQL workflow:',\s*query,\s*'Valores:',\s*values\)/);
  assert.doesNotMatch(api, /console\.log\('🛠️ SQL \/notificacoes\/:id\/update:',\s*query,\s*'Valores:',\s*values\)/);
});

test('retorno das notificações e sinalização de erros permanecem ativos', () => {
  assert.match(api, /res\.status\(200\)\.json\(resposta\)/);
  assert.match(api, /console\.error\('❌ Erro ao buscar notificações:',\s*error\)/);
  assert.match(api, /console\.error\('❌ Erro ao atualizar empresa:',\s*error\)/);
});
