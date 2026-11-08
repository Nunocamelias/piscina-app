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

function frequenciaNaData(cliente, dataISO) {
  const mes = Number(dataISO.slice(5,7));
  const inicioV = Number(cliente.mes_inicio_verao) || 5;
  const inicioI = Number(cliente.mes_inicio_inverno) || 11;
  if (inicioV < 1 || inicioV > 12 || inicioI < 1 || inicioI > 12 || inicioV === inicioI) {
    return normalizarFrequencia(cliente.periodicidade);
  }
  const verao = inicioV < inicioI
    ? mes >= inicioV && mes < inicioI
    : mes >= inicioV || mes < inicioI;
  const valor = verao ? cliente.periodicidade_verao : cliente.periodicidade_inverno;
  return normalizarFrequencia(valor ?? cliente.periodicidade);
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
        const candidato = somarDiasISO(ultimo, 14);
        return somarDiasISO(candidato, (diaNumero - numeroDiaSemanaISO(candidato) + 7) % 7);
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

module.exports = { dataLisboaISO, normalizarFrequencia, frequenciaNaData, avaliarAgendaManutencao };

