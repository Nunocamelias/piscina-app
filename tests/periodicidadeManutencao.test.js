'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  epocaNaData, frequenciaNaData, valorMensalidadeNaData,
  avaliarAgendaManutencao, dataLisboaISO,
} = require('../services/periodicidadeManutencao');

const contrato = {
  periodicidade: '1',
  periodicidade_verao: '1',
  periodicidade_inverno: 'quinzenal',
  mes_inicio_verao: 5,
  mes_inicio_inverno: 11,
  valor_manutencao: 160,
  valor_manutencao_verao: 160,
  valor_manutencao_inverno: 100,
};

test('seleciona corretamente as épocas de maio a outubro e novembro a abril', () => {
  assert.equal(epocaNaData(contrato, '2026-04-30'), 'inverno');
  assert.equal(epocaNaData(contrato, '2026-05-01'), 'verao');
  assert.equal(epocaNaData(contrato, '2026-10-31'), 'verao');
  assert.equal(epocaNaData(contrato, '2026-11-01'), 'inverno');
});

test('frequência sazonal com retorno à frequência geral quando não configurada', () => {
  assert.equal(frequenciaNaData(contrato, '2026-10-15'), 'semanal');
  assert.equal(frequenciaNaData(contrato, '2026-11-15'), 'quinzenal');
  assert.equal(frequenciaNaData({ ...contrato, periodicidade_inverno: null }, '2026-11-15'), 'semanal');
});

test('mensalidade de cada mês usa valor da época e não o valor do mês anterior', () => {
  assert.equal(valorMensalidadeNaData(contrato, '2026-10-01'), 160);
  assert.equal(valorMensalidadeNaData(contrato, '2026-11-01'), 100);
  assert.equal(valorMensalidadeNaData(contrato, '2026-12-01'), 100);
});

test('NULL sazonal mantém o valor contratual base e zero explícito é respeitado', () => {
  const semPrecos = { ...contrato, valor_manutencao_verao: null, valor_manutencao_inverno: null };
  assert.equal(valorMensalidadeNaData(semPrecos, '2026-11-01'), 160);
  assert.equal(valorMensalidadeNaData({ ...contrato, valor_manutencao_inverno: 0 }, '2026-11-01'), 0);
});

test('nova conclusão antecipada reinicia a previsão mantendo quinta-feira', () => {
  const semanaSemVisita = avaliarAgendaManutencao(contrato, 'Quinta-feira', '2026-11-12', '2026-11-19');
  assert.equal(semanaSemVisita.agenda_estado, 'sem_visita');
  assert.equal(semanaSemVisita.proxima_visita, '2026-11-26');
  const semanaComVisita = avaliarAgendaManutencao(contrato, 'Quinta-feira', '2026-11-12', '2026-11-26');
  assert.equal(semanaComVisita.visita_programada, true);
});

test('antecipação para quarta-feira não muda o dia habitual da equipa', () => {
  const resultado = avaliarAgendaManutencao(contrato, 'Quinta-feira', '2026-11-11', '2026-11-19');
  assert.equal(resultado.agenda_estado, 'sem_visita');
  assert.equal(resultado.proxima_visita, '2026-11-26');
});

test('data atual é interpretada com o fuso de Lisboa', () => {
  assert.equal(dataLisboaISO(new Date('2026-11-08T23:45:00Z')), '2026-11-08');
});

test('conclusão no domingo mantém a visita quinzenal de sexta-feira', () => {
  const resultado = avaliarAgendaManutencao(
    contrato,
    'Sexta-feira',
    '2026-11-08',
    '2026-11-08'
  );

  assert.equal(resultado.agenda_estado, 'concluida');
  assert.equal(resultado.proxima_visita, '2026-11-20');
});