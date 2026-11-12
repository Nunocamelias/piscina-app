'use strict';

// O histórico químico usa os registos de manutenções concluídas e nunca as notificações
// da Central de Mensagens. Uma falta de stock só é resolvida por uma validação posterior
// do mesmo parâmetro como "aplicado" ou "nao necessario".
const SQL_HISTORICO_PRODUTOS = `
  WITH ultimas_visitas AS (
    SELECT DISTINCT ON (m.cliente_id)
      m.cliente_id,
      m.id AS manutencao_id,
      COALESCE(m.data_conclusao, m.data_manutencao) AS data_visita
    FROM manutencoes m
    WHERE m.empresaid = $1
      AND m.cliente_id = ANY($2::integer[])
      AND m.status = 'concluida'
    ORDER BY m.cliente_id,
      COALESCE(m.data_conclusao, m.data_manutencao) DESC,
      m.id DESC
  ),
  ultimas_validacoes AS (
    SELECT DISTINCT ON (m.cliente_id, mp.parametro)
      m.cliente_id,
      mp.id AS registo_id,
      mp.parametro,
      mp.produto_usado,
      mp.quantidade_usada,
      mp.status,
      COALESCE(m.data_conclusao, m.data_manutencao) AS data_visita
    FROM manutencoes m
    JOIN manutencoes_parametros mp
      ON mp.manutencao_id = m.id AND mp.empresaid = m.empresaid
    WHERE m.empresaid = $1
      AND m.cliente_id = ANY($2::integer[])
      AND m.status = 'concluida'
      AND mp.status IN ('sem estoque', 'aplicado', 'nao necessario')
    ORDER BY m.cliente_id, mp.parametro,
      COALESCE(m.data_conclusao, m.data_manutencao) DESC,
      m.id DESC, mp.id DESC
  )
  SELECT
    uv.cliente_id,
    uv.registo_id,
    uv.parametro,
    uv.produto_usado,
    uv.quantidade_usada,
    'pendente'::text AS tipo,
    uv.data_visita
  FROM ultimas_validacoes uv
  WHERE uv.status = 'sem estoque'
    AND NOT EXISTS (
      SELECT 1 FROM confirmacoes_pendencias_produtos cp
      WHERE cp.empresaid = $1 AND cp.manutencao_parametro_id = uv.registo_id
        AND cp.estado = 'aplicado'
    )
  UNION ALL
  SELECT
    u.cliente_id,
    NULL::integer AS registo_id,
    mp.parametro,
    mp.produto_usado,
    mp.quantidade_usada,
    'aplicado'::text AS tipo,
    u.data_visita
  FROM ultimas_visitas u
  JOIN manutencoes_parametros mp
    ON mp.manutencao_id = u.manutencao_id AND mp.empresaid = $1
  WHERE mp.status = 'aplicado'
  ORDER BY cliente_id, tipo, parametro
`;

function formatarQuantidadeProduto(quantidadeKg) {
  const kg = Number(String(quantidadeKg ?? '').replace(',', '.'));
  if (!Number.isFinite(kg) || kg <= 0) return null;
  if (kg < 1) return `${Math.round(kg * 1000)} g`;
  return `${kg.toFixed(3).replace('.', ',')} kg`;
}

function organizarMensagensProdutos(registos) {
  const porCliente = Object.create(null);

  for (const registo of registos || []) {
    const id = Number(registo.cliente_id);
    const tipo = registo.tipo;
    const produto = String(registo.produto_usado ?? '').trim();
    const quantidade = formatarQuantidadeProduto(registo.quantidade_usada);

    if (!Number.isInteger(id) || id <= 0 || !['pendente', 'aplicado'].includes(tipo)
      || !produto || !quantidade) continue;

    if (!porCliente[id]) porCliente[id] = { pendentes: [], aplicados: [] };

    const mensagem = {
      parametro: String(registo.parametro ?? '').trim(),
      produto,
      quantidade,
    };

    if (tipo === 'pendente') {
      const registoId = Number(registo.registo_id);
      if (registo.registo_id != null && Number.isSafeInteger(registoId) && registoId > 0) {
        mensagem.registo_id = registoId;
      }
      porCliente[id].pendentes.push(mensagem);
    } else {
      porCliente[id].aplicados.push(mensagem);
    }
  }

  return porCliente;
}

async function consultarMensagensProdutos(pool, empresaid, clienteIds) {
  if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
    return Object.create(null);
  }

  const resultado = await pool.query(SQL_HISTORICO_PRODUTOS, [empresaid, clienteIds]);
  return organizarMensagensProdutos(resultado.rows);
}

module.exports = {
  SQL_HISTORICO_PRODUTOS,
  formatarQuantidadeProduto,
  organizarMensagensProdutos,
  consultarMensagensProdutos,
};
