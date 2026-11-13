'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatarQuantidadeProduto,
  organizarMensagensProdutos,
  consultarMensagensProdutos,
  SQL_HISTORICO_PRODUTOS,
} = require('../services/historicoProdutosCartoes');

test('quantidades: abaixo de 1 kg em gramas, a partir de 1 kg com tres casas decimais', () => {
  assert.equal(formatarQuantidadeProduto('0.25'), '250 g');
  assert.equal(formatarQuantidadeProduto('0.001'), '1 g');
  assert.equal(formatarQuantidadeProduto('1.25'), '1,250 kg');
  assert.equal(formatarQuantidadeProduto(3), '3,000 kg');
  assert.equal(formatarQuantidadeProduto(null), null);
  assert.equal(formatarQuantidadeProduto(-3), null);
  assert.equal(formatarQuantidadeProduto('invalido'), null);
});

test('mostra amarelos pendentes antigos e verdes aplicados da ultima visita', () => {
  // A falta de Alca+ ocorreu numa visita anterior; na última visita não
  // houve uma validação posterior da alcalinidade que a resolvesse.
  const resumo = organizarMensagensProdutos([
    { cliente_id: 12, tipo: 'pendente', parametro: 'Alcalinidade', produto_usado: 'Alca+', quantidade_usada: '3' },
    { cliente_id: 12, tipo: 'aplicado', parametro: 'Cloro Livre em ppm', produto_usado: 'Cloro Rápido', quantidade_usada: '0.5' },
    { cliente_id: 19, tipo: 'aplicado', parametro: 'pH', produto_usado: 'pH-', quantidade_usada: '1.25' },
  ]);

  assert.deepEqual(resumo[12], {
    pendentes: [{ parametro: 'Alcalinidade', produto: 'Alca+', quantidade: '3,000 kg' }],
    aplicados: [{ parametro: 'Cloro Livre em ppm', produto: 'Cloro Rápido', quantidade: '500 g' }],
  });
  assert.equal(resumo[19].pendentes.length, 0);
  assert.equal(resumo[19].aplicados[0].quantidade, '1,250 kg');
});

test('a API ignora produtos sem nome, quantidades vazias e estados sem acao', () => {
  const resumo = organizarMensagensProdutos([
    { cliente_id: 7, tipo: 'pendente', parametro: 'pH', produto_usado: '', quantidade_usada: 2 },
    { cliente_id: 7, tipo: 'aplicado', parametro: 'pH', produto_usado: 'pH+', quantidade_usada: 0 },
    { cliente_id: 7, tipo: 'nao necessario', parametro: 'Cloro', produto_usado: 'Cloro', quantidade_usada: 1 },
    { cliente_id: 7, tipo: 'aplicado', parametro: 'Cloro', produto_usado: 'Cloro', quantidade_usada: '0.25' },
  ]);
  assert.equal(resumo[7].pendentes.length, 0);
  assert.deepEqual(resumo[7].aplicados, [
    { parametro: 'Cloro', produto: 'Cloro', quantidade: '250 g' },
  ]);
});

test('sem clientes nao faz consulta a base de dados', async () => {
  const pool = { query: () => { throw new Error('Consulta nao esperada'); } };
  assert.deepEqual({ ...await consultarMensagensProdutos(pool, 2, []) }, {});
});

test('consulta historico com empresa e conjunto de clientes isolados', async () => {
  let chamada;
  const pool = { query: async (sql, params) => {
    chamada = { sql, params };
    return { rows: [{ cliente_id: 12, tipo: 'pendente', parametro: 'Alcalinidade', produto_usado: 'Alca+', quantidade_usada: 3 }] };
  } };
  const resumo = await consultarMensagensProdutos(pool, 2, [12, 13]);
  assert.deepEqual(chamada.params, [2, [12, 13]]);
  assert.equal(chamada.sql, SQL_HISTORICO_PRODUTOS);
  assert.match(chamada.sql, /mp\.empresaid\s*=\s*m\.empresaid/);
  assert.match(chamada.sql, /m\.empresaid\s*=\s*\$1/);
  assert.match(chamada.sql, /m\.status\s*=\s*'concluida'/);
  assert.match(chamada.sql, /DISTINCT ON \(m\.cliente_id, mp\.parametro\)/);
  assert.match(chamada.sql, /mp\.status IN \('sem estoque', 'aplicado', 'nao necessario', 'decisao_tecnica'\)/);
  assert.equal(resumo[12].pendentes[0].produto, 'Alca+');
});

test('o estado validado posteriormente determina se a falta de stock continua', () => {
  // A SQL devolve apenas a validação mais recente por cliente e parâmetro:
  // - "sem estoque": mantém o aviso;
  // - "aplicado" ou "nao necessario": já não devolve pendência.
  const pendente = organizarMensagensProdutos([
    { cliente_id: 4, tipo: 'pendente', parametro: 'Alcalinidade', produto_usado: 'Alca+', quantidade_usada: 3 },
  ]);
  const resolvido = organizarMensagensProdutos([
    { cliente_id: 4, tipo: 'aplicado', parametro: 'Alcalinidade', produto_usado: 'Alca+', quantidade_usada: 3 },
  ]);
  assert.equal(pendente[4].pendentes.length, 1);
  assert.equal(resolvido[4].pendentes.length, 0);
  assert.equal(resolvido[4].aplicados.length, 1);
});


test('mensagem verde inclui data da ultima manutencao concluida e amarelo nao muda', () => {
  const resumo = organizarMensagensProdutos([
    { cliente_id: 22, tipo: 'aplicado', data_visita: '29/10/2026', parametro: 'pH', produto_usado: 'pH-', quantidade_usada: '0.5' },
    { cliente_id: 22, tipo: 'pendente', data_visita: '22/10/2026', registo_id: 101, parametro: 'Alcalinidade', produto_usado: 'Alca+', quantidade_usada: 2 },
  ]);
  assert.equal(resumo[22].aplicados[0].data_visita, '29/10/2026');
  assert.equal(resumo[22].pendentes[0].data_visita, undefined);
  assert.match(SQL_HISTORICO_PRODUTOS, /TO_CHAR\(u\.data_visita, 'DD\/MM\/YYYY'\) AS data_visita/);
  assert.match(SQL_HISTORICO_PRODUTOS, /m\.status = 'concluida'/);
});

test('data ausente ou invalida nao inventa uma data para a ultima manutencao', () => {
  const resumo = organizarMensagensProdutos([
    { cliente_id: 30, tipo: 'aplicado', parametro: 'pH', produto_usado: 'pH-', quantidade_usada: 1 },
    { cliente_id: 30, tipo: 'aplicado', data_visita: '2026-10-29', parametro: 'Alcalinidade', produto_usado: 'Alca+', quantidade_usada: 1 },
  ]);
  assert.ok(resumo[30].aplicados.every((p) => !Object.prototype.hasOwnProperty.call(p, 'data_visita')));
});


test('decisao tecnica posterior encerra pendencia sem criar mensagem verde ou amarela', () => {
  // A consulta seleciona a validação mais recente, incluindo 'decisao_tecnica'.
  // Como só 'sem estoque' produz amarelos e a aplicação só surge da visita
  // realmente concluída, nenhuma mensagem de produto é fabricada.
  assert.match(SQL_HISTORICO_PRODUTOS, /mp\.status IN \('sem estoque', 'aplicado', 'nao necessario', 'decisao_tecnica'\)/);
  assert.match(SQL_HISTORICO_PRODUTOS, /WHERE uv\.status = 'sem estoque'/);
  assert.match(SQL_HISTORICO_PRODUTOS, /WHERE mp\.status = 'aplicado'/);
  const resumo = organizarMensagensProdutos([]);
  assert.equal(resumo[42], undefined);
});
