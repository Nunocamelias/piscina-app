'use strict';

// Confirmações nos cartões: não reescrever o estado da manutenção já concluída.
// Uma confirmação "aplicado" resolve apenas a pendência identificada por mp.id.
function erroHttp(status, mensagem) {
  const erro = new Error(mensagem);
  erro.statusHttp = status;
  return erro;
}

async function confirmarPendenciaProduto(pool, { empresaid, registoId, estado }) {
  const empresa = Number(empresaid);
  const registo = Number(registoId);
  if (!Number.isSafeInteger(empresa) || empresa <= 0 ||
      !Number.isSafeInteger(registo) || registo <= 0 ||
      !['aplicado', 'sem estoque'].includes(estado)) {
    throw erroHttp(400, 'Empresa, aviso ou estado inválidos.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloqueia o registo original enquanto valida/guarda a confirmação.
    // A combinação dos filtros impede usar avisos de outra empresa.
    const origem = await client.query(`
      SELECT mp.id, mp.parametro, mp.status, m.cliente_id
      FROM manutencoes_parametros mp
      JOIN manutencoes m
        ON m.id = mp.manutencao_id AND m.empresaid = mp.empresaid
      WHERE mp.id = $1 AND mp.empresaid = $2 AND m.empresaid = $2
        AND m.status = 'concluida'
      FOR UPDATE OF mp
    `, [registo, empresa]);

    if (!origem.rowCount) {
      throw erroHttp(404, 'Este aviso não foi encontrado.');
    }
    const anterior = origem.rows[0];
    if (anterior.status !== 'sem estoque') {
      throw erroHttp(409, 'Este aviso já não corresponde a uma falta de stock.');
    }

    // A mensagem pode ter sido substituída por uma validação mais recente,
    // em qualquer manutenção concluída deste cliente e parâmetro.
    const maisRecente = await client.query(`
      SELECT mp.id
      FROM manutencoes m
      JOIN manutencoes_parametros mp
        ON mp.manutencao_id = m.id AND mp.empresaid = m.empresaid
      WHERE m.empresaid = $1 AND m.cliente_id = $2
        AND m.status = 'concluida'
        AND mp.parametro = $3
        AND mp.status IN ('sem estoque', 'aplicado', 'nao necessario')
      ORDER BY COALESCE(m.data_conclusao, m.data_manutencao) DESC,
        m.id DESC, mp.id DESC
      LIMIT 1
    `, [empresa, anterior.cliente_id, anterior.parametro]);

    if (Number(maisRecente.rows[0]?.id) !== registo) {
      throw erroHttp(409, 'A pendência foi atualizada noutra manutenção. Atualiza a lista.');
    }

    const aplicada = await client.query(`
      SELECT id
      FROM confirmacoes_pendencias_produtos
      WHERE empresaid = $1 AND manutencao_parametro_id = $2
        AND estado = 'aplicado'
      LIMIT 1
    `, [empresa, registo]);

    if (aplicada.rowCount) {
      throw erroHttp(409, 'Esta pendência já foi resolvida. Atualiza a lista.');
    }

    // "Sem stock" também fica registado com data, mantendo o aviso visível.
    const confirmacao = await client.query(`
      INSERT INTO confirmacoes_pendencias_produtos
        (empresaid, manutencao_parametro_id, estado)
      VALUES ($1, $2, $3)
      RETURNING id, estado, confirmado_em
    `, [empresa, registo, estado]);

    await client.query('COMMIT');
    return confirmacao.rows[0];
  } catch (erro) {
    await client.query('ROLLBACK').catch(() => {});
    throw erro;
  } finally {
    client.release();
  }
}

module.exports = { confirmarPendenciaProduto };
