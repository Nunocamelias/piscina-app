'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { importarRelatorioAnomalia } = require('../services/importarRelatorioAnomalia');
const {
  inteiroPositivo, eAdministrador, eTecnico, podeLerConversa,
  podeGerirConversa, validarConteudoMensagem,
} = require('../services/regrasMensagensInternas');

// Rotas novas, separadas do fluxo antigo de notificacoes.
// Para ativar: criar primeiro as tabelas da migracao 20261116_mensagens_internas.sql.
function criarRouterMensagensInternas(pool) {
  const router = express.Router();

  router.use(async (req, res, next) => {
    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      return res.status(503).json({ error: 'Serviço indisponível: configuração de autenticação em falta.' });
    }
    const bearer = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
    if (!bearer) return res.status(401).json({ error: 'Autenticação necessária.' });

    try {
      const claims = jwt.verify(bearer[1], segredo, { algorithms: ['HS256'] });
      const id = inteiroPositivo(claims.id);
      const empresaid = inteiroPositivo(claims.empresaid);
      if (!id || !empresaid) return res.status(401).json({ error: 'Sessão inválida.' });

      // Papel, empresa e equipa SAEM DA BD, nao dos parametros do pedido.
      const utilizadores = await pool.query(
        'SELECT id, nome, empresaid, equipeid, tipo_usuario FROM usuarios WHERE id = $1 AND empresaid = $2',
        [id, empresaid]
      );
      if (!utilizadores.rowCount) return res.status(401).json({ error: 'Sessão inválida.' });

      const utilizador = utilizadores.rows[0];
      if (!eAdministrador(utilizador) && !eTecnico(utilizador)) {
        return res.status(403).json({ error: 'Perfil sem acesso às mensagens internas.' });
      }
      req.utilizadorMensagens = utilizador;
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
        return res.status(401).json({ error: 'Sessão expirada ou inválida. Volte a iniciar sessão.' });
      }
      console.error('Erro de autenticação das mensagens internas:', error.code || error.message);
      return res.status(500).json({ error: 'Erro ao validar sessão.' });
    }
  });

  async function obterConversa(db, utilizador, id) {
    const conversaId = inteiroPositivo(id);
    if (!conversaId) return null;
    const resultado = await db.query(
      'SELECT id, empresaid, equipeid, cliente_id, notificacao_origem_id, assunto, estado, criada_por, criada_em, atualizada_em, resolvida_em FROM conversas_internas WHERE id = $1 AND empresaid = $2',
      [conversaId, utilizador.empresaid]
    );
    const conversa = resultado.rows[0];
    return podeLerConversa(utilizador, conversa) ? conversa : null;
  }

  const falha = (res, error, contexto) => {
    console.error('Erro em mensagens internas (' + contexto + '):', error.code || error.message);
    return res.status(500).json({ error: 'Não foi possível concluir a operação.' });
  };

  // Dispositivos para futuras notificacoes push.
  // Nao aceita empresaid nem usuario_id do pedido: usa APENAS a sessao.
  // Nunca devolver, imprimir ou expor publicamente os tokens Firebase.
  const tokenDispositivoValido = valor =>
    typeof valor === 'string' && valor.length >= 20 && valor.length <= 4096 &&
    /^[A-Za-z0-9_:.-]+$/.test(valor);

  router.put('/dispositivos', async (req, res) => {
    const u = req.utilizadorMensagens;
    const token = req.body?.token;
    if (!tokenDispositivoValido(token) || req.body?.plataforma !== 'android') {
      return res.status(400).json({ error: 'Dispositivo Android ou token inválido.' });
    }
    try {
      await pool.query([
        'INSERT INTO dispositivos_push (empresaid, usuario_id, token, plataforma)',
        "VALUES ($1, $2, $3, 'android')",
        'ON CONFLICT (token) DO UPDATE SET',
        'empresaid = EXCLUDED.empresaid,',
        'usuario_id = EXCLUDED.usuario_id,',
        'plataforma = EXCLUDED.plataforma,',
        'atualizado_em = NOW()',
      ].join(' '), [u.empresaid, u.id, token]);
      return res.status(204).end();
    } catch (error) {
      return falha(res, error, 'registar-dispositivo');
    }
  });

  // Retira o token apenas se ainda pertencer a este utilizador e empresa.
  // Evita que um logout antigo retire o token de um novo utilizador.
  router.delete('/dispositivos', async (req, res) => {
    const u = req.utilizadorMensagens;
    const token = req.body?.token;
    if (!tokenDispositivoValido(token)) {
      return res.status(400).json({ error: 'Token de dispositivo inválido.' });
    }
    try {
      await pool.query(
        'DELETE FROM dispositivos_push WHERE token = $1 AND usuario_id = $2 AND empresaid = $3',
        [token, u.id, u.empresaid]
      );
      return res.status(204).end();
    } catch (error) {
      return falha(res, error, 'remover-dispositivo');
    }
  });

  // Selecionador da Administracao (sem expor utilizadores de outras empresas).
  router.get('/tecnicos', async (req, res) => {
    const u = req.utilizadorMensagens;
    if (!eAdministrador(u)) {
      return res.status(403).json({ error: 'Apenas a Administração pode consultar os destinatários.' });
    }
    try {
      const result = await pool.query([
        'SELECT id, nome, equipeid FROM usuarios',
        "WHERE empresaid = $1 AND tipo_usuario IN ('equipe','equipa_manutencao','equipa_tecnica')",
        'AND equipeid IS NOT NULL ORDER BY nome, id',
      ].join(' '), [u.empresaid]);
      return res.json(result.rows);
    } catch (error) {
      return falha(res, error, 'tecnicos');
    }
  });


  // Clientes associados por equipa: só a Administração pode escolher.
  router.get('/clientes-associados', async (req, res) => {
    const u = req.utilizadorMensagens;
    if (!eAdministrador(u)) return res.status(403).json({ error: 'Apenas a Administração pode consultar os clientes destinatários.' });
    try {
      const r = await pool.query([
        'SELECT DISTINCT a.equipeid, c.id, c.nome FROM associados a',
        'JOIN clientes c ON c.id = a.clienteid AND c.empresaid = a.empresaid',
        'JOIN equipes e ON e.id = a.equipeid AND e.empresaid = a.empresaid',
        'WHERE a.empresaid = $1 ORDER BY c.nome, c.id, a.equipeid',
      ].join(' '), [u.empresaid]);
      return res.json(r.rows);
    } catch (error) {
      return falha(res, error, 'clientes-associados');
    }
  });

  // Instruções para a próxima conclusão real da manutenção nesta equipa.
  // Não transferir anexos em base64 na agenda/folha; só ao abrir a conversa.
  // Ler ou resolver a conversa não equivale a concluir a visita.
  router.get('/indicacoes-manutencao', async (req, res) => {
    const u = req.utilizadorMensagens;
    const equipa = inteiroPositivo(u.equipeid);
    if (!eTecnico(u) || !equipa) return res.status(403).json({ error: 'Indicações disponíveis apenas para a equipa autenticada.' });
    const clienteId = req.query.cliente_id == null ? null : inteiroPositivo(req.query.cliente_id);
    if (req.query.cliente_id != null && !clienteId) return res.status(400).json({ error: 'Cliente inválido.' });
    try {
      const r = await pool.query([
        'SELECT c.id AS conversa_id, c.cliente_id, c.equipeid, c.assunto,',
        'primeira.texto AS mensagem, primeira.num_anexos,',
        'EXISTS (SELECT 1 FROM leituras_mensagens_internas l',
        ' WHERE l.mensagem_id = primeira.id AND l.usuario_id = $3) AS lida',
        'FROM conversas_internas c',
        'JOIN LATERAL (SELECT m.id, m.texto, jsonb_array_length(m.anexos) AS num_anexos',
        ' FROM mensagens_internas m WHERE m.conversa_id = c.id AND m.empresaid = c.empresaid',
        ' ORDER BY m.criada_em, m.id LIMIT 1) primeira ON TRUE',
        'WHERE c.empresaid = $1 AND c.equipeid = $2 AND c.indicacao_manutencao IS TRUE',
        'AND ($4::integer IS NULL OR c.cliente_id = $4::integer)',
        'AND EXISTS (SELECT 1 FROM associados a WHERE a.empresaid = c.empresaid',
        ' AND a.equipeid = c.equipeid AND a.clienteid = c.cliente_id)',
        'AND NOT EXISTS (SELECT 1 FROM manutencoes v',
        ' WHERE v.empresaid = c.empresaid AND v.cliente_id = c.cliente_id',
        " AND v.equipe_id = c.equipeid AND v.status = 'concluida'",
        " AND v.data_conclusao >= (c.criada_em AT TIME ZONE 'Europe/Lisbon'))",
        'ORDER BY c.criada_em, c.id',
      ].join(' '), [u.empresaid, equipa, u.id, clienteId]);
      return res.json(r.rows);
    } catch (error) {
      return falha(res, error, 'indicacoes-manutencao');
    }
  });

  // Importar uma anomalia ja criada pelo sistema de manutencao.
  // E idempotente e nunca altera a tabela antiga.
  router.post('/conversas/importar-anomalia', async (req, res) => {
    try {
      const resultado = await importarRelatorioAnomalia(
        pool, req.utilizadorMensagens, req.body.notificacao_id
      );
      return res.status(resultado.criada ? 201 : 200).json(resultado);
    } catch (error) {
      if (error.statusHttp) return res.status(error.statusHttp).json({ error: error.message });
      return falha(res, error, 'importar-anomalia');
    }
  });

  // Lista apenas os assuntos da empresa e, para tecnicos, da SUA equipa.
  router.get('/conversas', async (req, res) => {
    const u = req.utilizadorMensagens;
    try {
      const resultado = await pool.query([
        'SELECT c.id, c.assunto, c.estado, c.equipeid, c.cliente_id,',
        'e.nomeequipe AS equipa_nome, cl.nome AS cliente_nome,',
        'c.notificacao_origem_id, c.grupo_envio_id, c.criada_em, c.atualizada_em,',
        '(SELECT COUNT(*)::INTEGER FROM mensagens_internas m',
        ' WHERE m.conversa_id = c.id AND m.empresaid = c.empresaid',
        ' AND m.autor_id <> $4 AND NOT EXISTS',
        ' (SELECT 1 FROM leituras_mensagens_internas l',
        ' WHERE l.mensagem_id = m.id AND l.usuario_id = $4)) AS nao_lidas',
        'FROM conversas_internas c',
        'LEFT JOIN equipes e ON e.id = c.equipeid AND e.empresaid = c.empresaid',
        'LEFT JOIN clientes cl ON cl.id = c.cliente_id AND cl.empresaid = c.empresaid',
        'WHERE c.empresaid = $1 AND ($2::BOOLEAN OR c.equipeid = $3)',
        'ORDER BY c.atualizada_em DESC, c.id DESC',
      ].join(' '), [u.empresaid, eAdministrador(u), u.equipeid, u.id]);
      return res.json(resultado.rows);
    } catch (error) {
      return falha(res, error, 'listar');
    }
  });

  // Administracao: escolhe uma equipa ou envia a todas.
  // Tecnico: inicia um assunto operacional com a Administracao da propria empresa.
  // Respostas nunca cruzam equipas.
  router.post('/conversas', async (req, res) => {
    const u = req.utilizadorMensagens;
    const admin = eAdministrador(u);
    // Um tecnico nunca escolhe outra equipa nem envia comunicados gerais.
    if (!admin && (req.body.todos === true || req.body.tecnico_id != null)) {
      return res.status(403).json({ error: 'Os técnicos só podem iniciar conversas com a Administração.' });
    }

    const assunto = typeof req.body.assunto === 'string' ? req.body.assunto.trim() : '';
    if (!assunto || assunto.length > 255) {
      return res.status(400).json({ error: 'Assunto obrigatório (máximo 255 caracteres).' });
    }
    const conteudo = validarConteudoMensagem(req.body.mensagem, req.body.anexos || []);
    if (conteudo.erro) return res.status(400).json({ error: conteudo.erro });
    const todos = admin && req.body.todos === true;
    const destinatarioId = inteiroPositivo(req.body.tecnico_id);
    // A indicação é criada apenas pela Administração. O campo de um técnico
    // é ignorado, tal como o empresaid/equipeid fornecidos pelo telemóvel.
    const clienteId = admin && req.body.cliente_id != null ? inteiroPositivo(req.body.cliente_id) : null;
    if (admin && req.body.cliente_id != null && (!clienteId || todos)) {
      return res.status(400).json({ error: 'Escolha um cliente válido e um técnico específico.' });
    }
    if (clienteId && !conteudo.texto) {
      return res.status(400).json({ error: 'Escreva a indicação para a manutenção.' });
    }
    if (admin && !todos && !destinatarioId) {
      return res.status(400).json({ error: 'Escolha um técnico ou a opção Todos.' });
    }

    let client;
    try {
      // Buscar equipas usando apenas o empresaid autenticado.
      let destinos;
      if (!admin) {
        const equipaId = inteiroPositivo(u.equipeid);
        if (!equipaId) {
          return res.status(403).json({ error: 'O técnico não tem uma equipa válida atribuída.' });
        }
        const equipa = await pool.query(
          'SELECT id FROM equipes WHERE id = $1 AND empresaid = $2',
          [equipaId, u.empresaid]
        );
        if (!equipa.rowCount) {
          return res.status(403).json({ error: 'O técnico não tem uma equipa válida atribuída.' });
        }
        destinos = [equipaId];
      } else if (todos) {
        const result = await pool.query(
          "SELECT DISTINCT equipeid FROM usuarios WHERE empresaid = $1 AND tipo_usuario IN ('equipe','equipa_manutencao','equipa_tecnica') AND equipeid IS NOT NULL ORDER BY equipeid",
          [u.empresaid]
        );
        destinos = result.rows.map(r => inteiroPositivo(r.equipeid)).filter(Boolean);
      } else {
        const result = await pool.query(
          "SELECT equipeid FROM usuarios WHERE id = $1 AND empresaid = $2 AND tipo_usuario IN ('equipe','equipa_manutencao','equipa_tecnica')",
          [destinatarioId, u.empresaid]
        );
        destinos = result.rows.map(r => inteiroPositivo(r.equipeid)).filter(Boolean);
      }
      if (!destinos.length) {
        return res.status(400).json({ error: 'Não existem técnicos com equipa válida para este envio.' });
      }

      const grupoId = todos ? uuidv4() : null;
      const ids = [];
      client = await pool.connect();
      await client.query('BEGIN');
      for (const equipeid of destinos) {
        if (clienteId) {
          const associado = await client.query([
            'SELECT 1 FROM associados a',
            'JOIN clientes c ON c.id = a.clienteid AND c.empresaid = a.empresaid',
            'JOIN equipes e ON e.id = a.equipeid AND e.empresaid = a.empresaid',
            'WHERE a.empresaid = $1 AND a.equipeid = $2 AND a.clienteid = $3 LIMIT 1',
          ].join(' '), [u.empresaid, equipeid, clienteId]);
          if (!associado.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'O cliente não está associado à equipa selecionada.' });
          }
        }
        const criada = clienteId
          ? await client.query(
              "INSERT INTO conversas_internas (empresaid, equipeid, grupo_envio_id, assunto, criada_por, cliente_id, indicacao_manutencao) VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING id",
              [u.empresaid, equipeid, grupoId, assunto, u.id, clienteId]
            )
          : await client.query(
              "INSERT INTO conversas_internas (empresaid, equipeid, grupo_envio_id, assunto, criada_por) VALUES ($1,$2,$3,$4,$5) RETURNING id",
              [u.empresaid, equipeid, grupoId, assunto, u.id]
            );
        const id = criada.rows[0].id;
        await client.query(
          "INSERT INTO mensagens_internas (conversa_id, empresaid, autor_id, autor_nome, texto, anexos) VALUES ($1,$2,$3,$4,$5,$6::jsonb)",
          [id, u.empresaid, u.id, u.nome, conteudo.texto, JSON.stringify(conteudo.anexos)]
        );
        ids.push(id);
      }
      await client.query('COMMIT');
      return res.status(201).json({ conversas_ids: ids, grupo_envio_id: grupoId });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      return falha(res, error, 'criar');
    } finally {
      if (client) client.release();
    }
  });

  router.get('/conversas/:id/mensagens', async (req, res) => {
    const u = req.utilizadorMensagens;
    try {
      const conversa = await obterConversa(pool, u, req.params.id);
      if (!conversa) return res.status(404).json({ error: 'Assunto não encontrado.' });

      const resultado = await pool.query([
        'SELECT m.id, m.autor_id, m.autor_nome, m.texto, m.anexos, m.criada_em,',
        '(SELECT COALESCE(jsonb_agg(jsonb_build_object(',
        "'usuario_id', l.usuario_id, 'nome', leitor.nome, 'lida_em', l.lida_em)",
        "ORDER BY l.lida_em), '[]'::jsonb)",
        'FROM leituras_mensagens_internas l',
        'JOIN usuarios leitor ON leitor.id = l.usuario_id AND leitor.empresaid = m.empresaid',
        'WHERE l.mensagem_id = m.id) AS leituras',
        'FROM mensagens_internas m WHERE m.conversa_id = $1 AND m.empresaid = $2',
        'ORDER BY m.criada_em ASC, m.id ASC',
      ].join(' '), [conversa.id, u.empresaid]);
      return res.json({ conversa, mensagens: resultado.rows });
    } catch (error) {
      return falha(res, error, 'mensagens');
    }
  });

  // Registo de leitura por UTILIZADOR, nao por equipa; idempotente.
  router.post('/conversas/:id/ler', async (req, res) => {
    const u = req.utilizadorMensagens;
    try {
      const conversa = await obterConversa(pool, u, req.params.id);
      if (!conversa) return res.status(404).json({ error: 'Assunto não encontrado.' });
      await pool.query([
        'INSERT INTO leituras_mensagens_internas (mensagem_id, usuario_id)',
        'SELECT m.id, $3 FROM mensagens_internas m',
        'WHERE m.conversa_id = $1 AND m.empresaid = $2 AND m.autor_id <> $3',
        'ON CONFLICT (mensagem_id, usuario_id) DO NOTHING',
      ].join(' '), [conversa.id, u.empresaid, u.id]);
      return res.json({ ok: true });
    } catch (error) {
      return falha(res, error, 'leitura');
    }
  });

  router.post('/conversas/:id/mensagens', async (req, res) => {
    const u = req.utilizadorMensagens;
    const conteudo = validarConteudoMensagem(req.body.mensagem, req.body.anexos || []);
    if (conteudo.erro) return res.status(400).json({ error: conteudo.erro });
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const result = await client.query(
        'SELECT id, empresaid, equipeid, estado FROM conversas_internas WHERE id = $1 AND empresaid = $2 FOR UPDATE',
        [inteiroPositivo(req.params.id) || 0, u.empresaid]
      );
      const conversa = result.rows[0];
      if (!podeLerConversa(u, conversa)) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Assunto não encontrado.' });
      }
      if (conversa.estado === 'resolvido') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Assunto resolvido. Peça à Administração que o reabra.' });
      }
      const inserida = await client.query(
        'INSERT INTO mensagens_internas (conversa_id, empresaid, autor_id, autor_nome, texto, anexos) VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id, autor_id, autor_nome, texto, anexos, criada_em',
        [conversa.id, u.empresaid, u.id, u.nome, conteudo.texto, JSON.stringify(conteudo.anexos)]
      );
      await client.query(
        "UPDATE conversas_internas SET estado = CASE WHEN estado = 'pendente' THEN 'em_resolucao' ELSE estado END, atualizada_em = NOW() WHERE id = $1 AND empresaid = $2",
        [conversa.id, u.empresaid]
      );
      await client.query('COMMIT');
      return res.status(201).json({ mensagem: inserida.rows[0] });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      return falha(res, error, 'responder');
    } finally {
      if (client) client.release();
    }
  });

  // Apenas Admin marca como resolvido, em resolucao ou reabre.
  router.patch('/conversas/:id/estado', async (req, res) => {
    const u = req.utilizadorMensagens;
    if (!eAdministrador(u)) return res.status(403).json({ error: 'Apenas a Administração pode alterar o estado.' });
    const estado = req.body.estado;
    if (!['pendente', 'em_resolucao', 'resolvido'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }
    try {
      const conversa = await obterConversa(pool, u, req.params.id);
      if (!podeGerirConversa(u, conversa)) return res.status(404).json({ error: 'Assunto não encontrado.' });
      // O PostgreSQL deve usar o mesmo tipo para $3 na atribuicao e na
      // comparacao do CASE, evitando o erro 42P08 (tipos inconsistentes).
      const resultado = await pool.query(
        "UPDATE conversas_internas SET estado = $3::varchar, resolvida_em = CASE WHEN $3::varchar = 'resolvido' THEN NOW() ELSE NULL END, atualizada_em = NOW() WHERE id = $1 AND empresaid = $2 RETURNING id, estado, resolvida_em",
        [conversa.id, u.empresaid, estado]
      );
      return res.json(resultado.rows[0]);
    } catch (error) {
      return falha(res, error, 'estado');
    }
  });

  // Apenas a Administracao apaga assuntos operacionais.
  // As conversas ligadas a relatorios ficam protegidas: conservar o historico
  // e a ligacao ao circuito antigo, evitando tambem uma futura reimportacao.
  router.delete('/conversas/:id', async (req, res) => {
    const u = req.utilizadorMensagens;
    if (!eAdministrador(u)) return res.status(403).json({ error: 'Apenas a Administração pode apagar conversas.' });
    const id = inteiroPositivo(req.params.id);
    if (!id) return res.status(400).json({ error: 'Identificador inválido.' });

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const dados = await client.query(
        'SELECT id, empresaid, equipeid, notificacao_origem_id FROM conversas_internas WHERE id = $1 AND empresaid = $2 FOR UPDATE',
        [id, u.empresaid]
      );
      if (!podeGerirConversa(u, dados.rows[0])) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Assunto não encontrado.' });
      }
      if (dados.rows[0].notificacao_origem_id != null) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Relatório de anomalia protegido. Utilize Resolver para encerrar o assunto.' });
      }
      await client.query('DELETE FROM conversas_internas WHERE id = $1 AND empresaid = $2', [id, u.empresaid]);
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      return falha(res, error, 'apagar');
    } finally {
      if (client) client.release();
    }
  });

  return router;
}

module.exports = { criarRouterMensagensInternas };
