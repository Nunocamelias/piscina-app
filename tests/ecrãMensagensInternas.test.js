'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ler = nome => fs.readFileSync(path.join(__dirname, '..', nome), 'utf8');
const app = ler('App.tsx');
const ecrã = ler('screens/MensagensInternasScreen.tsx');
const admin = ler('screens/AdministracaoScreen.tsx');
const equipas = ler('screens/EquipeHomeScreen.tsx');
const tecnicas = ler('screens/EquipeTecHomeScreen.tsx');
const antigo = ler('screens/ReceberNotificacoesScreen.tsx');
const folha = ler('screens/FolhaManutencaoScreen.tsx');
const api = ler('routes/mensagensInternas.js');
const apiPrincipal = ler('api.js');

test('a navegação regista o novo ecrã sem substituir o ecrã antigo', () => {
  assert.match(app, /import MensagensInternasScreen from '\.\/screens\/MensagensInternasScreen'/);
  assert.match(app, /MensagensInternas: undefined/);
  assert.match(app, /name="MensagensInternas"\s+component=\{MensagensInternasScreen\}/);
  assert.match(app, /name="ReceberNotificacoes"\s+component=\{ReceberNotificacoesScreen\}/);
  assert.match(antigo, /const ReceberNotificacoesScreen/);
});

test('a Administração e os dois tipos de equipa conseguem abrir a nova caixa', () => {
  for (const origem of [admin, equipas, tecnicas]) {
    assert.match(origem, /navigation\.navigate\('MensagensInternas'\)/);
    assert.match(origem, /Mensagens internas \(teste\)/);
  }
});

test('o envio de anomalias da folha continua a usar a rota antiga', () => {
  assert.match(folha, /const handleEnviarRelatorio = async/);
  assert.match(folha, /axios\.post\(\`\$\{Config\.API_URL\}\/notificacoes\`, dadosEnvio\)/);
  assert.match(folha, /anexos: imagensAnexadas\.length > 0 \? imagensAnexadas/);
});

test('as chamadas novas enviam o token e não confiam no empresaid do telemóvel', () => {
  assert.match(ecrã, /AsyncStorage\.multiGet\(\['authToken', 'userId', 'tipo_usuario'\]\)/);
  assert.match(ecrã, /Authorization: 'Bearer ' \+ sessao\.token/);
  assert.match(api, /jwt\.verify\(bearer\[1\], segredo/);
  assert.match(api, /WHERE id = \$1 AND empresaid = \$2/);
});

test('o ecrã mostra mensagens não lidas e regista leitura por utilizador', () => {
  assert.match(ecrã, /Number\(item\.nao_lidas\) > 0/);
  assert.match(ecrã, /await pedir\('post', caminho \+ '\/ler'\)/);
  assert.match(ecrã, /leitores\.map\(leitura => leitura\.nome/);
  assert.match(api, /INSERT INTO leituras_mensagens_internas/);
});

test('só a Administração pode usar resolver, reabrir e apagar na nova interface', () => {
  assert.match(ecrã, /\{sessao\.admin && \(/);
  assert.match(ecrã, /const apagarConversa = \(\) =>/);
  assert.match(ecrã, /if \(!aberta \|\| !sessao\?\.admin\) return/);
  assert.match(api, /Apenas a Administração pode apagar conversas/);
  assert.match(ecrã, /Alert\.alert\('Apagar conversa'/);
  assert.match(ecrã, /Alert\.alert\('Confirmar resposta'/);
  assert.match(ecrã, /Alert\.alert\('Confirmar envio'/);
});

test('o ecrã apenas atualiza enquanto aberto; ainda não anuncia push sonoro', () => {
  assert.match(ecrã, /useFocusEffect\(/);
  assert.match(ecrã, /setInterval\(\(\) =>/);
  assert.doesNotMatch(ecrã, /FirebaseMessaging|createNotificationChannel|Sound\.play\(/);
});

test('relatorio guardado e associado por identificador, sem criar um novo relatorio', () => {
  assert.match(folha, /const response = await axios\.post\(\`\$\{Config\.API_URL\}\/notificacoes\`, dadosEnvio\)/);
  assert.match(folha, /const notificacaoId = Number\(response\.data\?\.notificacao\?\.id\)/);
  assert.match(folha, /\/mensagens-internas\/conversas\/importar-anomalia/);
  assert.match(folha, /notificacao_id: notificacaoId/);
  assert.match(folha, /Authorization: \`Bearer \$\{token\}\`/);
  assert.match(folha, /catch \(erroAssociacao: unknown\)/);
  assert.match(folha, /o relatório continua disponível nas notificações antigas/);
});

test('falhas nao despejam o objeto do relatorio com fotografias nos logs', () => {
  assert.doesNotMatch(folha, /console\.log\('📩 Enviando relatório com os seguintes dados:', dadosEnvio\)/);
  assert.doesNotMatch(folha, /console\.error\('❌ Erro ao enviar relatório:', error\)/);
  assert.match(folha, /Falha no envio do relatório:.*response\?\.status/);
});

test('login exige chave JWT configurada e emite sessão de 16 horas', () => {
  assert.match(apiPrincipal, /const segredoJwt = process\.env\.JWT_SECRET/);
  assert.match(apiPrincipal, /if \(!segredoJwt\)/);
  assert.match(apiPrincipal, /error: 'Autenticacao temporariamente indisponivel/);
  assert.match(apiPrincipal, /algorithm: 'HS256', expiresIn: '16h'/);
  assert.doesNotMatch(apiPrincipal, /JWT_SECRET\s*\|\|\s*'secreto'/);
});

test('mensagens recebidas enquanto o assunto esta aberto sao marcadas como lidas', () => {
  assert.match(ecrã, /carregarMensagens\(conversaRef\.current, true, true\)/);
  assert.match(ecrã, /marcarLeitura && conversaRef\.current === String\(conversaId\)/);
  assert.match(ecrã, /await pedir\('post', caminho \+ '\/ler'\)/);
});

test('respostas podem incluir fotografias e mantêm confirmação antes de enviar', () => {
  assert.match(ecrã, /import ImageResizer from 'react-native-image-resizer'/);
  assert.match(ecrã, /DocumentPicker\.pick\(/);
  assert.match(ecrã, /ImageResizer\.createResizedImage/);
  assert.match(ecrã, /const imagem = 'data:image\/jpeg;base64,' \+ base64/);
  assert.match(ecrã, /mensagem: texto, anexos/);
  assert.match(ecrã, /Alert\.alert\('Confirmar resposta'/);
  assert.match(ecrã, /Alert\.alert\('Remover fotografia'/);
});
