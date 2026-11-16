'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resumoNaoLidas, chegaramMensagensNovas } = require('../services/resumoNaoLidas');

test('o contador soma apenas mensagens validas e por assunto', () => {
  assert.deepEqual(resumoNaoLidas([
    { id: 1, nao_lidas: '2' }, { id: 2, nao_lidas: 1 },
    { id: 3, nao_lidas: -5 }, { id: 'abc', nao_lidas: 3 },
  ]), { total: 3, porAssunto: { 1: 2, 2: 1 } });
});

test('nao avisa na primeira leitura nem com contagem igual ou inferior', () => {
  const anterior = resumoNaoLidas([{ id: 1, nao_lidas: 2 }]);
  assert.equal(chegaramMensagensNovas(null, anterior), false);
  assert.equal(chegaramMensagensNovas(anterior, anterior), false);
  assert.equal(chegaramMensagensNovas(anterior, resumoNaoLidas([{ id: 1, nao_lidas: 0 }])), false);
});

test('deteta uma nova mensagem mesmo quando outro assunto foi lido', () => {
  const antes = resumoNaoLidas([{ id: 1, nao_lidas: 2 }, { id: 2, nao_lidas: 1 }]);
  // Foi lida uma mensagem no assunto 1 e chegou uma nova no assunto 2.
  // O total permanece igual (3), mas devemos detetar a mensagem nova.
  const depois = resumoNaoLidas([{ id: 1, nao_lidas: 1 }, { id: 2, nao_lidas: 2 }]);
  assert.equal(antes.total, depois.total);
  assert.equal(chegaramMensagensNovas(antes, depois), true);
});

test('uma conversa nova com mensagens por ler e detetada', () => {
  assert.equal(chegaramMensagensNovas(
    resumoNaoLidas([]),
    resumoNaoLidas([{ id: 58, nao_lidas: 1 }])
  ), true);
});
