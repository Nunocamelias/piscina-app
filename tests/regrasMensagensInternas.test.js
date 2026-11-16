'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  inteiroPositivo, eAdministrador, eTecnico, podeLerConversa,
  podeGerirConversa, validarConteudoMensagem,
} = require('../services/regrasMensagensInternas');

const admin = { id: 1, empresaid: 7, tipo_usuario: 'admin', equipeid: null };
const tecnicoA = { id: 21, empresaid: 7, tipo_usuario: 'equipa_manutencao', equipeid: 6 };
const tecnicoB = { id: 22, empresaid: 7, tipo_usuario: 'equipe', equipeid: 6 };
const equipaOutra = { id: 23, empresaid: 7, tipo_usuario: 'equipe', equipeid: 8 };
const tecnicoOutraEmpresa = { id: 24, empresaid: 9, tipo_usuario: 'equipe', equipeid: 6 };
const contabilidade = { id: 25, empresaid: 7, tipo_usuario: 'contabilidade', equipeid: 6 };
const assunto = { id: 100, empresaid: 7, equipeid: 6, estado: 'em_resolucao' };

test('os dois tecnicos da mesma equipa podem ler e responder ao mesmo assunto', () => {
  assert.equal(podeLerConversa(tecnicoA, assunto), true);
  assert.equal(podeLerConversa(tecnicoB, assunto), true);
  assert.equal(eTecnico(tecnicoA), true);
  assert.equal(eTecnico(tecnicoB), true);
});

test('equipa diferente, outra empresa e outros departamentos nao acedem', () => {
  assert.equal(podeLerConversa(equipaOutra, assunto), false);
  assert.equal(podeLerConversa(tecnicoOutraEmpresa, assunto), false);
  assert.equal(podeLerConversa(contabilidade, assunto), false);
  assert.equal(podeLerConversa({ ...tecnicoA, equipeid: null }, assunto), false);
  assert.equal(podeLerConversa(null, assunto), false);
  assert.equal(podeLerConversa({ ...admin, empresaid: null }, { ...assunto, empresaid: null }), false);
});

test('administracao da empresa pode gerir; tecnico nunca apaga nem resolve', () => {
  assert.equal(eAdministrador(admin), true);
  assert.equal(podeLerConversa(admin, assunto), true);
  assert.equal(podeGerirConversa(admin, assunto), true);
  assert.equal(podeGerirConversa(tecnicoA, assunto), false);
  assert.equal(podeGerirConversa({ ...admin, empresaid: 9 }, assunto), false);
});

test('IDs invalidos nunca passam validacao', () => {
  for (const valor of [0, -2, 'abc', null, undefined, true, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(inteiroPositivo(valor), null);
  }
  assert.equal(inteiroPositivo('6'), 6);
});

test('mensagem pode ter texto ou fotografias HTTPS, sem exigir ambos', () => {
  assert.deepEqual(validarConteudoMensagem('  Ok, vou desmontar  ', []), {
    texto: 'Ok, vou desmontar', anexos: [],
  });
  assert.deepEqual(validarConteudoMensagem('', ['https://exemplo.pt/foto.jpg']), {
    texto: null, anexos: ['https://exemplo.pt/foto.jpg'],
  });
  assert.ok(validarConteudoMensagem('', []).erro);
  assert.ok(validarConteudoMensagem('a'.repeat(5001), []).erro);
  assert.ok(validarConteudoMensagem('Foto', ['data:image/png;base64,AAAA']).erro);
  assert.ok(validarConteudoMensagem('Foto', Array(9).fill('https://exemplo.pt/x')).erro);
});

test('resposta aceita duas fotografias JPEG comprimidas mas recusa ficheiros perigosos', () => {
  const foto = 'data:image/jpeg;base64,' + 'QUJD'.repeat(50);
  assert.deepEqual(validarConteudoMensagem('', [foto, foto]), {
    texto: null, anexos: [foto, foto],
  });
  assert.ok(validarConteudoMensagem('Ok', [foto, foto, foto]).erro);
  assert.ok(validarConteudoMensagem('Ok', ['data:text/html;base64,QUJD']).erro);
  assert.ok(validarConteudoMensagem('Ok', ['data:image/jpeg;base64,not_valid']).erro);
  assert.ok(validarConteudoMensagem('Ok', ['data:image/jpeg;base64,' + 'QUJD'.repeat(600000)]).erro);
});
