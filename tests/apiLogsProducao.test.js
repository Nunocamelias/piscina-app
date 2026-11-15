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

test('consultas normais e snapshots ISL não inundam os logs', () => {
  assert.doesNotMatch(api, /console\.log\('\[DEBUG\] /);
  assert.doesNotMatch(api, /console\.log\('Recebido equipeId:/);
  assert.doesNotMatch(api, /console\.log\('Recebendo os parâmetros:/);
  assert.doesNotMatch(api, /console\.log\('Nenhuma manutenção encontrada/);
  assert.doesNotMatch(api, /console\.log\('Parâmetros padrão adicionados/);
  assert.doesNotMatch(api, /console\.log\('[^']*\[ISL SNAPSHOT\]/);
  assert.doesNotMatch(api, /console\.debug\('🛠️ Executando query de inserção/);
});

test('logs de arranque, reset, mensalidades e erros continuam disponíveis', () => {
  assert.match(api, /console\.log\('🕒 Iniciando reset automático semanal/);
  assert.match(api, /console\.log\('✅ Reset automático concluído/);
  assert.match(api, /console\.log\('✅ Mensalidades lançadas com sucesso/);
  assert.match(api, /console\.log\(`API rodando na porta/);
  assert.match(api, /console\.error\('❌ Erro no cron semanal:', error\)/);
  assert.match(api, /console\.error\('Erro ao buscar ou criar manutenção:', error\)/);
});

test('logótipo e fotografias continuam disponíveis sem impressão integral na consola', () => {
  assert.match(api, /logo = COALESCE\(\$5, logo\)/);
  assert.match(api, /empresa: result\.rows\[0\]/);
  assert.match(api, /const buffer = Buffer\.from\(base64Limpo, 'base64'\)/);
  assert.match(api, /console\.error\('Erro ao enviar fotografia:', uploadError\)/);
  assert.doesNotMatch(api, /console\.log\([^\n]*\blogo\b/);
  assert.doesNotMatch(api, /console\.log\([^\n]*\bimagem_base64\b/);
});

test('avisos de validação não imprimem valores enviados e erros continuam identificáveis', () => {
  assert.doesNotMatch(api, /console\.warn\('⚠️ Empresaid inválido:', empresaid\)/);
  assert.doesNotMatch(api, /console\.warn\('⚠️ Data inválida para próxima inspeção:', proxima_inspecao\)/);
  assert.doesNotMatch(api, /console\.warn\('⚠️ Data inválida para validade do seguro:', validade_seguro\)/);
  assert.doesNotMatch(api, /console\.error\('🔥 STACK:', error\?\.stack\)/);
  assert.match(api, /console\.error\('🔥 ERRO \/orcamento-aprovado:', error\)/);
  assert.match(api, /console\.error\('❌ Erro ao registrar status do parâmetro:', error\)/);
});
