'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ler = ficheiro => fs.readFileSync(path.join(__dirname, '..', ficheiro), 'utf8');
const app = ler('App.tsx');
const vigia = ler('components/VigiarMensagensEmPrimeiroPlano.tsx');
const contexto = ler('services/ContextoNaoLidas.tsx');
const indicador = ler('components/IndicadorNaoLidas.tsx');
const admin = ler('screens/AdministracaoScreen.tsx');
const manutencao = ler('screens/EquipeHomeScreen.tsx');
const tecnica = ler('screens/EquipeTecHomeScreen.tsx');

test('avisos de mensagens novas sao globais e nao obrigam a ficar na caixa de entrada', () => {
  assert.match(app, /<NavigationContainer[\s\S]*<Stack.Navigator/);
  assert.match(app, /<VigiarMensagensEmPrimeiroPlano/);
  assert.match(app, /<FornecedorNaoLidas value=\{naoLidas\}>/);
  assert.match(app, /navigationRef\.dispatch\(StackActions\.push\('MensagensInternas'\)\)/);
  assert.match(app, /Nova mensagem interna/);
});

test('o contador das mensagens e partilhado nos tres menus', () => {
  assert.match(contexto, /createContext\(0\)/);
  assert.match(indicador, /useNaoLidasMensagens\(\)/);
  for (const ficheiro of [admin, manutencao, tecnica]) {
    assert.match(ficheiro, /import IndicadorNaoLidas from '\.\.\/components\/IndicadorNaoLidas'/);
    assert.match(ficheiro, /<IndicadorNaoLidas \/>/);
  }
});

test('a vigia so consulta com a app ativa e em sessao autenticada', () => {
  assert.match(vigia, /AppState\.currentState !== 'active'/);
  assert.match(vigia, /if \(!ativado\)/);
  assert.match(vigia, /await AsyncStorage\.multiGet\(\['authToken', 'userId'\]\)/);
  assert.match(vigia, /Authorization: 'Bearer ' \+ token/);
  assert.match(vigia, /setInterval\(\(\) => \{ void atualizar\(\); \}, 30000\)/);
  assert.match(vigia, /subscricao\.remove\(\)/);
});

test('tokens invalidados nao causam pedidos repetidos ao servidor', () => {
  assert.match(vigia, /erro\.response\?\.status === 401/);
  assert.match(vigia, /bloqueadoRef\.current === identidade/);
  assert.match(vigia, /identidade !== identidadeRef\.current/);
});

test('nao introduz dependencia Firebase nem servico Android em background', () => {
  assert.doesNotMatch(vigia, /firebase|setBackgroundMessageHandler|Sound\.play|Vibration\.vibrate/i);
  assert.match(vigia, /const anterior = resumoRef\.current/);
  assert.match(vigia, /chegaramMensagensNovas\(anterior, seguinte\)/);
  assert.match(app, /rotaAtual !== 'Login' && rotaAtual !== 'MensagensInternas'/);
});

test('indicador persistente no cabecalho usa o contador global e abre a caixa sem perder o ecra anterior', () => {
  assert.match(app, /const CabecalhoMensagens = \(\) => \{/);
  assert.match(app, /const total = useNaoLidasMensagens\(\)/);
  assert.match(app, /if \(total <= 0\) return null/);
  assert.match(app, /onPress=\{abrirCaixaMensagens\}/);
  assert.match(app, /headerRight: route\.name === 'Login' \|\| route\.name === 'MensagensInternas'\s*\? undefined : CabecalhoMensagens/);
  assert.match(app, /StackActions\.push\('MensagensInternas'\)/);
});
