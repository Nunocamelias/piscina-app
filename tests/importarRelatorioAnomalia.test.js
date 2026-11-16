'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { importarRelatorioAnomalia } = require('../services/importarRelatorioAnomalia');

const ana = { id: 21, nome: 'Ana', empresaid: 7, equipeid: 6, tipo_usuario: 'equipe' };
const colega = { id: 22, nome: 'Colega', empresaid: 7, equipeid: 6, tipo_usuario: 'equipe' };
const administrativo = { id: 1, nome: 'Admin', empresaid: 7, equipeid: null, tipo_usuario: 'admin' };
const outraEmpresa = { id: 30, nome: 'Outro', empresaid: 8, equipeid: 6, tipo_usuario: 'admin' };
const relatorio = {
  id: 900, cliente_id: 42, assunto: 'Relatório de Anomalia',
  mensagem: 'Bomba avariada', anexos: ['data:image/jpeg;base64,ABC'],
  criador_id: 21, empresaid: 7, equipeid: 6, tipo_usuario: 'equipe',
};

function simular({ notificacao = relatorio, existente = null, falharPrimeiraMensagem = false } = {}) {
  const chamadas = [];
  let libertado = false;
  const client = {
    async query(sql, params = []) {
      chamadas.push({ sql, params });
      if (['BEGIN','COMMIT','ROLLBACK'].includes(sql)) return { rows: [], rowCount: 0 };
      if (sql.includes('FROM notificacoes n')) {
        return { rows: notificacao ? [notificacao] : [], rowCount: notificacao ? 1 : 0 };
      }
      if (sql.includes('SELECT id, empresaid, equipeid FROM conversas_internas')) {
        return { rows: existente ? [existente] : [], rowCount: existente ? 1 : 0 };
      }
      if (sql.includes('INSERT INTO conversas_internas')) {
        return { rows: [{ id: 1200 }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO mensagens_internas')) {
        if (falharPrimeiraMensagem) throw new Error('Erro simulado na mensagem');
        return { rows: [], rowCount: 1 };
      }
      throw new Error('SQL inesperada: ' + sql);
    },
    release() { libertado = true; },
  };
  return { pool: { async connect() { return client; } }, chamadas, libertado: () => libertado };
}

test('tecnico transforma relatorio em conversa da sua equipa, com anexos originais', async () => {
  const b = simular();
  const r = await importarRelatorioAnomalia(b.pool, ana, 900);
  assert.deepEqual(r, { conversa_id: 1200, criada: true });
  const cria = b.chamadas.find(c => c.sql.includes('INSERT INTO conversas_internas'));
  assert.deepEqual(cria.params, [7, 6, 42, 900, 'Relatório de Anomalia', 21]);
  const mensagem = b.chamadas.find(c => c.sql.includes('INSERT INTO mensagens_internas'));
  assert.equal(mensagem.params[2], 'Bomba avariada');
  assert.equal(mensagem.params[3], JSON.stringify(['data:image/jpeg;base64,ABC']));
  assert.equal(b.chamadas.at(-1).sql, 'COMMIT');
  assert.equal(b.libertado(), true);
});

test('repetir a importacao nao cria outra conversa nem duplica mensagens', async () => {
  const b = simular({ existente: { id: 1200, empresaid: 7, equipeid: 6 } });
  assert.deepEqual(await importarRelatorioAnomalia(b.pool, ana, 900), { conversa_id: 1200, criada: false });
  assert.equal(b.chamadas.some(c => c.sql.includes('INSERT INTO')), false);
});

test('outro tecnico nao pode importar relatorio criado por colega', async () => {
  const b = simular();
  await assert.rejects(
    () => importarRelatorioAnomalia(b.pool, colega, 900),
    err => err.statusHttp === 404
  );
  assert.equal(b.chamadas.at(-1).sql, 'ROLLBACK');
  assert.equal(b.libertado(), true);
});

test('administracao da empresa pode associar relatorio anterior; outra empresa nao', async () => {
  const b = simular();
  assert.equal((await importarRelatorioAnomalia(b.pool, administrativo, 900)).criada, true);
  const b2 = simular({ notificacao: null });
  await assert.rejects(
    () => importarRelatorioAnomalia(b2.pool, outraEmpresa, 900),
    err => err.statusHttp === 404
  );
});

test('sem autor ou equipa valida, rejeita e nao atribui a equipa errada', async () => {
  for(const notificacao of [
    { ...relatorio, equipeid: null },
    { ...relatorio, criador_id: null },
    { ...relatorio, tipo_usuario: 'contabilidade' },
  ]) {
    const b = simular({ notificacao });
    await assert.rejects(() => importarRelatorioAnomalia(b.pool, administrativo, 900));
    assert.equal(b.chamadas.some(c => c.sql.includes('INSERT INTO')), false);
    assert.equal(b.chamadas.at(-1).sql, 'ROLLBACK');
  }
});

test('falha na gravacao da primeira mensagem faz rollback, sem conversa incompleta', async () => {
  const b = simular({ falharPrimeiraMensagem: true });
  await assert.rejects(
    () => importarRelatorioAnomalia(b.pool, ana, 900),
    /Erro simulado/
  );
  assert.equal(b.chamadas.at(-1).sql, 'ROLLBACK');
  assert.equal(b.libertado(), true);
});
