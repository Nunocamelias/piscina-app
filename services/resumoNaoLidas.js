'use strict';

// Apenas metadados da listagem; nunca guardar texto, fotografias ou tokens.
function resumoNaoLidas(conversas) {
  const porAssunto = {};
  let total = 0;
  if (!Array.isArray(conversas)) return { total: 0, porAssunto };
  for (const conversa of conversas) {
    const id = Number(conversa?.id);
    const naoLidas = Number(conversa?.nao_lidas);
    if (!Number.isSafeInteger(id) || id <= 0 ||
        !Number.isSafeInteger(naoLidas) || naoLidas < 0) continue;
    porAssunto[String(id)] = naoLidas;
    total = Math.min(total + naoLidas, 9999);
  }
  return { total, porAssunto };
}

function chegaramMensagensNovas(anterior, atual) {
  if (!anterior || !atual) return false; // Sem aviso no primeiro carregamento.
  return Object.entries(atual.porAssunto || {}).some(([id, valor]) =>
    valor > (anterior.porAssunto?.[id] || 0)
  );
}

module.exports = { resumoNaoLidas, chegaramMensagensNovas };
