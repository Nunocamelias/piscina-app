import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, Image, TextInput, Modal, Appearance, Linking } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { Picker } from '@react-native-picker/picker';
import ImageViewing from "react-native-image-viewing";


type Notificacao = {
  id: number;
  // 🔹 Cliente
  cliente_nome: string;
  cliente_morada?: string | null;
  cliente_telefone?: string | null;
  cliente_email?: string | null;
  cliente_google_maps?: string | null;
  // 🔹 Texto principal
  assunto?: string | null;
  mensagem: string;
  status: string;
  etapa_atual?: string | null;
  // 🔹 Datas
  data_criacao: string;
  data_resolucao?: string | null;
  data_atualizacao_status?: string | null;
  // 🔹 Anexos
  anexos?: string[] | null;
  // 🔹 Workflow / financeiro
  valor_servico_extra?: number | string | null;
  fatura_paga?: boolean | null;
  orcamento_obrigatorio?: boolean | null;
  orcamento_aprovado?: boolean | null;
  referencia_orcamento?: string | null;
  valor_orcamento?: number | null;
  // 🔹 Ligações com outros atores
  equipe_nome?: string | null;
  responsavel_id?: number | null;
  responsavel_tipo?: string | null;
  responsavel_nome?: string | null;
  criador_nome?: string | null;
  tecnico_nome?: string | null;
  // 🔹 Compat com código antigo
  tecnico_id?: number | null;    
  atribuido_a?: string | null;
  detalhes_fluxo?: string | null;
  em_garantia?: boolean | null;
};

type StatusNotificacao =
  | 'pendente'
  | 'em resolução'
  | 'resolvido'
  | 'orcamento_recusado'
  | 'concluido_garantia'
  | 'pago'
  | string;

type HistoricoPasso = {
  id: number;
  de_user_id: number | null;
  de_nome: string | null;
  de_tipo: string | null;
  para_tipo: string | null;
  status: string | null;
  etapa: string | null;
  mensagem: string | null;
  created_at: string;
};

type UsuarioEmpresa = {
  id: number;
  nome: string;
  email?: string | null;
  tipo_usuario: string;
  equipeid?: number | null;
  empresaid: number;
};

type TipoUsuario =
  | 'admin'
  | 'orcamentacao'
  | 'contabilidade'
  | 'equipa_tecnica'
  | 'equipa_manutencao'
  | 'equipe'
  | string;

const ACAO_TIPOS_DESTINO: Record<string, TipoUsuario[]> = {
  // ORÇAMENTAÇÃO
  tec_diag_conclui_orcamento: ['orcamentacao'],
  admin_enviar_orcamento: ['orcamentacao'],

  // CONTABILIDADE
  tec_reparado_enviar_contabilidade: ['contabilidade'], // ✅ (já falo abaixo)
  // admin_enviar_contabilidade: ['contabilidade'], // se existires no teu fluxo

  // TÉCNICO
  admin_enviar_tecnico_diagnostico: ['equipa_tecnica', 'equipa_manutencao', 'equipe'], // ✅ FALTAVA
  admin_enviar_tecnico: ['equipa_tecnica', 'equipa_manutencao', 'equipe'],
  orc_aprovar_enviar_tecnico: ['equipa_tecnica', 'equipa_manutencao', 'equipe'],

  // ADMIN
  orc_recusar_devolver_admin: ['admin'],
  tec_diag_conclui_admin: ['admin'],
};

const LABEL_TIPO_USUARIO: Record<string, string> = {
  admin: 'Administração',
  orcamentacao: 'Orçamentação',
  contabilidade: 'Contabilidade',
  equipa_tecnica: 'Equipa Técnica',
  equipa_manutencao: 'Equipa Manutenção',
  equipe: 'Equipa Manutenção', // 👈 ESTE É O FIX
};

function getColorsByStatusEtapa(
  statusRaw?: string | null,
  etapaRaw?: string | null
) {
  const status = ((statusRaw || '').toLowerCase() as StatusNotificacao) || '';
  const etapa = (etapaRaw || '').toLowerCase();

  // Valores base 🧱
  let borderColor = '#000000';
  let backgroundColor = '#FFFFFF';

  // Cor base pelo status – usando as tuas cores "esbatidas" 🎯
  switch (status) {
    case 'pendente':
      borderColor = '#FF0000';   // moldura vermelho forte
      backgroundColor = '#FFB3B3'; // fundo vermelho esbatido
      break;
    case 'em resolução':
      borderColor = '#FFA500';   // moldura laranja
      backgroundColor = '#FFF5CC'; // fundo amarelo esbatido
      break;
    case 'resolvido':
      borderColor = '#008000';   // moldura verde
      backgroundColor = '#CCFFCC'; // fundo verde esbatido
      break;
      case 'orcamento_recusado':
  borderColor = '#008000';    // ou outra
  backgroundColor = '#CCFFCC'; // ou outra
  break;

case 'concluido_garantia':
  borderColor = '#008000';
  backgroundColor = '#CCFFCC';
  break;

case 'pago':
  borderColor = '#008000';
  backgroundColor = '#CCFFCC';
  break;

    default:
      borderColor = '#000000';
      backgroundColor = '#FFFFFF';
      break;
  }

  // Ajuste pela ETAPA – só mexemos na moldura 🎨
  switch (etapa) {
    case 'admin':
      borderColor = '#1565C0'; // azul
      break;
    case 'orcamento':
      borderColor = '#6A1B9A'; // roxo
      break;
    case 'tecnico':
      borderColor = '#2E7D32'; // verde forte
      break;
    case 'contabilidade':
      borderColor = '#F9A825'; // amarelo forte
      break;
    default:
      break;
  }

  return { borderColor, backgroundColor };
}

const isDarkMode = Appearance.getColorScheme() === 'dark';

const formatarStatus = (status?: string | null) => {
  if (!status) return 'sem estado';
  return status.replace(/_/g, ' ');
};

const formatarEmResponsavel = (n: Notificacao) => {
  const status = (n.status || '').toLowerCase();
  const etapa = (n.etapa_atual || '').toLowerCase();

  // ✅ 1) Notificações fechadas: não mostrar área/responsável
  if (status === 'pago') {
    return '✅ Concluída — paga';
  }

  if (status === 'concluido_garantia') {
    return '🛡️ Concluída em garantia';
  }

  // ✅ 2) Área humana por etapa
  let area = 'Em curso';

  if (etapa === 'admin') area = 'Na Administração';
  else if (etapa === 'orcamento') area = 'Em Orçamentação';
  else if (etapa === 'diagnostico') area = 'Em Diagnóstico';
  else if (etapa === 'tecnico') area = 'Com Técnico';
  else if (
    etapa === 'contabilidade' ||
    etapa === 'aguardar_faturacao' ||
    etapa === 'aguardar_pagamento'
  ) area = 'Em Contabilidade';

  // ✅ 3) Só mostrar "— Nome" se existir
  const nome = n.responsavel_nome?.trim();
  if (nome && nome.length > 0) {
    return `${area} — ${nome}`;
  }

  // Sem responsável → não poluir com "por atribuir"
  return area;
};

const ReceberNotificacoesScreen = () => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [empresaid, setEmpresaid] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tipoUsuarioLogado, setTipoUsuarioLogado] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);
  const [mostrarModalImagem, setMostrarModalImagem] = useState(false);
  const [acoesSelecionadas, setAcoesSelecionadas] = useState<{ [id: number]: string }>({});
  const [observacoes, setObservacoes] = useState<{ [id: number]: string }>({});
  const [destinatarioVisual, setDestinatarioVisual] = useState<{ [id: number]: string }>({});
  const [historicos, setHistoricos] = useState<Record<number, HistoricoPasso[]>>({});
  const [historicoExpandido, setHistoricoExpandido] = useState<Record<number, boolean>>({});
  const [empresaNome, setEmpresaNome] = useState('');
  const [referenciasOrcamento, setReferenciasOrcamento] = useState<{ [id: number]: string }>({});
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<UsuarioEmpresa[]>([]);


  const toggleHistorico = (id: number) => {
  setHistoricoExpandido(prev => ({
    ...prev,
    [id]: !prev[id],
  }));
};

const usuariosPermitidosParaAcao = (acao?: string): UsuarioEmpresa[] => {
  if (!acao) return [];

  const allowed = ACAO_TIPOS_DESTINO[acao];
  if (!allowed) return [];

  return usuariosEmpresa.filter((u: UsuarioEmpresa) =>
    allowed.includes(u.tipo_usuario as TipoUsuario)
  );
};


  const fetchedOnce = React.useRef(false);
    // 🔹 Lista de ações disponíveis conforme o tipo de utilizador + etapa da notificação
  
  
    const getAcoesDisponiveis = (n: Notificacao) => {
  const opcoes: { value: string; label: string }[] = [];

  // 🟦 ADMIN – controla o início do fluxo e pode apagar no fim
if (isAdmin) {
  const fechadoTotal =
    n.status === 'pago' || n.status === 'concluido_garantia';
  // opcional: || n.status === 'resolvido'

  const orcamentoRecusado = n.status === 'orcamento_recusado';

  // ✅ Se for orçamento recusado e já voltou à Admin:
  // Admin deve conseguir reenviar para orçamentação e também apagar
  if (n.etapa_atual === 'admin' && orcamentoRecusado) {
    opcoes.push(
      {
        value: 'admin_enviar_orcamento',
        label: 'Rever e enviar para Orçamentação novamente',
      },
      {
        value: 'admin_apagar',
        label: 'Apagar notificação',
      }
    );
  } else {
    // ✅ Fluxo normal da Admin (só se não estiver fechado total)
    if (n.etapa_atual === 'admin' && !fechadoTotal) {
      opcoes.push(
        {
          value: 'admin_enviar_tecnico_diagnostico',
          label: 'Enviar técnico para diagnóstico',
        },
        {
          value: 'admin_enviar_tecnico',
          label: 'Enviar para Técnico (garantia)',
        },
        {
          value: 'admin_enviar_orcamento',
          label: 'Enviar para Orçamentação',
        }
      );
    }

    // ✅ Admin pode apagar quando está fechado total
    if (fechadoTotal) {
      opcoes.push({
        value: 'admin_apagar',
        label: 'Apagar notificação',
      });
    }
  }
}

  // 🟧 ORÇAMENTAÇÃO – fluxo em três fases (cliente + fornecedor)
if (isOrcamentacao && n.etapa_atual === 'orcamento') {
  // 1️⃣ Ainda a preparar orçamento (antes de enviar ao cliente)
  if (n.status === 'aguardar_orcamento' || n.status === 'pendente') {
    opcoes.push(
      {
        value: 'orc_enviar_cliente',
        label: 'Orçamento enviado ao cliente (aguardar resposta)',
      },
      {
        value: 'orc_aguardar_fornecedor',
        label: 'Aguardar resposta do fornecedor (falta valor)',
      }
    );
  }

  // 2️⃣ À espera de resposta do fornecedor
  if (n.status === 'aguardar_resposta_fornecedor') {
    opcoes.push({
      value: 'orc_enviar_cliente',
      label: 'Orçamento enviado ao cliente (aguardar resposta)',
    });
  }

  // 3️⃣ Já enviado ao cliente, à espera da decisão
  if (n.status === 'aguardar_resposta_cliente') {
    opcoes.push(
      {
        value: 'orc_aprovar_enviar_tecnico',
        label: 'Orçamento aprovado → enviar para Técnico',
      },
      {
        value: 'orc_recusar_devolver_admin',
        label: 'Orçamento recusado → devolver à Administração',
      }
    );
  }
}


  // 🟨 EQUIPA TÉCNICA – diagnóstico
  if (isEquipeTecnica && n.etapa_atual === 'diagnostico') {
    opcoes.push(
      {
        value: 'tec_diag_conclui_admin',
        label: 'Diagnóstico concluído → devolver à Administração',
      },
      {
        value: 'tec_diag_conclui_orcamento',
        label: 'Diagnóstico concluído → enviar para Orçamentação',
      }
    );
  }

  // 🟩 EQUIPAS – fase técnica “normal”
  if ((isEquipeManutencao || isEquipeTecnica) && n.etapa_atual === 'tecnico') {
    opcoes.push({
      value: 'tec_reparado_enviar_contabilidade',
      label: 'Reparação concluída → enviar para Contabilidade',
    });
  }

  // 🟪 CONTABILIDADE – faturação, pagamento e garantia
  const isGarantia = n.em_garantia === true;

if (
  isContabilidade &&
  (n.etapa_atual === 'aguardar_faturacao' ||
    n.etapa_atual === 'aguardar_pagamento' ||
    n.etapa_atual === 'contabilidade')
) {
  if (isGarantia) {
    // ✅ Garantia: só 1 ação
    opcoes.push({
      value: 'cont_garantia_concluir',
      label: 'Serviço em garantia / concluir processo',
    });
  } else {
  // ✅ Não-garantia: faturação normal (2 fases)
  // ✅ Chegou à contabilidade vindo do técnico (status reparado)
// trata como "aguardar faturação" (primeiro passo)
if (n.etapa_atual === 'contabilidade' && n.status === 'reparado') {
  opcoes.push(
    {
      value: 'cont_aguardar_dados_cliente',
      label: 'Aguardar dados do cliente para faturar',
    },
    {
      value: 'cont_fatura_enviada',
      label: 'Fatura emitida / enviada ao cliente',
    }
  );
}

  // 1️⃣ Ainda a aguardar faturação (antes de enviar ao cliente)
  if (n.etapa_atual === 'aguardar_faturacao') {
  // ✅ Sempre possível emitir/enviar fatura
  opcoes.push({
    value: 'cont_fatura_enviada',
    label: 'Fatura emitida / enviada ao cliente',
  });

  // ✅ Só mostra "Aguardar dados" se AINDA NÃO estiver nesse estado
  if (n.status !== 'aguardar_dados_cliente_fatura') {
    opcoes.push({
      value: 'cont_aguardar_dados_cliente',
      label: 'Aguardar os dados do cliente para faturar',
    });
  }
}


  // 2️⃣ Depois de faturar (ou seja, já está em aguardar pagamento)
  if (n.etapa_atual === 'aguardar_pagamento') {
    opcoes.push({
      value: 'cont_pago_concluir',
      label: 'Pagamento recebido / concluir processo',
    });
  }
}

}
  return opcoes;
};

    const acaoRequerDestinatario = (acao?: string) => {
  if (!acao) return false;

  const acoesQueExigem = new Set<string>([
    'admin_enviar_tecnico_diagnostico',
    'admin_enviar_tecnico',
    'admin_enviar_orcamento',
    'orc_aprovar_enviar_tecnico',
    'tec_reparado_enviar_contabilidade',
    'tec_diag_conclui_orcamento',
    'tec_diag_conclui_admin',
  ]);

  return acoesQueExigem.has(acao);
};


  const executarAcao = async (n: Notificacao) => {
  const acao = acoesSelecionadas[n.id];
  const obs = (observacoes[n.id] || '').trim();
  // 🛑 Validação obrigatória da referência de orçamento
if (acao === 'orc_enviar_cliente') {
  const ref = (referenciasOrcamento[n.id] || '').trim();

  if (!ref) {
    Alert.alert(
      'Atenção',
      'É obrigatório preencher a referência do orçamento (nº ou data do email).'
    );
    return;
  }
}

  if (!acao) {
    Alert.alert('Atenção', 'Selecione uma ação antes de continuar.');
    return;
  }
  // ✅ Se a ação exige destinatário, tem de escolher obrigatoriamente
if (acaoRequerDestinatario(acao)) {
  const dest = (destinatarioVisual[n.id] || '').trim();

  if (!dest) {
    Alert.alert('Atenção', 'Tem de selecionar para quem vai (obrigatório).');
    return;
  }
}

  if (!empresaid) {
    Alert.alert('Erro', 'Empresaid não encontrado. Faça login de novo.');
    return;
  }

  try {
        switch (acao) {
      // 🟦 ADMIN → envia técnico para diagnóstico (Modelo B: atribui responsável)
      case 'admin_enviar_tecnico_diagnostico': {
  const responsavelId = Number(destinatarioVisual[n.id]);

  await axios.post(
    `${Config.API_URL}/notificacoes/${n.id}/enviar-tecnico-diagnostico`,
    {
      empresaid,
      responsavel_id: responsavelId,
      detalhes_fluxo: obs || null,
    }
  );

  const nomeResp =
    usuariosEmpresa.find(u => u.id === responsavelId)?.nome || null;

  setNotificacoes(prev =>
    prev.map(item =>
      item.id === n.id
        ? {
            ...item,
            status: 'em_diagnostico',
            etapa_atual: 'diagnostico',
            responsavel_id: responsavelId,
            responsavel_nome: nomeResp,
            detalhes_fluxo: obs || item.detalhes_fluxo || null,
          }
        : item
    )
  );

  Alert.alert('Sucesso', 'Enviado para diagnóstico.');
  break;
}

      // 🟦 ADMIN → envia directamente para Técnico (garantia) (Modelo B: atribui responsável)
      case 'admin_enviar_tecnico': {
  const responsavelId = Number(destinatarioVisual[n.id]);

  await axios.post(
    `${Config.API_URL}/notificacoes/${n.id}/enviar-tecnico-garantia`,
    {
      empresaid,
      responsavel_id: responsavelId,
      detalhes_fluxo: obs || null,
    }
  );

  const nomeResp =
    usuariosEmpresa.find(u => u.id === responsavelId)?.nome || null;

  setNotificacoes(prev =>
    prev.map(item =>
      item.id === n.id
        ? {
            ...item,
            status: 'em_resolucao',
            etapa_atual: 'tecnico',
            em_garantia: true,
            responsavel_id: responsavelId,
            responsavel_nome: nomeResp,
            detalhes_fluxo: obs || item.detalhes_fluxo || null,
          }
        : item
    )
  );

  Alert.alert('Sucesso', 'Enviado para Técnico (garantia).');
  break;
}

      // 🟦 ADMIN → envia para Orçamentação (Modelo B: atribui responsável)
      case 'admin_enviar_orcamento': {
  const responsavelId = Number(destinatarioVisual[n.id]);

  await axios.post(
    `${Config.API_URL}/notificacoes/${n.id}/enviar-orcamento`,
    {
      empresaid,
      responsavel_id: responsavelId,
      detalhes_fluxo: obs || null,
      de_user_id: usuarioId ?? null,
      de_tipo: 'admin',
    }
  );

  const nomeResp =
    usuariosEmpresa.find(u => u.id === responsavelId)?.nome || null;

  setNotificacoes(prev =>
    prev.map(item =>
      item.id === n.id
        ? {
            ...item,
            status: 'aguardar_orcamento',
            etapa_atual: 'orcamento',
            orcamento_obrigatorio: true,
            em_garantia: false,
            responsavel_id: responsavelId,
            responsavel_nome: nomeResp,
            detalhes_fluxo: obs || item.detalhes_fluxo || null,
          }
        : item
    )
  );

  Alert.alert('Sucesso', 'Enviado para Orçamentação.');
  break;
}


      // 🟧 ORÇAMENTAÇÃO → orçamento enviado ao cliente
      case 'orc_enviar_cliente': {
        const ref = (referenciasOrcamento[n.id] || '').trim();
        await axios.post(
          `${Config.API_URL}/notificacoes/${n.id}/orcamento-enviado`,
          {
            empresaid,
            detalhes_fluxo: obs || null,
            referencia_orcamento: ref.length > 0 ? ref : null,
          }
        );

        setNotificacoes(prev =>
          prev.map(item =>
            item.id === n.id
              ? {
                  ...item,
                  status: 'aguardar_resposta_cliente',
                  etapa_atual: 'orcamento',
                  detalhes_fluxo: obs || item.detalhes_fluxo || null,
                  referencia_orcamento: ref.length > 0 ? ref : item.referencia_orcamento || null,
                }
              : item
          )
        );

        Alert.alert(
          'Sucesso',
          'Orçamento marcado como enviado ao cliente (aguardar resposta).'
        );
        break;
      }

      // 🟧 ORÇAMENTAÇÃO → aguardar resposta do fornecedor
      case 'orc_aguardar_fornecedor': {
        await axios.post(
          `${Config.API_URL}/notificacoes/${n.id}/orcamento-aguardar-fornecedor`,
          {
            empresaid,
            detalhes_fluxo: obs || null,
          }
          );

        setNotificacoes(prev =>
          prev.map(item =>
            item.id === n.id
             ? {
                ...item,
                status: 'aguardar_resposta_fornecedor',
                etapa_atual: 'orcamento',
                detalhes_fluxo: obs || item.detalhes_fluxo || null,
               }
             : item
            )
           );

        Alert.alert(
          'Sucesso',
          'Marcado como: a aguardar resposta do fornecedor.'
          );
          break;
        }


      // 🟧 ORÇAMENTAÇÃO → orçamento aprovado → vai para Técnico
case 'orc_aprovar_enviar_tecnico': {
  // 1) buscar o ID do técnico selecionado no picker (por notificação)
  const destStr = destinatarioVisual[n.id]; // <-- vem como string ("19") ou "" se vazio
  const responsavelIdFinal = destStr ? Number(destStr) : null;

  if (!responsavelIdFinal || Number.isNaN(responsavelIdFinal)) {
    Alert.alert('Erro', 'Escolhe o técnico antes de enviar.');
    return;
  }

  // 2) empresaid seguro
  let empresaidFinal: number | null = empresaid ?? null;
  if (!empresaidFinal) {
    const stored = await AsyncStorage.getItem('empresaid');
    empresaidFinal = stored ? Number(stored) : null;
  }
  if (!empresaidFinal || Number.isNaN(empresaidFinal)) {
    Alert.alert('Erro', 'Empresaid não encontrado. Faz login novamente.');
    return;
  }

  // 3) de_user_id / de_tipo (opcional mas bom para histórico)
  const storedUserId = await AsyncStorage.getItem('userId');
  const storedTipo = await AsyncStorage.getItem('tipo_usuario');
  const de_user_id = storedUserId ? Number(storedUserId) : null;
  const de_tipo = storedTipo || 'orcamentacao';

  await axios.post(`${Config.API_URL}/notificacoes/${n.id}/orcamento-aprovado`, {
    empresaid: empresaidFinal,
    responsavel_id: responsavelIdFinal,
    detalhes_fluxo: obs?.trim() ? obs.trim() : null,
    de_user_id,
    de_tipo,
  });

  setNotificacoes(prev =>
    prev.map(item =>
      item.id === n.id
        ? {
            ...item,
            status: 'orcamento_aprovado',
            etapa_atual: 'tecnico',
            orcamento_aprovado: true,
            responsavel_id: responsavelIdFinal,
            detalhes_fluxo: obs?.trim() ? obs.trim() : item.detalhes_fluxo || null,
          }
        : item
    )
  );

  Alert.alert('Sucesso', 'Orçamento aprovado e enviado para a equipa técnica.');
  break;
}


      // 🟧 ORÇAMENTAÇÃO → orçamento recusado → devolve à Admin
      case 'orc_recusar_devolver_admin':
        await recusarOrcamento(n);
        break;

      // 🟨 TÉCNICO (diagnóstico) → diagnóstico concluído → devolver à Admin
case 'tec_diag_conclui_admin': {
  const responsavelIdFinal =
    destinatarioVisual[n.id] ? Number(destinatarioVisual[n.id]) : null;

  if (!responsavelIdFinal) {
    Alert.alert('Erro', 'Escolhe a Administração antes de devolver.');
    return;
  }

  const storedTipo = await AsyncStorage.getItem('tipo_usuario');
  const de_tipo = storedTipo || 'equipa_tecnica';

  await axios.post(
  `${Config.API_URL}/notificacoes/${n.id}/diagnostico-admin`,
  {
    empresaid,
    responsavel_id: responsavelIdFinal,
    detalhes_fluxo: obs || null,
    de_user_id: usuarioId ?? null,
    de_tipo, // ✅ agora existe
  }
);

  const nomeResp =
    usuariosEmpresa.find(u => u.id === responsavelIdFinal)?.nome || null;

  setNotificacoes(prev =>
    prev.map(item =>
      item.id === n.id
        ? {
            ...item,
            status: 'aguardar_decisao_admin',
            etapa_atual: 'admin',
            responsavel_id: responsavelIdFinal,    // ✅
            responsavel_nome: nomeResp,            // ✅
            detalhes_fluxo: obs || item.detalhes_fluxo || null,
          }
        : item
    )
  );

  Alert.alert('Sucesso', 'Diagnóstico concluído e devolvido à Administração.');
  break;
}


// 🟨 TÉCNICO (diagnóstico) → diagnóstico concluído → enviar para Orçamentação
case 'tec_diag_conclui_orcamento': {
  const responsavelIdFinal =
    destinatarioVisual[n.id] ? Number(destinatarioVisual[n.id]) : null;

  if (!responsavelIdFinal) {
    Alert.alert('Erro', 'Escolhe a Orçamentação antes de enviar.');
    return;
  }

  await axios.post(`${Config.API_URL}/notificacoes/${n.id}/diagnostico-orcamento`, {
    empresaid,
    responsavel_id: responsavelIdFinal,
    detalhes_fluxo: obs || null,
  });

  setNotificacoes(prev =>
    prev.map(item =>
      item.id === n.id
        ? {
            ...item,
            status: 'aguardar_orcamento',
            etapa_atual: 'orcamento',
            responsavel_id: responsavelIdFinal, // ✅ importante para UI
            detalhes_fluxo: obs || item.detalhes_fluxo || null,
          }
        : item
    )
  );

  Alert.alert('Sucesso', 'Diagnóstico concluído e enviado para Orçamentação.');
  break;
}

      // 🟩 TÉCNICO (reparação) → reparado → vai para contabilidade
      case 'tec_reparado_enviar_contabilidade':
        await marcarReparado(n, obs);
        break;
      // 🟪 CONTABILIDADE → aguardar dados do cliente para faturar
      case 'cont_aguardar_dados_cliente':
        await marcarAguardarDadosCliente(n, obs);
        break;
      // 🟪 CONTABILIDADE → fatura enviada
      case 'cont_fatura_enviada':
        await marcarFaturaEnviada(n, obs);
        break;

      // 🟪 CONTABILIDADE → pagamento recebido
      case 'cont_pago_concluir':
        await marcarPago(n, obs);
        break;

      // 🟪 CONTABILIDADE → serviço em garantia / concluir processo
      case 'cont_garantia_concluir':
        await concluirGarantia(n, obs);
        break;

      // 🗑 ADMIN → apagar notificação
      case 'admin_apagar':
        Alert.alert(
          'Confirmação',
          'Tem a certeza que deseja apagar esta notificação?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Apagar',
              style: 'destructive',
              onPress: () => apagarNotificacao(n.id),
            },
          ]
        );
        return; // sai aqui, sem limpar seleção

      default:
        Alert.alert('Erro', 'Ação desconhecida.');
        return;
    }

    setObservacoes(prev => ({ ...prev, [n.id]: '' }));
    setAcoesSelecionadas(prev => ({ ...prev, [n.id]: '' }));
    setDestinatarioVisual(prev => ({ ...prev, [n.id]: '' })); // ✅ NOVO
    setReferenciasOrcamento(prev => ({ ...prev, [n.id]: '' }));
  } catch (error) {
    console.error('Erro ao executar ação:', error);
    Alert.alert('Erro', 'Não foi possível executar a ação.');
  }
};

 useEffect(() => {
  const carregarContexto = async () => {
    try {
      // 🔹 1. Ler empresaid
      const empresaIdStorage = await AsyncStorage.getItem('empresaid');
      if (empresaIdStorage) {
        const empresaIdNum = Number(empresaIdStorage);
        if (!Number.isNaN(empresaIdNum)) {
          setEmpresaid(empresaIdNum);
        } else {
          if (__DEV__) console.log('⚠️ empresaid inválido no storage:', empresaIdStorage);
          setEmpresaid(null);
        }
      } else {
        Alert.alert('Erro', 'Empresaid não encontrado.');
      }

      // 🔹 2. Ler tipo de utilizador
      const tipoStorage = await AsyncStorage.getItem('tipo_usuario');
      if (tipoStorage) {
        setTipoUsuarioLogado(tipoStorage);
      } else {
        if (__DEV__) console.log('⚠️ tipo_usuario não encontrado no storage');
        setTipoUsuarioLogado(null);
      }

      // 🔹 3. Ler userId (robusto)
      const userIdStorage = await AsyncStorage.getItem('userId');

      if (
        userIdStorage &&
        userIdStorage !== 'undefined' &&
        userIdStorage !== 'null'
      ) {
        const parsedUserId = Number(userIdStorage);
        if (!Number.isNaN(parsedUserId)) {
          setUsuarioId(parsedUserId);
        } else {
          if (__DEV__) console.log('⚠️ userId inválido no storage:', userIdStorage);
          setUsuarioId(null);
        }
      } else {
        setUsuarioId(null);
      }
    } catch (error) {
      console.error('Erro ao carregar contexto do utilizador:', error);
    }
  };

  carregarContexto();
}, []);

   // 🔹 Helpers de permissões baseados no tipo de utilizador 
const isAdmin = tipoUsuarioLogado === 'admin';
const isOrcamentacao = tipoUsuarioLogado === 'orcamentacao';
const isContabilidade = tipoUsuarioLogado === 'contabilidade';
const isEquipeManutencao =
  tipoUsuarioLogado === 'equipa_manutencao' || tipoUsuarioLogado === 'equipe';
const isEquipeTecnica = tipoUsuarioLogado === 'equipa_tecnica';

// 🔹 Modelo B (PURO): só mexe quem é o responsável (exceto Admin)
const utilizadorTemABola = (n: Notificacao): boolean => {
  if (!tipoUsuarioLogado) return false;

  // Admin tem sempre a bola
  if (isAdmin) return true;

  // ✅ Modelo B puro:
  // se houver responsável definido, só ele pode mexer
  if (usuarioId != null && n.responsavel_id != null) {
    return Number(n.responsavel_id) === Number(usuarioId);
  }

  // ✅ fallback (enquanto existirem notificações antigas sem responsável)
  if (isOrcamentacao && n.etapa_atual === 'orcamento') return true;

  if (
    isContabilidade &&
    (n.etapa_atual === 'aguardar_faturacao' ||
      n.etapa_atual === 'aguardar_pagamento' ||
      n.etapa_atual === 'contabilidade')
  ) return true;

  if (
    isEquipeTecnica &&
    (n.etapa_atual === 'tecnico' || n.etapa_atual === 'diagnostico')
  ) return true;

  if (isEquipeManutencao && n.etapa_atual === 'tecnico') return true;

  return false;
};

// 🔹 Mostrar vista "mini" quando o utilizador NÃO tem a bola
const mostrarVistaMini = (n: Notificacao): boolean => {
  return !utilizadorTemABola(n);
};

  // 👇 NOVO: carregar histórico da notificação
const carregarHistorico = async (notificacaoId: number) => {
  if (!empresaid) return; // sem empresaid não fazemos nada

  try {
    const response = await axios.get(
      `${Config.API_URL}/notificacoes/${notificacaoId}/historico`,
      { params: { empresaid } }
    );

    setHistoricos((prev: Record<number, HistoricoPasso[]>) => ({
      ...prev,
      [notificacaoId]: response.data as HistoricoPasso[],
    }));
  } catch (error) {
    console.error('Erro ao carregar histórico da notificação:', error);
    // não mostramos Alert para não chatear o utilizador sempre
  }
};

  useEffect(() => {
  const fetchEmpresa = async () => {
    try {
      const cachedNome = await AsyncStorage.getItem('empresa_nome');
      if (cachedNome) {
        setEmpresaNome(cachedNome);
        return;
      }

      const storedEmpresaid = await AsyncStorage.getItem('empresaid');
      if (!storedEmpresaid) return;

      const empresaIdNum = parseInt(storedEmpresaid, 10);

      const response = await axios.get(`${Config.API_URL}/empresas/${empresaIdNum}`);
      if (response.data?.nome) {
        const nome = response.data.nome;
        setEmpresaNome(nome);
        await AsyncStorage.setItem('empresa_nome', nome); // cache
      }
    } catch (error) {
      console.error('Erro ao carregar nome da empresa:', error);
    }
  };

  fetchEmpresa();
}, []);

  useEffect(() => {
  fetchedOnce.current = false;
}, [empresaid]);

  useEffect(() => {
    const fetchNotificacoes = async () => {
      if (!empresaid) return;

      // ✅ Impede execução duplicada (StrictMode)
      if (fetchedOnce.current) return;
      fetchedOnce.current = true;

      try {
        const res = await axios.get<Notificacao[]>(
          `${Config.API_URL}/notificacoes`,
          {
            params: { empresaid },
          }
        );

        const dados: Notificacao[] = res.data ?? [];

        // ✅ remove notificações duplicadas com base no ID, mas tipado
        const unicos: Notificacao[] = Array.from(
          new Map<number, Notificacao>(dados.map((n) => [n.id, n])).values()
        );

        setNotificacoes(unicos);

        if (__DEV__) console.log('📥 Notificações carregadas (únicas):', unicos);
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        Alert.alert('Erro', 'Não foi possível carregar as notificações.');
      }
    };

    fetchNotificacoes();
}, [empresaid]);

  useEffect(() => {
  const fetchUsuariosEmpresa = async () => {
    if (!empresaid) return;

    try {
      const res = await axios.get<UsuarioEmpresa[]>(
        `${Config.API_URL}/usuarios-empresa`,
        { params: { empresaid } }
      );

      setUsuariosEmpresa(res.data ?? []);
      console.log('👥 Utilizadores carregados:', res.data?.length ?? 0);
    } catch (error) {
      console.error('Erro ao buscar utilizadores da empresa:', error);
      Alert.alert('Erro', 'Não foi possível carregar utilizadores da empresa.');
    }
  };

  fetchUsuariosEmpresa();
}, [empresaid]);

const recusarOrcamento = async (item: Notificacao) => {
  try {
    await axios.put(`${Config.API_URL}/notificacoes/${item.id}/status`, {
      empresaid,
      etapa_atual: 'admin',              // volta à Administração
      status: 'orcamento_recusado',      // ✅ estado correto
      orcamento_obrigatorio: true,
      orcamento_aprovado: false,
    });

    setNotificacoes(prev =>
      prev.map(n =>
        n.id === item.id
          ? {
              ...n,
              etapa_atual: 'admin',
              status: 'orcamento_recusado', // ✅ aqui também
              orcamento_obrigatorio: true,
              orcamento_aprovado: false,
            }
          : n
      )
    );

    Alert.alert(
      'Sucesso',
      'Orçamento marcado como recusado e devolvido à Administração.'
    );
  } catch (error) {
    console.error('Erro ao recusar orçamento:', error);
    Alert.alert('Erro', 'Não foi possível recusar o orçamento.');
  }
};

const marcarReparado = async (item: Notificacao, obs?: string) => {
  if (!empresaid) {
    Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
    return;
  }

  const tecnicoId =
    usuarioId != null
      ? usuarioId
      : item.responsavel_id != null
      ? item.responsavel_id
      : null;

  // ✅ Responsável (Contabilidade) escolhido no picker
  const responsavelIdStr = destinatarioVisual[item.id] || ''; // usa o state que já tens
  const responsavelId = responsavelIdStr ? Number(responsavelIdStr) : null;

  if (!responsavelId) {
    Alert.alert('Atenção', 'Selecione a pessoa da Contabilidade antes de enviar.');
    return;
  }

  try {
    await axios.post(`${Config.API_URL}/notificacoes/${item.id}/reparado`, {
      empresaid,
      tecnico_id: tecnicoId,
      responsavel_id: responsavelId, // ✅ NOVO
      detalhes_fluxo: obs && obs.trim().length > 0 ? obs.trim() : null,
    });

    setNotificacoes((prev) =>
      prev.map((n) =>
        n.id === item.id
          ? {
              ...n,
              status: 'reparado',
              etapa_atual: item.em_garantia ? 'contabilidade' : 'aguardar_faturacao',
              tecnico_id: tecnicoId ?? n.tecnico_id,
              responsavel_id: responsavelId, // ✅ NOVO
              detalhes_fluxo: obs && obs.trim().length > 0 ? obs.trim() : n.detalhes_fluxo,
            }
          : n
      )
    );

    Alert.alert('Sucesso', 'Reparação marcada como concluída e enviada para Contabilidade.');
  } catch (error) {
    console.error('Erro ao marcar reparação concluída:', error);
    Alert.alert('Erro', 'Não foi possível marcar esta notificação como reparada.');
  }
};

const concluirGarantia = async (item: Notificacao, obs?: string) => {
  if (!empresaid) {
    Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
    return;
  }

  const mensagem =
    obs && obs.trim().length > 0
      ? obs.trim()
      : 'Serviço concluído em garantia.';

  try {
    await axios.post(
      `${Config.API_URL}/notificacoes/${item.id}/concluir-garantia`,
      {
        empresaid,
        detalhes_fluxo: mensagem,
      }
    );

    setNotificacoes(prev =>
      prev.map(n =>
        n.id === item.id
          ? {
              ...n,
              status: 'concluido_garantia',
              etapa_atual: 'concluido',
              fatura_paga: false,
              detalhes_fluxo: mensagem,
            }
          : n
      )
    );

    Alert.alert(
      'Sucesso',
      'Processo concluído como serviço em garantia.'
    );
  } catch (error) {
    console.error('Erro ao concluir processo em garantia:', error);
    Alert.alert(
      'Erro',
      'Não foi possível concluir esta notificação em garantia.'
    );
  }
};

const marcarAguardarDadosCliente = async (item: Notificacao, obs?: string) => {
  if (!empresaid) {
    Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
    return;
  }

  const detalhe = obs && obs.trim().length > 0 ? obs.trim() : null;

  try {
    await axios.post(
      `${Config.API_URL}/notificacoes/${item.id}/contabilidade-aguardar-dados-cliente`,
      {
        empresaid,
        detalhes_fluxo: detalhe,
      }
    );

    setNotificacoes(prev =>
      prev.map(n =>
        n.id === item.id
          ? {
              ...n,
              status: 'aguardar_dados_cliente_fatura',
              etapa_atual: 'aguardar_faturacao',
              fatura_paga: false,
              detalhes_fluxo: detalhe !== null ? detalhe : n.detalhes_fluxo,
            }
          : n
      )
    );

    Alert.alert('Sucesso', 'Marcado como: a aguardar dados do cliente para faturar.');
  } catch (error) {
    console.error('Erro ao marcar como aguardar dados do cliente:', error);
    Alert.alert('Erro', 'Não foi possível marcar como "Aguardar dados do cliente".');
  }
};

const marcarFaturaEnviada = async (item: Notificacao, obs?: string) => {
  if (!empresaid) {
    Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
    return;
  }

  const detalhe = obs && obs.trim().length > 0 ? obs.trim() : null;

  // ✅ Modelo B: usar o mesmo se já existir; senão, usar o user logado
  const responsavelIdFinal =
    item.responsavel_id ?? usuarioId ?? null;

  if (!responsavelIdFinal) {
    Alert.alert('Erro', 'Não foi possível determinar o responsável (contabilidade).');
    return;
  }

  try {
    await axios.post(`${Config.API_URL}/notificacoes/${item.id}/fatura-enviada`, {
      empresaid,
      responsavel_id: Number(responsavelIdFinal),
      detalhes_fluxo: detalhe,
      de_user_id: usuarioId ?? null,
      de_tipo: 'contabilidade',
    });

    setNotificacoes(prev =>
      prev.map(n =>
        n.id === item.id
          ? {
              ...n,
              status: 'fatura_enviada',
              etapa_atual: 'aguardar_pagamento', // (já falo disto abaixo)
              fatura_paga: false,
              responsavel_id: Number(responsavelIdFinal),
              detalhes_fluxo: detalhe !== null ? detalhe : n.detalhes_fluxo,
            }
          : n
      )
    );

    Alert.alert('Sucesso', 'Fatura marcada como emitida/enviada.');
  } catch (error: any) {
    console.error('Erro ao marcar fatura como enviada:', error?.response?.data || error);
    Alert.alert('Erro', error?.response?.data?.error || 'Falhou marcar fatura enviada.');
  }
};

const marcarPago = async (item: Notificacao, obs?: string) => {
  if (!empresaid) {
    Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
    return;
  }

  const detalhe = obs && obs.trim().length > 0 ? obs.trim() : null;

  const responsavelIdFinal = item.responsavel_id ?? usuarioId ?? null;

  if (!responsavelIdFinal) {
    Alert.alert('Erro', 'Não foi possível determinar o responsável da Contabilidade.');
    return;
  }

  try {
    await axios.post(`${Config.API_URL}/notificacoes/${item.id}/pago`, {
      empresaid,
      responsavel_id: responsavelIdFinal,
      detalhes_fluxo: detalhe,
      de_user_id: usuarioId ?? null,
      de_tipo: 'contabilidade',
    });

    setNotificacoes(prev =>
      prev.map(n =>
        n.id === item.id
          ? {
              ...n,
              status: 'pago',
              etapa_atual: 'concluido',
              fatura_paga: true,
              responsavel_id: responsavelIdFinal,
              detalhes_fluxo: detalhe !== null ? detalhe : n.detalhes_fluxo,
            }
          : n
      )
    );

    Alert.alert('Sucesso', 'Pagamento registado. Processo concluído.');
  } catch (error) {
    console.error('Erro ao marcar como pago:', error);
    Alert.alert('Erro', 'Não foi possível marcar esta notificação como paga.');
  }
};

const apagarNotificacao = async (id: number) => {
    try {
      await axios.delete(`${Config.API_URL}/notificacoes/${id}`, {
        params: { empresaid },
      });

      setNotificacoes((prev) => prev.filter((n) => n.id !== id));
      Alert.alert('Sucesso', 'Notificação apagada com sucesso!');
    } catch (error) {
      console.error('Erro ao apagar notificação:', error);
      Alert.alert('Erro', 'Erro ao apagar notificação.');
    }
};


    // ⬇️ Daqui para baixo continua com o teu `renderItem` + `return (...)`
const renderItem = ({ item }: { item: Notificacao }) => {

  const temBola = utilizadorTemABola(item);
  const isExpanded = temBola && expandedId === item.id;

  const { borderColor, backgroundColor } = getColorsByStatusEtapa(
    item.status,
    item.etapa_atual
  );

  // 🔹 1) Se o utilizador NÃO tem a bola → mostra cartão MINI (modo leitura)
  if (mostrarVistaMini(item)) {
    return (
      <TouchableOpacity
  onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
  style={[
    styles.card,
    {
      backgroundColor: '#FFF5CC',
      borderWidth: 1,
    },
  ]}
>
  {/* Header: Cliente + ID à direita */}
  <View style={styles.cardTopRow}>
    <Text style={styles.cliente}>{item.cliente_nome}</Text>
    <Text style={styles.notifId}>#{item.id}</Text>
  </View>

  {item.assunto ? <Text style={styles.cliente}>{item.assunto}</Text> : null}
  <Text style={[styles.mensagem, { width: '100%' }]}>{item.mensagem}</Text>
  <Text style={styles.status}>{formatarEmResponsavel(item)}</Text>
  <Text style={styles.status}>Status: {formatarStatus(item.status)}</Text>
  <Text style={styles.viewOnlyText}>
    (Modo de leitura — esta notificação não está atribuída a si)
  </Text>
</TouchableOpacity>

    );
  }

  // 🔹 2) Se TEM a bola → cartão completo (layout novo)
  return (
    <TouchableOpacity
      onPress={() => {
        const novo = expandedId === item.id ? null : item.id;
        setExpandedId(novo);

        // 👇 se vamos expandir e ainda não temos histórico desta notificação → carrega
        if (novo === item.id && !historicos[item.id]) {
          carregarHistorico(item.id);
        }
      }}
      style={[
        styles.card,
        {
          borderColor,
          backgroundColor,
          borderWidth: 2,
        },
      ]}
    >
      {/* 🔹 Header compacto: cliente + mensagem + chips de status/etapa */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cliente}>{item.cliente_nome}</Text>
          {item.assunto ? (
          <Text style={styles.status}>{item.assunto}</Text>
          ) : null}
          <Text
            style={styles.mensagem}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {item.mensagem}
          </Text>
        </View>

        <View style={styles.cardHeaderRight}>
  <Text style={styles.notifId}>Nº{item.id}</Text>

  <Text style={[styles.chip, styles.chipStatus]}>
    {formatarStatus(item.status)}
  </Text>

  {(() => {
    const etapaLabel = item.em_garantia ? 'garantia' : item.etapa_atual;

    return etapaLabel ? (
      <Text style={[styles.chip, styles.chipEtapa]}>
        {etapaLabel}
      </Text>
    ) : null;
  })()}
</View>

      </View>

      {isExpanded && (
  <View style={styles.expandedContent}>
    <Text style={styles.detail}>
      📍 {item.cliente_morada || 'N/D'}
    </Text>

    {/* 📍 Localização (Google Maps) */}
    {item.cliente_google_maps ? (
  (() => {
    const url = item.cliente_google_maps; // aqui o TS já sabe que é string

    return (
      <TouchableOpacity onPress={() => Linking.openURL(url)}>
        <Text style={styles.linkText}>
          📌 Abrir localização no Google Maps
        </Text>
      </TouchableOpacity>
    );
     })()
    ) : (
     <Text style={styles.detail}>📌 Localização: não definida</Text>
    )}

    {item.cliente_telefone && (
     <TouchableOpacity
       onPress={() => Linking.openURL(`tel:${item.cliente_telefone}`)}
     >
       <Text style={styles.linkText}>
         📞 {item.cliente_telefone}
       </Text>
     </TouchableOpacity>
    )}

    {item.cliente_email && (
     <TouchableOpacity
       onPress={() => Linking.openURL(`mailto:${item.cliente_email}`)}
     >
       <Text style={styles.linkText}>
         ✉️ {item.cliente_email}
       </Text>
     </TouchableOpacity>
    )}

    <Text style={styles.detail}>
      🗓 Criado em:{' '}
      {new Date(item.data_criacao).toLocaleString()}
    </Text>

    {item.data_resolucao && (
      <Text style={styles.detail}>
        ✅ Resolvido em:{' '}
        {new Date(item.data_resolucao).toLocaleString()}
      </Text>
    )}

          {/* =========================
   BLOCO: Informação geral
   Mantido só: Criado por, Responsável atual, Última atualização
   (Técnico e Equipa/viatura removidos)
   ========================= */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Informação geral</Text>

  {item.criador_nome ? (
    <Text style={styles.detail}>👤 Criado por: {item.criador_nome}</Text>
  ) : null}

  {item.responsavel_nome ? (
    <Text style={styles.detail}>🎯 Responsável atual: {item.responsavel_nome}</Text>
  ) : null}

  {item.data_atualizacao_status ? (
    <Text style={styles.detail}>
      ⏱ Última atualização: {new Date(item.data_atualizacao_status).toLocaleString()}
    </Text>
  ) : null}
</View>

{/* =========================
   BLOCO: Orçamento
   Mantido como estava
   ========================= */}
{(item.orcamento_obrigatorio ||
  item.valor_orcamento != null ||
  item.referencia_orcamento) ? (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Orçamento</Text>

    {item.orcamento_obrigatorio !== undefined &&
    item.orcamento_obrigatorio !== null ? (
      <Text style={styles.detail}>
        📄 Orçamento obrigatório: {item.orcamento_obrigatorio ? 'Sim' : 'Não'}
      </Text>
    ) : null}

    {item.em_garantia ? (
      <Text style={styles.detail}>🛡️ Em garantia: Sim</Text>
    ) : null}

    {/* Valor do orçamento → só Admin, Orçamentação e Contabilidade vêem */}
    {(isAdmin || isOrcamentacao || isContabilidade) && item.valor_orcamento != null ? (
      <Text style={styles.detail}>
        💶 Valor orçamento: {Number(item.valor_orcamento).toFixed(2)} €
      </Text>
    ) : null}

    {/* Referência do orçamento → visível para todos */}
    {item.referencia_orcamento ? (
      <Text style={styles.detail}>🔎 Ref. orçamento: {item.referencia_orcamento}</Text>
    ) : null}

    {item.orcamento_aprovado !== undefined && item.orcamento_aprovado !== null ? (
      <Text style={styles.detail}>
        ✅ Orçamento aprovado: {item.orcamento_aprovado ? 'Sim' : 'Não'}
      </Text>
    ) : null}
  </View>
) : null}

{/* =========================
   BLOCO: Faturação / Conclusão
   Removido: valor_servico_extra (estimado)
   Mantido: fatura_paga + aviso garantia concluída
   ========================= */}
{(item.fatura_paga !== undefined || item.status === 'concluido_garantia') ? (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Faturação / Conclusão</Text>

    {item.fatura_paga !== undefined && item.fatura_paga !== null ? (
      <Text style={styles.detail}>
        💳 Fatura paga: {item.fatura_paga ? 'Sim (Processo concluído)' : 'Ainda não'}
      </Text>
    ) : null}

    {item.status === 'concluido_garantia' ? (
      <Text style={styles.detail}>🛡 Serviço concluído em garantia (sem faturação).</Text>
    ) : null}
  </View>
) : null}

          {/* Anexos */}
          {item.anexos && item.anexos.length > 0 && (
            <View style={styles.anexoContainer}>
              <Text style={styles.anexoLabel}>📎 Anexos:</Text>
              <View style={styles.anexoRow}>
                {item.anexos.map((uri: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setImagemSelecionada(uri);
                      setMostrarModalImagem(true);
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.anexoThumb}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

         {/* 🔹 Bloco HISTÓRICO – com toggle */}
{historicos[item.id] && historicos[item.id].length > 0 && (
  <View style={styles.historicoContainer}>
    <TouchableOpacity
      style={styles.historicoHeaderRow}
      onPress={() => toggleHistorico(item.id)}
    >
      <Text style={styles.historicoTitulo}>Histórico</Text>
      <Text style={styles.historicoToggle}>
        {historicoExpandido[item.id] ? 'Esconder ▲' : 'Ver histórico ▼'}
      </Text>
    </TouchableOpacity>

    {historicoExpandido[item.id] && (
      <View style={styles.historicoLista}>
        {historicos[item.id].map((passo) => (
          <View key={passo.id} style={styles.historicoLinha}>
            <Text style={styles.historicoLinhaTexto}>
              {(passo.de_nome || passo.de_tipo || 'Sistema') +
                ' → ' +
                (passo.para_tipo || '-')}
            </Text>
            <Text style={styles.historicoSubLinha}>
              {new Date(passo.created_at).toLocaleString()}
            </Text>

            {passo.mensagem && (
              <Text style={styles.historicoMensagem}>
                {passo.mensagem}
              </Text>
            )}
          </View>
        ))}
      </View>
    )}
  </View>
)}


          {item.detalhes_fluxo ? (
  <View style={styles.obsContainer}>
    <Text style={styles.obsLabel}>Observações do fluxo:</Text>
    <Text style={styles.obsText}>{item.detalhes_fluxo}</Text>
  </View>
) : null}


          {/* Botões de ação → agora simplificados com dropdown */}
    <View style={styles.actionsContainer}>
      {(() => {
        const opcoes = getAcoesDisponiveis(item);

        if (opcoes.length === 0) {
          return (
            <Text style={styles.viewOnlyText}>
              🔒 Sem ações disponíveis nesta etapa para o seu perfil.
            </Text>
          );
        }

        return (
  <>
    <Text style={styles.acaoLabel}>Ação a executar:</Text>
    <Picker
      selectedValue={acoesSelecionadas[item.id] || ''}
      style={styles.acaoPicker}
      onValueChange={(value) => {
        setAcoesSelecionadas((prev) => ({
          ...prev,
          [item.id]: value,
        }));

        // 🔹 reset visual do destinatário quando muda a ação
        setDestinatarioVisual((prev) => ({
          ...prev,
          [item.id]: '',
        }));
      }}
    >
      <Picker.Item label="Selecione uma ação..." value="" />
      {opcoes.map((op) => (
        <Picker.Item
          key={op.value}
          label={op.label}
          value={op.value}
        />
      ))}
    </Picker>

    {/* ✅ VISUAL — aparece só depois de escolher uma ação */}
    {acaoRequerDestinatario(acoesSelecionadas[item.id]) ? (
  <>
    <Text style={styles.acaoLabel}>Para quem vai (obrigatório):</Text>
    <Picker
      selectedValue={destinatarioVisual[item.id] || ''}
      style={styles.acaoPicker}
      onValueChange={(value) =>
        setDestinatarioVisual(prev => ({ ...prev, [item.id]: value }))
      }
    >
      <Picker.Item label="Selecione..." value="" />

      {usuariosPermitidosParaAcao(acoesSelecionadas[item.id]).map(u => (
        <Picker.Item
          key={u.id}
          label={`${u.nome} (${LABEL_TIPO_USUARIO[u.tipo_usuario] ?? u.tipo_usuario})`}
          value={String(u.id)}
        />
      ))}
    </Picker>
  </>
) : null}

    {acoesSelecionadas[item.id] === 'orc_enviar_cliente' ? (
     <>
       <Text style={styles.acaoLabel}>Ref. nº Orç / ref. data email:</Text>
       <TextInput
         style={styles.observacaoInput}
         placeholder="Ex: ORÇ 2025-001 | Email 21/12/2025"
         value={referenciasOrcamento[item.id] || ''}
         onChangeText={(text) =>
           setReferenciasOrcamento((prev) => ({
             ...prev,
             [item.id]: text,
           }))
         }
       />
     </>
   ) : null}


    <Text style={styles.acaoLabel}>Observações (opcional):</Text>
    <TextInput
      style={styles.observacaoInput}
      placeholder="Escreva aqui detalhes ou notas sobre esta ação..."
      value={observacoes[item.id] || ''}
      onChangeText={(text) =>
        setObservacoes((prev) => ({
          ...prev,
          [item.id]: text,
        }))
      }
      multiline
    />

    <TouchableOpacity
      style={styles.actionButton}
      onPress={() => executarAcao(item)}
    >
      <Text style={styles.actionText}>Executar ação</Text>
    </TouchableOpacity>
  </>
);

      })()}
    </View>    
  </View>
)}
    </TouchableOpacity>
  );
};


  return (
    <>
      <FlatList
        data={notificacoes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
      />

      {/* 🔹 Rodapé fixo no fundo */}
    <View style={styles.footer}>
      <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
      <Text style={styles.subTitle}>powered by GESPOOL</Text>
    </View>

      {/* Modal da imagem em ecrã completo */}
      {imagemSelecionada && (
        <ImageViewing
  images={imagemSelecionada ? [{ uri: imagemSelecionada }] : []}
  imageIndex={0}
  visible={mostrarModalImagem}
  onRequestClose={() => setMostrarModalImagem(false)}
/>
      )}
    </>
  );

};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
    cardPendente: { borderLeftWidth: 6, borderLeftColor: '#FFB3B3' },
    cardResolucao: { borderLeftWidth: 6, borderLeftColor: '#FFF5CC' },
    cardResolvido: { borderLeftWidth: 6, borderLeftColor: '#CCFFCC' },
    cardDefault: { borderLeftWidth: 6, borderLeftColor: '#AAA' },
    cliente: { fontWeight: 'bold', fontSize: 16 },
    mensagem: { marginTop: 4, fontSize: 14, color: '#333', flexShrink: 1, flexWrap: 'wrap' },
    status: { marginTop: 6, fontStyle: 'italic', color: '#666' },
    detail: { fontSize: 14, color: '#444', marginBottom: 4 },
    anexoContainer: { marginTop: 10 },
    anexoLabel: { fontWeight: 'bold', marginBottom: 4 },
    anexoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    anexoThumb: { width: 60, height: 60, borderRadius: 5, marginRight: 6 },
    input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    fontSize: 14,
    color: '#000',
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: '#22b4b4ff',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  actionText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewOnlyText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#555',
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#FFB3B3',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalCloseText: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 16,
  },
  acaoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    color: '#333',
  },
  acaoPicker: {
    backgroundColor: '#EDEDED',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDEDED',
    marginBottom: 8,
  },
  observacaoInput: {
    backgroundColor: '#EDEDED',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDEDED',
    minHeight: 60,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  obsContainer: {
  marginTop: 8,
  padding: 8,
  backgroundColor: '#FFF5CC', // Amarelo esbatido
  borderRadius: 8,
  },
  obsLabel: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#000000',
  },
  obsText: {
    fontSize: 13,
    color: '#333333',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 8,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
  },
  chipStatus: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#22b4b4ff',
    color: '#22b4b4ff',
  },
  chipEtapa: {
    backgroundColor: '#333333',
    color: '#FFFFFF',
  },
  expandedContent: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
  },
  historicoContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },

  historicoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historicoTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  historicoToggle: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  historicoLista: {
    marginTop: 4,
  },
  historicoLinha: {
    marginBottom: 6,
  },
  historicoLinhaTexto: {
    fontSize: 12,
    color: '#333',
  },
  historicoSubLinha: {
    fontSize: 11,
    color: '#777',
  },
  historicoMensagem: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
  },
  footer: {
  alignItems: 'center',
  marginTop: 10, // 🔹 desce o nome da empresa (ajusta se quiseres mais/menos)
  marginBottom: 40, // 🔹 garante distância extra do fundo do ecrã
  },
  empresaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  subTitle: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#444',
    marginTop: 2,
  },
  section: {
  marginTop: 8,
  marginBottom: 8,
  paddingVertical: 6,
  borderTopWidth: 1,
  borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  linkText: {
    fontWeight: '600',
    color: '#0066CC', // azul discreto, se quiseres
  },
  cardTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
notifId: {
  fontSize: 12,
  fontWeight: '700',
  color: '#666',
  paddingLeft: 10,
},
});

export default ReceberNotificacoesScreen;

