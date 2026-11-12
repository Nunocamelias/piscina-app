'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { confirmarPendenciaProduto } = require('../services/confirmarPendenciaProduto');
const {
  organizarMensagensProdutos, SQL_HISTORICO_PRODUTOS,
} = require('../services/historicoProdutosCartoes');

function simularBD({ origemStatus = 'sem estoque', idUltimo = 123, jaAplicado = false, falharInsert = false } = {}) {
  const consultas = [];
  let libertou = false;
  const client = {
    async query(sql, params) {
      consultas.push({ sql, params });
      if (/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)) return { rows: [], rowCount: 0 };
      if (/FOR UPDATE OF mp/.test(sql)) {
        return origemStatus === null
          ? { rows: [], rowCount: 0 }
          : { rows: [{ id: 123, parametro: 'Alcalinidade', status: origemStatus, cliente_id: 51 }], rowCount: 1 };
      }
      if (/SELECT mp.id\s+FROM manutencoes m/.test(sql)) {
        return { rows: [{ id: idUltimo }], rowCount: 1 };
      }
      if (/SELECT id\s+FROM confirmacoes_pendencias_produtos/.test(sql)) {
        return jaAplicado
          ? { rows: [{ id: 1 }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      if (/INSERT INTO confirmacoes_pendencias_produtos/.test(sql)) {
        if (falharInsert) throw new Error('Falha simulada na BD');
        return { rows: [{ id: 1, estado: params[2], confirmado_em: '2026-11-12 18:00:00' }], rowCount: 1 };
      }
      throw new Error('Consulta inesperada');
    },
    release() { libertou = true; },
  };
  return {
    pool: { async connect() { return client; } },
    consultas,
    libertou: () => libertou,
  };
}

test('aplicar resolve a pendencia por identificador e preserva o historico', async () => {
  const bd = simularBD();
  const r = await confirmarPendenciaProduto(bd.pool, { empresaid: 7, registoId: 123, estado: 'aplicado' });
  assert.equal(r.estado, 'aplicado');
  assert.deepEqual(bd.consultas[bd.consultas.length - 2].params, [7, 123, 'aplicado']);
  assert.equal(bd.consultas[0].sql, 'BEGIN');
  assert.equal(bd.consultas[bd.consultas.length - 1].sql, 'COMMIT');
  assert.equal(bd.libertou(), true);
  assert.ok(!bd.consultas.some(q => /^\s*UPDATE\s+manutencoes/i.test(q.sql)));
  assert.ok(!bd.consultas.some(q => /^\s*UPDATE\s+manutencoes_parametros/i.test(q.sql)));
});

test('sem stock regista confirmacao e deixa pendencia por resolver', async () => {
  const bd = simularBD();
  const r = await confirmarPendenciaProduto(bd.pool, { empresaid: 7, registoId: 123, estado: 'sem estoque' });
  assert.equal(r.estado, 'sem estoque');
  assert.deepEqual(bd.consultas[bd.consultas.length - 2].params, [7, 123, 'sem estoque']);
});

test('empresa, aviso e estado invalidos sao recusados antes de consultar a BD', async () => {
  const bd = simularBD();
  for (const a of [
    { empresaid: 0, registoId: 123, estado: 'aplicado' },
    { empresaid: 7, registoId: -1, estado: 'aplicado' },
    { empresaid: 7, registoId: 123, estado: 'nao necessario' },
  ]) {
    await assert.rejects(() => confirmarPendenciaProduto(bd.pool, a), e => e.statusHttp === 400);
  }
  assert.equal(bd.consultas.length, 0);
});

test('pendencia inexistente ou de outra empresa nao pode ser confirmada', async () => {
  const bd = simularBD({ origemStatus: null });
  await assert.rejects(
    () => confirmarPendenciaProduto(bd.pool, { empresaid: 7, registoId: 123, estado: 'aplicado' }),
    e => e.statusHttp === 404
  );
  assert.equal(bd.consultas.at(-1).sql, 'ROLLBACK');
});

test('aviso desatualizado ou ja aplicado nao pode ser confirmado', async () => {
  for (const cfg of [
    { origemStatus: 'aplicado' },
    { idUltimo: 999 },
    { jaAplicado: true },
  ]) {
    const bd = simularBD(cfg);
    await assert.rejects(
      () => confirmarPendenciaProduto(bd.pool, { empresaid: 7, registoId: 123, estado: 'aplicado' }),
      e => e.statusHttp === 409
    );
    assert.equal(bd.consultas.at(-1).sql, 'ROLLBACK');
  }
});

test('erro ao inserir faz rollback e liberta a ligacao', async () => {
  const bd = simularBD({ falharInsert: true });
  await assert.rejects(
    () => confirmarPendenciaProduto(bd.pool, { empresaid: 7, registoId: 123, estado: 'aplicado' }),
    /Falha simulada/
  );
  assert.equal(bd.consultas.at(-1).sql, 'ROLLBACK');
  assert.equal(bd.libertou(), true);
});

test('aviso identifica o registo original e a SQL oculta aplicacoes confirmadas', () => {
  const pendentes = organizarMensagensProdutos([{
    cliente_id: 51, registo_id: 123, tipo: 'pendente',
    parametro: 'Alcalinidade', produto_usado: 'CTX-21', quantidade_usada: 3,
  }]);
  assert.equal(pendentes[51].pendentes[0].registo_id, 123);
  assert.match(SQL_HISTORICO_PRODUTOS, /mp\.id AS registo_id/);
  assert.match(SQL_HISTORICO_PRODUTOS, /NOT EXISTS\s*\(\s*SELECT 1 FROM confirmacoes_pendencias_produtos/);
  assert.match(SQL_HISTORICO_PRODUTOS, /cp\.manutencao_parametro_id = uv\.registo_id/);
  assert.match(SQL_HISTORICO_PRODUTOS, /cp\.estado = 'aplicado'/);
});
