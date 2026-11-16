'use strict';

// Regras centrais. Nunca confiar no empresaid, equipa ou papel enviados pelo telemovel.
const PERFIS_TECNICOS = new Set(['equipe', 'equipa_manutencao', 'equipa_tecnica']);

function inteiroPositivo(valor) {
  const n = Number(valor);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function eAdministrador(utilizador) {
  return utilizador?.tipo_usuario === 'admin';
}

function eTecnico(utilizador) {
  return PERFIS_TECNICOS.has(utilizador?.tipo_usuario);
}

function podeLerConversa(utilizador, conversa) {
  if (!utilizador || !conversa) return false;
  if (inteiroPositivo(utilizador.empresaid) !== inteiroPositivo(conversa.empresaid)) return false;
  if (eAdministrador(utilizador)) return true;
  return eTecnico(utilizador) &&
    inteiroPositivo(utilizador.equipeid) !== null &&
    inteiroPositivo(utilizador.equipeid) === inteiroPositivo(conversa.equipeid);
}

function podeGerirConversa(utilizador, conversa) {
  return eAdministrador(utilizador) && podeLerConversa(utilizador, conversa);
}

function validarConteudoMensagem(texto, anexos) {
  const mensagem = typeof texto === 'string' ? texto.trim() : '';
  if (mensagem.length > 5000) return { erro: 'Mensagem demasiado longa (limite 5000 caracteres).' };
  if (!Array.isArray(anexos)) return { erro: 'Os anexos devem ser uma lista.' };
  if (anexos.length > 8 || anexos.some(a => typeof a !== 'string' || !/^https:\/\//i.test(a) || a.length > 2048)) {
    return { erro: 'São permitidos até 8 anexos com endereços HTTPS válidos.' };
  }
  if (!mensagem && !anexos.length) return { erro: 'Escreva uma mensagem ou anexe uma fotografia.' };
  return { texto: mensagem || null, anexos };
}

module.exports = {
  PERFIS_TECNICOS, inteiroPositivo, eAdministrador, eTecnico,
  podeLerConversa, podeGerirConversa, validarConteudoMensagem,
};
