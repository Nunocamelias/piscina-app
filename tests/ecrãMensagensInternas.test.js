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
  assert.match(app, /MensagensInternas: \{ conversaId\?: string \| number \} \| undefined/);
  assert.match(app, /name="MensagensInternas"\s+component=\{MensagensInternasScreen\}/);
  assert.match(app, /name="ReceberNotificacoes"\s+component=\{ReceberNotificacoesScreen\}/);
  assert.match(antigo, /const ReceberNotificacoesScreen/);
});

test('a Administração e os dois tipos de equipa conseguem abrir a nova caixa', () => {
  for (const origem of [admin, equipas, tecnicas]) {
    assert.match(origem, /navigation\.navigate\('MensagensInternas'\)/);
    assert.match(origem, /Mensagens internas/);
    assert.doesNotMatch(origem, /Mensagens internas \(teste\)/);
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

test('nova mensagem disponivel aos tecnicos com destinatario fixo e sem consultar a lista de tecnicos', () => {
  const preparar = ecrã.slice(ecrã.indexOf('const prepararNova ='), ecrã.indexOf('const criarNova ='));
  assert.ok(preparar.indexOf('if (!sessao.admin)') < preparar.indexOf("pedir('get', '/tecnicos')"));
  assert.match(preparar, /if \(!sessao\.admin\) \{\s*setNovaAberta\(true\);\s*return;/);
  assert.match(ecrã, /onPress=\{\(\) => void prepararNova\(\)\}/);
  assert.doesNotMatch(ecrã, /\{sessao\.admin && \(\s*<TouchableOpacity[^>]*prepararNova/);
  assert.match(ecrã, /<Text style=\{styles\.textoSecundario\}>Administração<\/Text>/);
  assert.match(ecrã, /\.\.\.\(sessao\.admin \? \{ todos, tecnico_id:/);
});

test('mensagem inicial permite ate duas fotografias, com rascunho separado e sem texto obrigatorio', () => {
  assert.match(ecrã, /const \[imagensNova, setImagensNova\] = useState<string\[\]>\(\[\]\)/);
  assert.match(ecrã, /destino === 'nova' \? setImagensNova : setImagensResposta/);
  assert.match(ecrã, /!textoNovo\.trim\(\) && imagensNova\.length === 0/);
  assert.match(ecrã, /anexos: \[\.\.\.imagensNova\]/);
  assert.match(ecrã, /anexarFotografia\('nova'\)/);
  assert.match(ecrã, /removerFotografia\(i, 'nova'\)/);
  assert.match(ecrã, /imagensNova\.length >= 2/);
  assert.match(ecrã, /await pedir\('post', '\/conversas', dados\)/);
});

test('cabecalho de mensagens tem a mesma cor e sombra dos restantes ecras', () => {
  const bloco = app.slice(app.indexOf('name="MensagensInternas"'), app.indexOf('name="OrcamentacaoHome"'));
  assert.match(bloco, /backgroundColor: '#22b4b4ff'/);
  assert.match(bloco, /elevation: 10/);
  assert.match(ecrã, /voltar: \{ backgroundColor: '#22b4b4ff'/);
});

test('relatorios associados sao protegidos da eliminacao e podem ser encerrados', () => {
  assert.match(ecrã, /aberta\.notificacao_origem_id == null && \(/);
  assert.match(ecrã, /Relatório de anomalia protegido/);
  assert.match(api, /dados\.rows\[0\]\.notificacao_origem_id != null/);
  assert.doesNotMatch(api, /DELETE FROM notificacoes/);
});

test('reportar anomalias tem formulario proprio sem alterar a integracao existente', () => {
  assert.match(folha, /visible=\{isReportExpanded\}/);
  assert.match(folha, /<Text style=\{styles\.relatorioTitulo\}>Reportar anomalia<\/Text>/);
  assert.match(folha, /value=\{anomaliaDescricao\}/);
  assert.match(folha, /onPress=\{confirmarEnvioRelatorio\}/);
  assert.match(folha, /Alert\.alert\('Confirmar envio do relatório'/);
  assert.match(folha, /await handleEnviarRelatorio\(\)/);
  assert.match(folha, /removerAnexoRelatorio\(index\)/);
  assert.match(folha, /assunto: 'Relatório de Anomalia'/);
});

test('cliente opcional só para administração e equipa escolhida', () => {
  assert.match(ecrã, /clientesAssociados.filter\(c => Number\(c.equipeid\) === Number\(equipeEscolhida\)\)/);
  assert.match(ecrã, /cliente_id: clienteEscolhido && !todos \? clienteEscolhido.id : undefined/);
  assert.match(ecrã, /Cliente associado \(opcional\)/);
  assert.match(ecrã, /setClienteSelecionado\(''\)/);
});

test('cartão só apresenta indicações não lidas e folha mantém as lidas até à conclusão', () => {
  const agenda = ler('screens/EquipesPiscinasPorDiaScreen.tsx');
  const hook = ler('services/useIndicacoesManutencao.ts');
  assert.match(agenda, /Number\(i.cliente_id\) === Number\(item.id\) && !i.lida/);
  assert.ok(agenda.indexOf('<IndicacaoManutencaoCard') < agenda.indexOf('item.mensagens_produtos?.pendentes?.map'));
  assert.match(folha, /!isSomenteLeitura && \(indicacoes.length > 0/);
  assert.match(folha, /indicacoes.map\(i =>/);
  assert.match(folha, /skipNextFocusReloadRef.current = true;\s*navigation.push\('MensagensInternas', \{ conversaId: i.conversa_id \}\)/);
  assert.match(agenda, /navigation.push\('MensagensInternas', \{ conversaId: i.conversa_id \}\)/);
  assert.match(ecrã, /lista.find\(c => String\(c.id\) === String\(alvoInicial\)\)/);
  assert.match(hook, /useFocusEffect/);
  assert.match(hook, /Authorization: 'Bearer ' \+ token/);
  assert.match(hook, /setInterval\(/);
  assert.doesNotMatch(hook, /setItem\(/);
});
