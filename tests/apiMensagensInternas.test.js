'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { criarRouterMensagensInternas } = require('../routes/mensagensInternas');

const SEGREDO = 'segredo-de-teste-mensagens-com-mais-de-32-caracteres';
const original = process.env.JWT_SECRET;
process.env.JWT_SECRET = SEGREDO;
process.on('exit', () => {
  if (original === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = original;
});

const tecnico = { id: 21, nome: 'Técnico A', tipo_usuario: 'equipe', empresaid: 7, equipeid: 6 };
const outroTecnico = { id: 23, nome: 'Técnico B', tipo_usuario: 'equipe', empresaid: 7, equipeid: 8 };
const admin = { id: 1, nome: 'Administração', tipo_usuario: 'admin', empresaid: 7, equipeid: null };
const conversa = { id: 100, empresaid: 7, equipeid: 6, estado: 'pendente', assunto: 'Avaria bomba' };

function mockApi(utilizador, opts = {}) {
  const chamadas = [];
  let sequencia = 900;
  const db = {
    async query(sql, valores = []) {
      chamadas.push({ sql, valores });
      if (sql.includes('FROM usuarios WHERE id = $1 AND empresaid = $2')) {
        return { rows: [utilizador], rowCount: 1 };
      }
      if (sql.includes('FROM conversas_internas WHERE id = $1 AND empresaid = $2')) {
        return { rows: [opts.conversa || conversa], rowCount: 1 };
      }
      if (sql.includes('FROM conversas_internas c')) {
        return { rows: [{ ...conversa, nao_lidas: 1 }], rowCount: 1 };
      }
      if (sql.includes('FROM mensagens_internas m WHERE m.conversa_id')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('UPDATE conversas_internas SET estado = $3')) {
        return { rows: [{ id: valores[0], estado: valores[2] }], rowCount: 1 };
      }
      if (sql.startsWith('INSERT INTO leituras_mensagens_internas')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('INSERT INTO dispositivos_push')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('DELETE FROM dispositivos_push')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('SELECT id, nome, equipeid FROM usuarios')) {
        return { rows: [
          { id: 21, nome: 'Técnico A', equipeid: 6 },
          { id: 23, nome: 'Técnico B', equipeid: 8 },
        ], rowCount: 2 };
      }
      if (sql.includes('SELECT id FROM equipes WHERE id = $1 AND empresaid = $2')) {
        const valida = !opts.equipaInvalida && valores[0] === utilizador.equipeid && valores[1] === utilizador.empresaid;
        return { rows: valida ? [{ id: valores[0] }] : [], rowCount: valida ? 1 : 0 };
      }
      if (sql.includes('SELECT DISTINCT equipeid FROM usuarios')) {
        return { rows: [{ equipeid: 6 }, { equipeid: 8 }], rowCount: 2 };
      }
      if (sql.includes('SELECT equipeid FROM usuarios WHERE id = $1')) {
        return { rows: [{ equipeid: 6 }], rowCount: 1 };
      }
      throw new Error('SQL nao prevista no teste: ' + sql.slice(0, 120));
    },
    async connect() {
      return {
        async query(sql, valores = []) {
          chamadas.push({ sql, valores });
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('INSERT INTO conversas_internas')) {
            sequencia += 1;
            return { rows: [{ id: sequencia }], rowCount: 1 };
          }
          if (sql.includes('INSERT INTO mensagens_internas')) {
            return { rows: [{ id: sequencia, autor_id: valores[2], autor_nome: valores[3] }], rowCount: 1 };
          }
          if (sql.includes('SELECT id, empresaid, equipeid, estado FROM conversas_internas') ||
              sql.includes('SELECT id, empresaid, equipeid, notificacao_origem_id FROM conversas_internas')) {
            return { rows: [opts.conversa || conversa], rowCount: 1 };
          }
          if (sql.startsWith('DELETE FROM conversas_internas')) {
            return { rows: [], rowCount: 1 };
          }
          if (sql.includes('UPDATE conversas_internas SET estado = CASE')) {
            return { rows: [], rowCount: 1 };
          }
          throw new Error('SQL nao prevista em transacao: ' + sql.slice(0, 120));
        },
        release() { chamadas.push({ sql: 'RELEASE', valores: [] }); },
      };
    },
  };
  const app = express();
  app.use(express.json());
  app.use('/mensagens-internas', criarRouterMensagensInternas(db));
  return { app, chamadas };
}

function tokenDe(utilizador, opcoes = {}) {
  return jwt.sign({
    id: utilizador.id, empresaid: utilizador.empresaid, tipo_usuario: utilizador.tipo_usuario,
  }, SEGREDO, { algorithm: 'HS256', expiresIn: opcoes.expiresIn ?? 3600 });
}

async function comServidor(app, fn) {
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const base = 'http://127.0.0.1:' + server.address().port + '/mensagens-internas';
    return await fn(base);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function pedir(base, caminho, utilizador, metodo = 'GET', body, extra = {}) {
  const headers = {};
  if (utilizador) headers.Authorization = 'Bearer ' + tokenDe(utilizador, extra);
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + caminho, {
    method: metodo, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  return { status: res.status, body: texto ? JSON.parse(texto) : null };
}

test('nao se pode consultar mensagens sem JWT valido', async () => {
  const { app, chamadas } = mockApi(tecnico);
  await comServidor(app, async base => {
    const r = await pedir(base, '/conversas', null);
    assert.equal(r.status, 401);
    assert.equal(chamadas.length, 0);
    const expirado = await pedir(base, '/conversas', tecnico, 'GET', undefined, { expiresIn: -1 });
    assert.equal(expirado.status, 401);
  });
});

test('tecnico apenas consulta as conversas da propria equipa', async () => {
  const { app, chamadas } = mockApi(tecnico);
  await comServidor(app, async base => {
    assert.equal((await pedir(base, '/conversas/100/mensagens', tecnico)).status, 200);
    assert.deepEqual((await pedir(base, '/conversas?empresaid=999', tecnico)).status, 200);
    const lista = chamadas.find(c => c.sql.includes('FROM conversas_internas c'));
    assert.deepEqual(lista.valores, [7, false, 6, 21]);
    assert.match(lista.sql, /LEFT JOIN equipes e ON e\.id = c\.equipeid AND e\.empresaid = c\.empresaid/);
    assert.match(lista.sql, /LEFT JOIN clientes cl ON cl\.id = c\.cliente_id AND cl\.empresaid = c\.empresaid/);
    assert.equal((await pedir(base, '/conversas/100/ler', tecnico, 'POST')).status, 200);
    const leitura = chamadas.find(c => c.sql.startsWith('INSERT INTO leituras_mensagens_internas'));
    assert.deepEqual(leitura.valores, [100, 7, 21]);
  });
});

test('tecnico de outra equipa recebe 404 e nao pode resolver assuntos', async () => {
  const { app, chamadas } = mockApi(outroTecnico);
  await comServidor(app, async base => {
    assert.equal((await pedir(base, '/conversas/100/mensagens', outroTecnico)).status, 404);
    assert.equal((await pedir(base, '/conversas/100/mensagens', outroTecnico, 'POST', { mensagem: 'Nao permitido' })).status, 404);
    assert.equal((await pedir(base, '/conversas/100/estado', outroTecnico, 'PATCH', { estado: 'resolvido' })).status, 403);
    assert.ok(!chamadas.some(c => c.sql.includes('INSERT INTO mensagens_internas')));
  });
});

test('admin pode marcar resolvido e reabrir sem tocar nas notificacoes antigas', async () => {
  const { app, chamadas } = mockApi(admin);
  await comServidor(app, async base => {
    assert.equal((await pedir(base, '/conversas/100/estado', admin, 'PATCH', { estado: 'resolvido' })).status, 200);
    assert.equal((await pedir(base, '/conversas/100/estado', admin, 'PATCH', { estado: 'pendente' })).status, 200);
    assert.equal((await pedir(base, '/conversas/100/estado', admin, 'PATCH', { estado: 'em_resolucao' })).status, 200);
    assert.equal((await pedir(base, '/conversas/100/estado', admin, 'PATCH', { estado: 'pago' })).status, 400);
    // O mock nao executa SQL: verificar a tipagem explicita nas duas
    // ocorrencias do parametro que causava 42P08 no PostgreSQL real.
    const updates = chamadas.filter(c => c.sql.includes('UPDATE conversas_internas SET estado = $3'));
    assert.equal(updates.length, 3);
    for (const [i, estado] of ['resolvido', 'pendente', 'em_resolucao'].entries()) {
      assert.match(updates[i].sql, /SET estado = \$3::varchar, resolvida_em = CASE WHEN \$3::varchar = 'resolvido' THEN NOW\(\) ELSE NULL END/);
      assert.deepEqual(updates[i].valores, [100, 7, estado]);
    }
    assert.ok(!chamadas.some(c => /DELETE FROM notificacoes/.test(c.sql)));
  });
});

test('administracao envia a todos: uma conversa por equipa e resposta privada por equipa', async () => {
  const { app, chamadas } = mockApi(admin);
  await comServidor(app, async base => {
    const r = await pedir(base, '/conversas', admin, 'POST', {
      todos: true,
      assunto: 'Mudança de horário',
      mensagem: 'Amanhã não há manutenção.',
      autor_id: 9999,
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.conversas_ids.length, 2);
    assert.ok(r.body.grupo_envio_id);
    const insercoes = chamadas.filter(c => c.sql.includes('INSERT INTO mensagens_internas'));
    assert.equal(insercoes.length, 2);
    assert.ok(insercoes.every(c => c.valores[2] === admin.id));
    const equipas = chamadas.filter(c => c.sql.includes('INSERT INTO conversas_internas'))
      .map(c => c.valores[1]);
    assert.deepEqual(equipas, [6, 8]);
  });
});

test('tecnico nao pode iniciar broadcast e anexos invalidos sao rejeitados', async () => {
  const { app } = mockApi(tecnico);
  await comServidor(app, async base => {
    assert.equal((await pedir(base, '/conversas', tecnico, 'POST', {
      todos: true, assunto: 'Aviso', mensagem: 'Teste',
    })).status, 403);
    assert.equal((await pedir(base, '/conversas/100/mensagens', tecnico, 'POST', {
      mensagem: 'Foto', anexos: ['file:///private/foto.jpg'],
    })).status, 400);
  });
});

test('destinatarios so sao listados pela administracao autenticada da empresa', async () => {
  const a = mockApi(admin);
  await comServidor(a.app, async base => {
    const r = await pedir(base, '/tecnicos', admin);
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 2);
    const q = a.chamadas.find(c => c.sql.includes('SELECT id, nome, equipeid FROM usuarios'));
    assert.deepEqual(q.valores, [7]);
  });
  const t = mockApi(tecnico);
  await comServidor(t.app, async base => {
    assert.equal((await pedir(base, '/tecnicos', tecnico)).status, 403);
  });
});

test('so a administracao elimina conversas operacionais; relatorios ficam protegidos', async () => {
  const associada = { ...conversa, notificacao_origem_id: 900 };
  const a = mockApi(admin, { conversa: associada });
  await comServidor(a.app, async base => {
    const r = await pedir(base, '/conversas/100', admin, 'DELETE');
    assert.equal(r.status, 409);
    assert.match(r.body.error, /Relatório de anomalia protegido/);
    assert.ok(!a.chamadas.some(c => c.sql.startsWith('DELETE FROM')));
    assert.ok(a.chamadas.some(c => c.sql === 'ROLLBACK'));
  });
  const operacional = mockApi(admin);
  await comServidor(operacional.app, async base => {
    assert.equal((await pedir(base, '/conversas/100', admin, 'DELETE')).status, 200);
    const deletes = operacional.chamadas.filter(c => c.sql.startsWith('DELETE FROM'));
    assert.equal(deletes.length, 1);
    assert.match(deletes[0].sql, /DELETE FROM conversas_internas/);
    assert.deepEqual(deletes[0].valores, [100, 7]);
    assert.ok(operacional.chamadas.some(c => c.sql === 'COMMIT'));
  });
  const t = mockApi(tecnico, { conversa: associada });
  await comServidor(t.app, async base => {
    assert.equal((await pedir(base, '/conversas/100', tecnico, 'DELETE')).status, 403);
    assert.equal(t.chamadas.some(c => c.sql.startsWith('DELETE FROM')), false);
  });
});

const tokenDeTeste = 'abcde12345_abcde12345:token-fcm-teste-0001';

test('registo de dispositivo usa apenas identidade autenticada e nao revela token', async () => {
  const { app, chamadas } = mockApi(tecnico);
  await comServidor(app, async base => {
    const r = await pedir(base, '/dispositivos', tecnico, 'PUT', {
      token: tokenDeTeste, plataforma: 'android', usuario_id: 999, empresaid: 999,
    });
    assert.equal(r.status, 204);
    assert.equal(r.body, null);
    const insercao = chamadas.find(c => c.sql.startsWith('INSERT INTO dispositivos_push'));
    assert.deepEqual(insercao.valores, [7, 21, tokenDeTeste]);
    assert.match(insercao.sql, /ON CONFLICT \(token\) DO UPDATE/);
  });
});

test('o token so pode ser retirado pelo dono autenticado e pela mesma empresa', async () => {
  const { app, chamadas } = mockApi(tecnico);
  await comServidor(app, async base => {
    const r = await pedir(base, '/dispositivos', tecnico, 'DELETE', {
      token: tokenDeTeste, usuario_id: 999, empresaid: 999,
    });
    assert.equal(r.status, 204);
    assert.deepEqual(
      chamadas.find(c => c.sql.startsWith('DELETE FROM dispositivos_push')).valores,
      [tokenDeTeste, 21, 7]
    );
  });
});

test('registo rejeita tokens invalidos, outras plataformas e pedidos sem login', async () => {
  const { app, chamadas } = mockApi(tecnico);
  await comServidor(app, async base => {
    assert.equal((await pedir(base, '/dispositivos', null, 'PUT', {
      token: tokenDeTeste, plataforma: 'android',
    })).status, 401);
    assert.equal((await pedir(base, '/dispositivos', tecnico, 'PUT', {
      token: 'curto', plataforma: 'android',
    })).status, 400);
    assert.equal((await pedir(base, '/dispositivos', tecnico, 'PUT', {
      token: tokenDeTeste, plataforma: 'ios',
    })).status, 400);
    assert.equal((await pedir(base, '/dispositivos', tecnico, 'DELETE', {
      token: 'invalid\twith whitespace'.repeat(3),
    })).status, 400);
    assert.equal(chamadas.filter(c => c.sql.includes('dispositivos_push')).length, 0);
  });
});

test('fotografia comprimida pode ser resposta de tecnico sem texto adicional', async () => {
  const { app, chamadas } = mockApi(tecnico);
  const foto = 'data:image/jpeg;base64,' + 'QUJD'.repeat(100);
  await comServidor(app, async base => {
    const resposta = await pedir(base, '/conversas/100/mensagens', tecnico, 'POST', {
      mensagem: '', anexos: [foto],
    });
    assert.equal(resposta.status, 201);
    const insercao = chamadas.find(c => c.sql.includes('INSERT INTO mensagens_internas'));
    assert.equal(insercao.valores[2], 21);
    assert.equal(insercao.valores[4], null);
    assert.equal(insercao.valores[5], JSON.stringify([foto]));
  });
});

test('tecnico inicia assunto operacional com foto, usando somente empresa e equipa autenticadas', async () => {
  const { app, chamadas } = mockApi(tecnico);
  const foto = 'data:image/jpeg;base64,/9j/2Q==';
  await comServidor(app, async base => {
    const r = await pedir(base, '/conversas', tecnico, 'POST', {
      assunto: 'Problema na carrinha', anexos: [foto],
      empresaid: 999, equipeid: 8, autor_id: 999, cliente_id: 123,
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.conversas_ids.length, 1);
    assert.equal(r.body.grupo_envio_id, null);
    const equipa = chamadas.find(c => c.sql.includes('SELECT id FROM equipes'));
    assert.deepEqual(equipa.valores, [6, 7]);
    const criada = chamadas.find(c => c.sql.includes('INSERT INTO conversas_internas'));
    assert.deepEqual(criada.valores, [7, 6, null, 'Problema na carrinha', 21]);
    assert.doesNotMatch(criada.sql, /cliente_id|notificacao_origem_id/);
    const msg = chamadas.find(c => c.sql.includes('INSERT INTO mensagens_internas'));
    assert.deepEqual(msg.valores, [r.body.conversas_ids[0], 7, 21, tecnico.nome, null, JSON.stringify([foto])]);
    assert.ok(chamadas.some(c => c.sql === 'COMMIT'));
  });
});

test('tecnico nao pode escolher destinatario nem criar conversa sem equipa valida', async () => {
  const t = mockApi(tecnico);
  await comServidor(t.app, async base => {
    const r = await pedir(base, '/conversas', tecnico, 'POST', {
      assunto: 'Material', mensagem: 'Precisamos de cloro', tecnico_id: 23,
    });
    assert.equal(r.status, 403);
  });
  assert.ok(!t.chamadas.some(c => c.sql.includes('INSERT INTO conversas_internas')));
  for (const [u, opts] of [[{ ...tecnico, equipeid: null }, {}], [tecnico, { equipaInvalida: true }]]) {
    const semEquipa = mockApi(u, opts);
    await comServidor(semEquipa.app, async base => {
      assert.equal((await pedir(base, '/conversas', u, 'POST', {
        assunto: 'Material', mensagem: 'Precisamos de cloro',
      })).status, 403);
    });
    assert.ok(!semEquipa.chamadas.some(c => c.sql.includes('INSERT INTO conversas_internas')));
  }
});

test('administracao envia fotografia inicial e ambos os perfis rejeitam anexos invalidos ou mensagem vazia', async () => {
  const foto = 'data:image/jpeg;base64,/9j/2Q==';
  const a = mockApi(admin);
  await comServidor(a.app, async base => {
    const r = await pedir(base, '/conversas', admin, 'POST', {
      todos: true, assunto: 'Material', mensagem: 'Ver fotografia', anexos: [foto],
    });
    assert.equal(r.status, 201);
    const msgs = a.chamadas.filter(c => c.sql.includes('INSERT INTO mensagens_internas'));
    assert.equal(msgs.length, 2);
    assert.ok(msgs.every(c => c.valores[5] === JSON.stringify([foto])));
  });
  for (const u of [admin, tecnico]) {
    const t = mockApi(u);
    await comServidor(t.app, async base => {
      const destino = u.tipo_usuario === 'admin' ? { tecnico_id: 21 } : {};
      for (const body of [{ mensagem: '' }, { mensagem: 'Foto', anexos: ['file:///local.jpg'] }, { anexos: [foto, foto, foto] }]) {
        assert.equal((await pedir(base, '/conversas', u, 'POST', { assunto: 'Teste', ...destino, ...body })).status, 400);
      }
    });
    assert.ok(!t.chamadas.some(c => c.sql.includes('INSERT INTO conversas_internas')));
  }
});
