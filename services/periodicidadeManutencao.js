'use strict';



// Calendário quinzenal por última conclusão; o dia habitual da equipa mantém-se.

// As datas da BD devem chegar como YYYY-MM-DD (sem conversão de fuso).

const DIAS_MANUTENCAO = Object.freeze({
  "Segunda-feira": 1,
  "Terça-feira": 2,
  "Quarta-feira": 3,
  "Quinta-feira": 4,
  "Sexta-feira": 5,
  "Sábado": 6,
  "Domingo": 7
});

function dataLisboaISO(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Europe/Lisbon', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(agora);
  const p = Object.fromEntries(partes.map(({type,value})=>[type,value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function somarDiasISO(iso, dias) {
  const data = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(data.getTime())) throw new Error(`Data inválida: ${iso}`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0,10);
}

function numeroDiaSemanaISO(iso) {
  const dia = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

function normalizarFrequencia(valor) {
  const v = String(valor ?? '').trim().toLowerCase();
  if (v === 'quinzenal' || v === 'quinzenalmente' || v.includes('semana sim')) return 'quinzenal';
  if (/^[1-6]$/.test(v) || /^[1-6] (vez|vezes) por semana$/.test(v)) return 'semanal';
  return null;
}

function epocaNaData(cliente, dataISO) {
  const mes = Number(dataISO.slice(5, 7));
  const inicioVerao = Number(cliente.mes_inicio_verao) || 5;
  const inicioInverno = Number(cliente.mes_inicio_inverno) || 11;
  if (
    mes < 1 || mes > 12 ||
    inicioVerao < 1 || inicioVerao > 12 ||
    inicioInverno < 1 || inicioInverno > 12 ||
    inicioVerao === inicioInverno
  ) {
    return null; // Configuração inválida: usar preços e periodicidade gerais.
  }
  const verao = inicioVerao < inicioInverno
    ? mes >= inicioVerao && mes < inicioInverno
    : mes >= inicioVerao || mes < inicioInverno;
  return verao ? 'verao' : 'inverno';
}

function valorMensalidadeNaData(cliente, dataISO) {
  const epoca = epocaNaData(cliente, dataISO);
  const sazonal = epoca === 'verao'
    ? cliente.valor_manutencao_verao
    : epoca === 'inverno' ? cliente.valor_manutencao_inverno : null;
  // NULL = valor não configurado: manter mensalidade antiga.
  // Zero é um valor explícito e não deve ser substituído pelo valor geral.
  const escolhido = sazonal === null || sazonal === undefined || sazonal === ''
    ? cliente.valor_manutencao : sazonal;
  const numero = Number(String(escolhido ?? 0).replace(',', '.'));
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) / 100 : 0;
}

function frequenciaNaData(cliente, dataISO) {
  const epoca = epocaNaData(cliente, dataISO);
  const sazonal = epoca === 'verao'
    ? cliente.periodicidade_verao
    : epoca === 'inverno' ? cliente.periodicidade_inverno : null;
  return normalizarFrequencia(sazonal ?? cliente.periodicidade);
}

function avaliarAgendaManutencao(cliente, diaHabitual, ultimaConclusaoISO, hojeISO = dataLisboaISO()) {
  const frequencia = frequenciaNaData(cliente, hojeISO);
  const diaNumero = DIAS_MANUTENCAO[diaHabitual];
  if (frequencia !== 'quinzenal' || !diaNumero) {
    return {frequencia:frequencia || 'semanal', agenda_estado:'normal', visita_programada:true, proxima_visita:null};
  }
  const segunda = somarDiasISO(hojeISO, 1 - numeroDiaSemanaISO(hojeISO));
  const ultimo = ultimaConclusaoISO || null;
  const concluidaSemana = Boolean(ultimo && ultimo >= segunda && ultimo <= somarDiasISO(segunda,6));
  const proxima = ultimo
  ? (() => {
      const segundaDaUltimaSemana = somarDiasISO(
        ultimo,
        1 - numeroDiaSemanaISO(ultimo)
      );

      return somarDiasISO(
        segundaDaUltimaSemana,
        14 + diaNumero - 1
      );
    })()
  : null;
  const diaProgramado = somarDiasISO(segunda, diaNumero - 1);
  const programada = !concluidaSemana && (!proxima || proxima <= diaProgramado);
  return {
    frequencia, agenda_estado: concluidaSemana ? 'concluida' : programada ? 'programada' : 'sem_visita',
    visita_programada: programada,
    proxima_visita: proxima || diaProgramado,
  };
}

module.exports = { dataLisboaISO, somarDiasISO, normalizarFrequencia, epocaNaData, frequenciaNaData, valorMensalidadeNaData, avaliarAgendaManutencao };

