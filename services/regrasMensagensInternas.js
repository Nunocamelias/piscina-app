'use strict';

// Regras centrais. Nunca confiar no empresaid, equipa ou papel enviados pelo telemovel.
const PERFIS_TECNICOS = new Set(['equipe', 'equipa_manutencao', 'equipa_tecnica']);

function inteiroPositivo(valor) {
  if (typeof valor !== 'number' &&
      !(typeof valor === 'string' && /^\d+$/.test(valor.trim()))) return null;
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
  const empresaId = inteiroPositivo(utilizador.empresaid);
  if (!empresaId || empresaId !== inteiroPositivo(conversa.empresaid)) return false;
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
  // Respostas com fotos: apenas JPEG comprimido e com tamanho limitado.
  // A app já utiliza esta conversão noutros ecrãs; não são necessárias bibliotecas novas.
  const prefixoFoto = 'data:image/jpeg;base64,';
  const fotoValida = a => typeof a === 'string' &&
    a.startsWith(prefixoFoto) &&
    a.length <= 2200000 &&
    a.length > prefixoFoto.length + 4 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(a.slice(prefixoFoto.length));
  const urlValido = a => typeof a === 'string' && /^https:\/\//i.test(a) && a.length <= 2048;
  const totalFotos = anexos.filter(a => typeof a === 'string' && a.startsWith('data:')).length;
  if (anexos.length > 8 || totalFotos > 2 || anexos.some(a => !urlValido(a) && !fotoValida(a))) {
    return { erro: 'Até 2 fotografias JPEG comprimidas (1,6 MB cada) ou endereços HTTPS válidos.' };
  }
  if (!mensagem && !anexos.length) return { erro: 'Escreva uma mensagem ou anexe uma fotografia.' };
  return { texto: mensagem || null, anexos };
}

module.exports = {
  PERFIS_TECNICOS, inteiroPositivo, eAdministrador, eTecnico,
  podeLerConversa, podeGerirConversa, validarConteudoMensagem,
};
