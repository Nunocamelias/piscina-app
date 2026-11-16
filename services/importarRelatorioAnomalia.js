'use strict';

const {
  inteiroPositivo, eAdministrador, eTecnico, podeLerConversa,
} = require('./regrasMensagensInternas');

function erroHttp(statusHttp, mensagem) {
  const erro = new Error(mensagem);
  erro.statusHttp = statusHttp;
  return erro;
}

// Importa UM relatorio ja criado pelo endpoint legado, sem alterar esse registo.
// O mesmo relatorio origina uma unica conversa, independentemente de repeticoes.
async function importarRelatorioAnomalia(pool, utilizador, notificacaoId) {
  const id = inteiroPositivo(notificacaoId);
  const empresaid = inteiroPositivo(utilizador?.empresaid);
  if (!id || !empresaid || (!eAdministrador(utilizador) && !eTecnico(utilizador))) {
    throw erroHttp(400, 'Identificador ou utilizador inválido.');
  }

  const client = await pool.connect();
  let emTransacao = false;
  try {
    await client.query('BEGIN');
    emTransacao = true;
    const dados = await client.query([
      'SELECT n.id, n.cliente_id, n.assunto, n.mensagem, n.anexos,',
      'n.criador_id, n.empresaid, u.equipeid, u.tipo_usuario',
      'FROM notificacoes n',
      'JOIN clientes c ON c.id = n.cliente_id AND c.empresaid = n.empresaid',
      'JOIN usuarios u ON u.id = n.criador_id AND u.empresaid = n.empresaid',
      'WHERE n.id = $1 AND n.empresaid = $2 FOR UPDATE OF n',
    ].join(' '), [id, empresaid]);
    const n = dados.rows[0];
    if (!n || !eTecnico({ tipo_usuario: n.tipo_usuario })) {
      throw erroHttp(404, 'Relatório de anomalia não encontrado.');
    }

    const equipa = inteiroPositivo(n.equipeid);
    const autor = inteiroPositivo(n.criador_id);
    if (!equipa || !autor) throw erroHttp(409, 'Relatório sem equipa ou autor válido.');

    // O tecnico so pode importar o que criou e da equipa onde esta agora.
    // A Administracao pode importar relatorios antigos de qualquer equipa da sua empresa.
    if (!eAdministrador(utilizador) &&
        (autor !== inteiroPositivo(utilizador.id) ||
         equipa !== inteiroPositivo(utilizador.equipeid))) {
      throw erroHttp(404, 'Relatório de anomalia não encontrado.');
    }

    const existente = await client.query(
      'SELECT id, empresaid, equipeid FROM conversas_internas WHERE notificacao_origem_id = $1 AND empresaid = $2',
      [id, empresaid]
    );
    if (existente.rows.length) {
      if (!podeLerConversa(utilizador, existente.rows[0])) {
        throw erroHttp(404, 'Relatório de anomalia não encontrado.');
      }
      await client.query('COMMIT');
      emTransacao = false;
      return { conversa_id: existente.rows[0].id, criada: false };
    }

    const assunto = String(n.assunto || 'Relatório de Anomalia').trim().slice(0, 255);
    const inserida = await client.query([
      'INSERT INTO conversas_internas',
      '(empresaid, equipeid, cliente_id, notificacao_origem_id, assunto, criada_por)',
      'VALUES ($1,$2,$3,$4,$5,$6)',
      'ON CONFLICT (notificacao_origem_id) DO NOTHING RETURNING id',
    ].join(' '), [empresaid, equipa, n.cliente_id, id, assunto, autor]);

    if (!inserida.rows.length) {
      const concorrente = await client.query(
        'SELECT id, empresaid, equipeid FROM conversas_internas WHERE notificacao_origem_id = $1 AND empresaid = $2',
        [id, empresaid]
      );
      if (!concorrente.rows.length || !podeLerConversa(utilizador, concorrente.rows[0])) {
        throw erroHttp(409, 'Não foi possível confirmar a conversa associada.');
      }
      await client.query('COMMIT');
      emTransacao = false;
      return { conversa_id: concorrente.rows[0].id, criada: false };
    }

    // Conteudo lido da BD: preserva o texto e as fotografias do relatorio original.
    // Nao aceita a mensagem inicial fornecida por quem chama esta rota.
    const anexos = Array.isArray(n.anexos) ? n.anexos : [];
    const primeira = await client.query([
      'INSERT INTO mensagens_internas',
      '(conversa_id, empresaid, autor_id, autor_nome, texto, anexos)',
      'SELECT $1, $2, u.id, u.nome, $3, $4::jsonb',
      'FROM usuarios u WHERE u.id = $5 AND u.empresaid = $2',
    ].join(' '), [inserida.rows[0].id, empresaid, n.mensagem, JSON.stringify(anexos), autor]);
    if (!primeira.rowCount) throw erroHttp(409, 'Autor do relatório indisponível.');

    await client.query('COMMIT');
    emTransacao = false;
    return { conversa_id: inserida.rows[0].id, criada: true };
  } catch (error) {
    if (emTransacao) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { importarRelatorioAnomalia };
