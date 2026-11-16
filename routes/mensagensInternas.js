'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
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

  // Lista apenas os assuntos da empresa e, para tecnicos, da SUA equipa.
  router.get('/conversas', async (req, res) => {
    const u = req.utilizadorMensagens;
    try {
      const resultado = await pool.query([
        'SELECT c.id, c.assunto, c.estado, c.equipeid, c.cliente_id,',
        'c.notificacao_origem_id, c.grupo_envio_id, c.criada_em, c.atualizada_em,',
        '(SELECT COUNT(*)::INTEGER FROM mensagens_internas m',
        ' WHERE m.conversa_id = c.id AND m.empresaid = c.empresaid',
        ' AND m.autor_id <> $4 AND NOT EXISTS',
        ' (SELECT 1 FROM leituras_mensagens_internas l',
        ' WHERE l.mensagem_id = m.id AND l.usuario_id = $4)) AS nao_lidas',
        'FROM conversas_internas c WHERE c.empresaid = $1',
        'AND ($2::BOOLEAN OR c.equipeid = $3)',
        'ORDER BY c.atualizada_em DESC, c.id DESC',
      ].join(' '), [u.empresaid, eAdministrador(u), u.equipeid, u.id]);
      return res.json(resultado.rows);
    } catch (error) {
      return falha(res, error, 'listar');
    }
  });

  // Administracao: cria um assunto para a equipa de um tecnico ou para cada
  // equipa com tecnicos da empresa ("todos"). Respostas nunca cruzam equipas.
  router.post('/conversas', async (req, res) => {
    const u = req.utilizadorMensagens;
    if (!eAdministrador(u)) return res.status(403).json({ error: 'Apenas a Administração pode iniciar esta mensagem.' });

    const assunto = typeof req.body.assunto === 'string' ? req.body.assunto.trim() : '';
    if (!assunto || assunto.length > 255) {
      return res.status(400).json({ error: 'Assunto obrigatório (máximo 255 caracteres).' });
    }
    const conteudo = validarConteudoMensagem(req.body.mensagem, req.body.anexos || []);
    if (conteudo.erro) return res.status(400).json({ error: conteudo.erro });
    const todos = req.body.todos === true;
    const destinatarioId = inteiroPositivo(req.body.tecnico_id);
    if (!todos && !destinatarioId) {
      return res.status(400).json({ error: 'Escolha um técnico ou a opção Todos.' });
    }

    let client;
    try {
      // Buscar equipas usando apenas o empresaid autenticado.
      let destinos;
      if (todos) {
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
        const criada = await client.query(
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
        "'usuario_id', l.usuario_id, 'lida_em', l.lida_em)), '[]'::jsonb)",
        ' FROM leituras_mensagens_internas l WHERE l.mensagem_id = m.id) AS leituras',
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
      const resultado = await pool.query(
        "UPDATE conversas_internas SET estado = $3, resolvida_em = CASE WHEN $3 = 'resolvido' THEN NOW() ELSE NULL END, atualizada_em = NOW() WHERE id = $1 AND empresaid = $2 RETURNING id, estado, resolvida_em",
        [conversa.id, u.empresaid, estado]
      );
      return res.json(resultado.rows[0]);
    } catch (error) {
      return falha(res, error, 'estado');
    }
  });

  // Eliminacao sera ligada ao ciclo de vida da notificacao original,
  // na fase de integracao, para nao deixar dados inconsistentes.
  return router;
}

module.exports = { criarRouterMensagensInternas };
