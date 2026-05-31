import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Linking, Alert, Appearance, Image, Platform } from 'react-native';
import Config from 'react-native-config';
import { RouteProp, useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../App'; // ajusta o path se o App.tsx estiver noutro sítio
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import moment from 'moment';
import { calcularISL, sugerirAlvosPorISL } from '../utils/isl';
import { gerarMensagensManutencao } from '../services/manutencaoMensagens';
import TaylorChart from '../components/TaylorChart';
import { sugerirAlvosPorTaylorRefinandoISL, calcTaylorAngleDeg } from '../utils/taylor'; // ajusta o path se necessário
import { initOffline } from '../services/offline/db';
import {
  getClienteCache,
  setClienteCache,
  getISLEstadoAtualCache,
  setISLEstadoAtualCache,
  getManutencaoAtualCache,
  setManutencaoAtualCache,
  getParametrosAtivosCache,
  setParametrosAtivosCache,
} from '../services/offline/cache';

export const getAccessibleUri = async (uri: string): Promise<string | null> => {
  if (uri.startsWith('content://')) {
    const filePath = `${RNFS.CachesDirectoryPath}/temp_image_${Date.now()}.jpg`;
    try {
      await RNFS.copyFile(uri, filePath);
      console.log('📷 Imagem convertida com sucesso:', filePath);
      return `file://${filePath}`; // React Native precisa do prefixo `file://`
    } catch (error) {
      console.error('❌ Erro ao converter imagem:', error);
      return null;
    }
  }
  return uri;
};

type Cliente = {
  nome: string;
  morada: string;
  telefone: string;
  google_maps?: string;
  info_acesso?: string;

  volume?: number;
  tanque_compensacao?: boolean;
  cobertura?: boolean;
  bomba_calor?: boolean;
  equipamentos_especiais?: boolean;
  eletrolise_sal?: boolean;
  tem_orp?: boolean;
  ultima_substituicao?: string | null;
  isl_ativo?: boolean;
};

type Parametro = {
  id: number;
  parametro: string;
  valor_minimo: string;
  valor_maximo: string;
  valor_alvo: string;
  valor_ultimo?: number;
  valor_atual?: string;
  produto_aumentar: string;
  produto_diminuir: string;
  dosagem_aumentar: number;
  dosagem_diminuir: number;
  incremento_aumentar: number;
  incremento_diminuir: number;
  volume_calculo: number;
  resultado?: { resultado: string; quantidade?: number; produto?: string };
  bloqueado?: boolean;
  status?: 'aplicado' | 'sem estoque' | 'nao necessario' | 'nao ajustavel';
  notificacaoEnviada?: boolean;
  requeridoHoje?: boolean;
};

type ItemManutencao = {
  id: number;
  nome: string;
  ultimaManutencao: string;
  proximaManutencao: string;
  cor?: string;
};

type MetodoAnalise = 'fotometro' | 'gotas' | 'fitas';
type ModoTratamento = 'sal' | 'cloro';

type ISLSugestao = {
  phAlvo: number | null;
  alcAlvo: number | null;
  modo?: 'manter' | 'ajustar';
  };

type ParamKeyTR =
  | 'dureza'
  | 'cloro_total'
  | 'cloro_livre'
  | 'ph'
  | 'alcalinidade'
  | 'cya'
  | 'sal';

type Props = {
  navigation: any; // Ajuste o tipo para um tipo mais específico se necessário
  route: any; // Ajuste para refletir o formato exato dos parâmetros passados
};

const isDarkMode = Appearance.getColorScheme() === 'dark';

type FolhaRouteProp = RouteProp<RootStackParamList, 'FolhaManutencao'>;

const FolhaManutencaoScreen: React.FC<Props> = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<FolhaRouteProp>();

  // ✅ toNum robusto: string vazia NÃO é 0
const toNum = (v: any) => {
  if (v === undefined || v === null) return NaN;

  const s = String(v).replace(',', '.').trim();
  if (!s) return NaN; // 👈 evita Number('') -> 0

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};


const getIdealMinMax = (item: any) => ({
  min: toNum(item?.valor_minimo),
  max: toNum(item?.valor_maximo),
});

const isForaDoIdeal = (item: any, valor: number) => {
  const { min, max } = getIdealMinMax(item);
  if (!Number.isFinite(valor) || !Number.isFinite(min) || !Number.isFinite(max)) return false;
  return valor < min || valor > max;
};



type Alerta = { level: 'hard' | 'warn'; title: string; msg: string };

function validarPH(ph: number): Alerta | null {
  if (!Number.isFinite(ph)) return { level: 'hard', title: 'pH inválido', msg: 'Introduz um número válido.' };
  if (ph < 0 || ph > 14) return { level: 'hard', title: 'pH inválido', msg: 'O pH tem de estar entre 0 e 14.' };
  if (ph < 5 || ph > 9) return { level: 'warn', title: 'pH muito fora do normal', msg: 'Confirma se não trocaste os campos (pH vs alcalinidade).' };
  return null;
}

function validarCloro(cl: number, isPiscinaSal: boolean): Alerta | null {
  if (!Number.isFinite(cl)) {
    return { level: 'hard', title: 'Cloro inválido', msg: 'Introduz um número válido.' };
  }
  if (cl < 0 || cl > 20) {
    return { level: 'hard', title: 'Cloro inválido', msg: 'O cloro livre deve estar entre 0 e 20 ppm.' };
  }

  return null;
}

  const {
  empresaid,
  clienteId,
  diaSemana,
  equipeId,
  equipeNome,
  volume,
  tanque_compensacao,
  cobertura,
  bomba_calor,
  equipamentos_especiais,
  eletrolise_sal,
  tem_orp,
  ultima_substituicao,
} = route.params;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [parametrosQuimicos, setParametrosQuimicos] = useState<Parametro[]>([]);
  const [metodoAnalise, setMetodoAnalise] = useState<MetodoAnalise>('fitas');
  const [modoTratamento, setModoTratamento] = useState<ModoTratamento>('cloro');
  const [expandTratamento, setExpandTratamento] = useState(false);
  const [expandMetodo, setExpandMetodo] = useState(false);
  const [isClienteExpanded, setIsClienteExpanded] = useState(false);
  const [isParametrosExpanded, setIsParametrosExpanded] = useState(false);
  const [isItensExpanded, setIsItensExpanded] = useState(false);
  const [manutencaoAtual, setManutencaoAtual] = useState<{ id: number | null; status?: string } | null>(null);
  const [userEmpresaid] = useState<number | null>(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [anomaliaDescricao, setAnomaliaDescricao] = useState('');
  const [valorServicoExtra, setValorServicoExtra] = useState('');
  const [imagensAnexadas, setImagensAnexadas] = useState<string[]>([]);
  const [islExpanded, setIslExpanded] = useState(false);
  const [expandCloroTotal, setExpandCloroTotal] = React.useState(false);
  const [islPH, setIslPH] = useState('');
  const [islAlc, setIslAlc] = useState('');
  const [islDur, setIslDur] = useState('');
  const [islTemp, setIslTemp] = useState('');
  const [islTds, setIslTds] = useState(''); // opcional
  const [islSugestao, setIslSugestao] = useState<ISLSugestao | null>(null);
  const [islUltimoRegisto, setIslUltimoRegisto] = useState<{
  created_at: string;
  ph: number;
  alcalinidade: number;
  dureza: number;
  temperatura: number;
  tds?: number;
  isl: number;
  indicacao: string;
} | null>(null);
  const [islEstadoAtual, setIslEstadoAtual] = useState<any | null>(null);
  const [testeRapidoPendente, setTesteRapidoPendente] = useState<any | null>(null);
  // ✅ Estado: quais cartões estão expandidos
  const [expandedParams, setExpandedParams] = useState<Record<string, boolean>>({});
  const lastAutoMsgKeyRef = useRef<string | null>(null);
  const [procedimentoMsg, setProcedimentoMsg] = useState<ReturnType<typeof gerarMensagensManutencao> | null>(null);
  const [abrirProcedimentoAposCalcular, setAbrirProcedimentoAposCalcular] = useState(false);
  const [taylorOpen, setTaylorOpen] = useState(false);
  const skipNextFocusReloadRef = useRef(false);

  // ✅ ler estado do card (por parâmetro)
  const isExpanded = useCallback(
    (parametro: string) => !!expandedParams[norm(parametro)],
    [expandedParams]
  );

// ✅ alternar abrir/fechar um card
const toggleExpanded = useCallback((parametro: string) => {
  const k = norm(parametro);
  setExpandedParams((prev) => ({ ...prev, [k]: !prev[k] }));
}, []);

// ✅ fechar tudo (usado no load)
const collapseAllParams = useCallback(() => {
  setExpandedParams({});
}, []);


  const isSomenteLeitura = manutencaoAtual?.status === 'concluida';

  // ✅ Bloquear Teste Rápido se já houver pelo menos 1 parâmetro validado/bloqueado
  // Só estes status contam como “validação real” que bloqueia ações automáticas
const STATUS_BLOQUEIA_ACOES = ['aplicado', 'sem estoque', 'nao necessario'] as const;

const houveValidacaoReal = (parametrosQuimicos ?? []).some((p: any) =>
  STATUS_BLOQUEIA_ACOES.includes(p?.status)
);

const bloquearTesteRapido = houveValidacaoReal;   // ignora 'nao ajustavel'
const bloquearAcoesAuto  = houveValidacaoReal;   // ignora 'nao ajustavel'

// Teste rápido só permitido com FITAS
const testeRapidoPermitido = metodoAnalise === 'fitas';

  // 🔹 Função para buscar o empresaid
 // const fetchEmpresaid = useCallback(async () => {
 // try {
  //  const storedEmpresaId = await AsyncStorage.getItem('empresaid');
  //  if (!storedEmpresaId) {
  //    Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
  //    return;
   // }
  //  const parsedEmpresaId = parseInt(storedEmpresaId, 10);
  //  if (isNaN(parsedEmpresaId)) {
  //    Alert.alert('Erro', 'Empresaid inválido. Faça login novamente.');
   //   return;
  //  }
  //  setEmpresaid(parsedEmpresaId);
  //  console.log('[DEBUG] Empresaid carregado:', parsedEmpresaId);
//  } catch (error) {
 //   console.error('[DEBUG] Erro ao carregar empresaid:', error);
 //   Alert.alert('Erro', 'Não foi possível carregar o empresaid.');
 // }
// }, []); // ✅ `useCallback` para evitar recriação desnecessária 

// 🔹 `useEffect` para carregar `empresaid` primeiro
//useEffect(() => {
//  fetchEmpresaid();
//}, [fetchEmpresaid]); // ✅ Agora está correto

const [islResultado, setIslResultado] = useState<null | {
  isl: number;
  D: number; A: number; T: number; S: number;
  indicacao: string;
}>(null);

const gerarSugestaoFinal = ({
  isl,
  phAtual,
  tacAtual,
  thAtual,
}: {
  isl: number;
  phAtual: number;
  tacAtual: number;
  thAtual: number;
}) => {
  const islSug = sugerirAlvosPorISL(isl);

  // Se estiver em "manter", respeita
  if (islSug?.modo === 'manter') {
    console.log('🎯 SUG ISL:', islSug);
    console.log('✅ FINAL:', islSug);
    return islSug;
  }

  // Se não tiver alvos ISL válidos, devolve como vier
  if (islSug?.phAlvo == null || islSug?.alcAlvo == null) {
    console.log('🎯 SUG ISL:', islSug);
    console.log('✅ FINAL:', islSug);
    return islSug;
  }

  // Taylor refina o alvo do ISL
  const taylorFinal = sugerirAlvosPorTaylorRefinandoISL({
    th: thAtual,
    phAtual,
    tacAtual,
    phISL: islSug.phAlvo,
    tacISL: islSug.alcAlvo,
    phMin: 7.0, phMax: 7.4,
    tacMin: 80, tacMax: 150,
    thMin: 175, thMax: 300,
    tolDeg: 3,
  });

  const finalSug = taylorFinal
    ? { phAlvo: taylorFinal.phAlvo, alcAlvo: taylorFinal.alcAlvo, modo: 'ajustar' as const }
    : islSug;

  console.log('🎯 SUG ISL:', islSug);
  console.log('📐 SUG TAYLOR:', taylorFinal);
  console.log('✅ FINAL:', finalSug);

  return finalSug;
};

const onCalcularISL = () => {
  const res = calcularISL({
    pH: islPH,
    alcalinidade: islAlc,
    dureza: islDur,
    temperatura: islTemp,
    tds: islTds ? islTds : 0,
  });

  if (!Number.isFinite(res.isl)) {
    Alert.alert('Erro', 'Preenche pH, Alcalinidade, Dureza e Temperatura para calcular o ISL.');
    return;
  }

  setIslResultado(res);

const phNum  = toNum(islPH);
const tacNum = toNum(islAlc);
const thNum  = toNum(islDur);

if (Number.isFinite(phNum) && Number.isFinite(tacNum) && Number.isFinite(thNum)) {
  const finalSug = gerarSugestaoFinal({
    isl: Number(res.isl),
    phAtual: phNum,
    tacAtual: tacNum,
    thAtual: thNum,
  });

  setIslSugestao(finalSug);
} else {
  // fallback seguro
  setIslSugestao(sugerirAlvosPorISL(res.isl));
}
};

const onGuardarISL = async () => {
  try {
    if (!empresaid || !clienteId || !islResultado) {
      Alert.alert('Erro', 'Faltam dados para guardar o ISL.');
      return;
    }

    const payload = {
      empresaid,
      cliente_id: clienteId,

      ph: Number(islPH),
      alcalinidade: Number(islAlc),
      dureza: Number(islDur),
      temperatura: Number(islTemp),
      tds: islTds ? Number(islTds) : null,

      isl: islResultado.isl,
      indicacao: islResultado.indicacao,

      // ✅ alvos finais
      ph_alvo: islSugestao?.phAlvo ?? islEstadoAtual?.ph_alvo ?? null,
      alc_alvo: islSugestao?.alcAlvo ?? islEstadoAtual?.alc_alvo ?? null,
    };


    console.log('📤 A gravar ISL:', payload);

    const resp = await fetch(`${Config.API_URL}/isl/estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => null);
    console.log('📥 Resposta /isl:', resp.status, data);

    if (!resp.ok) {
      throw new Error(data?.error || 'Erro ao guardar ISL.');
    }

    // ✅ Atualiza o estado local para a UI mostrar já o “último ISL”
    const createdAt =
      data?.created_at || data?.registo?.created_at || new Date().toISOString();

    setIslUltimoRegisto({
      created_at: createdAt,
      ph: Number(islPH),
      alcalinidade: Number(islAlc),
      dureza: Number(islDur),
      temperatura: Number(islTemp),
      tds: islTds ? Number(islTds) : undefined,
      isl: islResultado.isl,
      indicacao: islResultado.indicacao,
    });

    Alert.alert('Sucesso', 'ISL guardado com sucesso!');
  } catch (e: any) {
    console.error('❌ Erro ao guardar ISL:', e?.message || e);
    Alert.alert('Erro', e?.message || 'Não foi possível guardar o ISL.');
  }
};

const mapParametroFolhaToTesteRapido = (parametro: string): ParamKeyTR | null => {
  const p = (parametro ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (p === 'ph' || p.startsWith('ph ')) return 'ph';
  if (p.startsWith('cloro livre')) return 'cloro_livre';
  if (p.startsWith('cloro total')) return 'cloro_total';
  if (p.startsWith('alcal')) return 'alcalinidade';
  if (p.startsWith('durez')) return 'dureza';
  if (p.startsWith('acido cian')) return 'cya';
  if (p.startsWith('sal')) return 'sal';

  return null;
};

function aplicarTesteRapidoNosParametros(testeRapido: Partial<Record<ParamKeyTR, number | null>>) {
  if (!testeRapido) return;

  setParametrosQuimicos((prev: any[]) =>
    prev.map((p) => {
      const nomeFolha: string = p.parametro; // é aqui que vem "Cloro Livre em ppm", etc.
      const keyTR = mapParametroFolhaToTesteRapido(nomeFolha);

      if (!keyTR) return p;

      const v = testeRapido[keyTR];

      // não veio este valor -> não mexe
      if (v === undefined) return p;

      // veio null (saltado) -> limpa o campo
      if (v === null) return { ...p, valor_atual: '' };

      // veio número -> aplica
      return { ...p, valor_atual: String(v) };
    })
  );
}

useEffect(() => {
  const tr = (route.params as any)?.testeRapido;

  console.log('🟦 [Folha] route.params keys:', route.params ? Object.keys(route.params as any) : 'SEM PARAMS');
  console.log('🟦 [Folha] testeRapido recebido:', tr);

  if (tr) {
    // ✅ guarda para aplicar DEPOIS do reload terminar
    setTesteRapidoPendente(tr);

    // ✅ limpa o param para não reaplicar ao reentrar
    navigation.setParams({ testeRapido: undefined } as any);
  }
}, [(route.params as any)?.testeRapido]);

const haValoresAtuaisPreenchidos = () => {
  // usa o teu state real: parametrosQuimicos
  // considera preenchido se tiver valor_atual com algo diferente de vazio
  return parametrosQuimicos?.some((p: any) => {
    const v = p?.valor_atual;
    return v !== undefined && v !== null && String(v).trim() !== '';
  });
};

const abrirTesteRapidoComConfirmacao = () => {
  const temValores = haValoresAtuaisPreenchidos();

  const navegar = () => {
  (navigation as any).navigate('TesteRapido', {
    clienteId: Number(clienteId),
    nome: (route.params as any)?.nome ?? 'Cliente',
    volume: Number(volume ?? 0),
    folhaParams: route.params,
    modoTratamento,
  });
};


  if (!temValores) {
    navegar();
    return;
  }

  Alert.alert(
    'Teste Rápido',
    'Tens valores do Teste Rápido ainda não validados. Queres substituir?',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Substituir', style: 'destructive', onPress: navegar },
    ],
    { cancelable: true }
  );
};

// 🔹 Função para buscar os parâmetros químicos
const fetchParametros = useCallback(async () => {
  if (!userEmpresaid) return;

  try {
    await initOffline();

    // 1) cache primeiro
    const cached = await getParametrosAtivosCache<any[]>(userEmpresaid);
    if (cached?.data && Array.isArray(cached.data)) {
      setParametrosQuimicos(cached.data);
    }

    // 2) online
    console.log('[DEBUG] Buscando parâmetros com empresaid:', userEmpresaid);
    const response = await axios.get(`${Config.API_URL}/parametros-quimicos`, {
      params: { empresaid: userEmpresaid, ativo: true },
      timeout: 12000,
    });

    if (response.status === 200) {
      const data = Array.isArray(response.data) ? response.data : [];

      const existeTotal = data.some((p: any) => norm(p.parametro) === 'cloro total em ppm');
      const existeComb = data.some((p: any) => norm(p.parametro) === 'cloro combinado em ppm');

      const add: any[] = [];
      if (!existeTotal) add.push({ parametro: 'Cloro Total em ppm', valor_atual: '', valor_ultimo: null, bloqueado: false, status: null, resultado: null });
      if (!existeComb) add.push({ parametro: 'Cloro Combinado em ppm', valor_atual: '', valor_ultimo: null, bloqueado: true, status: null, resultado: null });

      const finalList = add.length ? [...data, ...add] : data;

      setParametrosQuimicos(finalList);
      await setParametrosAtivosCache(userEmpresaid, finalList); // ✅ guarda já pronto para UI
    } else {
      console.error('[DEBUG] Erro ao buscar parâmetros químicos. Status:', response.status);
      // se houver cache, não alertar; só alertar se não houver nada
      const cached2 = await getParametrosAtivosCache(userEmpresaid);
      if (!cached2?.data) Alert.alert('Erro', 'Não foi possível carregar os parâmetros químicos.');
    }
  } catch (error) {
    console.error('[DEBUG] Erro ao buscar parâmetros químicos:', error);
    const cached2 = await getParametrosAtivosCache(userEmpresaid);
    if (!cached2?.data) Alert.alert('Erro', 'Não foi possível carregar os parâmetros.');
  }
}, [userEmpresaid]);

// 🔹 `useEffect` para carregar os parâmetros **após** o `empresaid` ser carregado
useEffect(() => {
  if (userEmpresaid !== null) {
    fetchParametros(); // ✅ Agora espera `userEmpresaid` ser carregado
  }
}, [userEmpresaid, fetchParametros]); // ✅ Agora o ESLint não reclama

useEffect(() => {
  if (!testeRapidoPendente) return;
  if (!parametrosQuimicos || parametrosQuimicos.length === 0) return;

  console.log('🟩 [Folha] a aplicar testeRapidoPendente AGORA:', testeRapidoPendente);

  skipNextFocusReloadRef.current = true; // ✅
  
  aplicarTesteRapidoNosParametros(testeRapidoPendente);

  // ✅ Após receber valores do Teste Rápido, abrir apenas os parâmetros que vieram com valor
  setExpandedParams(() => {
  const next: Record<string, boolean> = {};
  const has = (v: any) => String(v ?? '').trim() !== '';

  parametrosQuimicos.forEach((p) => {
    const keyTR = mapParametroFolhaToTesteRapido(p.parametro);
    if (!keyTR) return;

    const v = (testeRapidoPendente as any)[keyTR];
    if (has(v)) {
      next[norm(p.parametro)] = true; // ✅ MESMA KEY do render
    }
  });

  return next;
});


  // ✅ limpa para não reaplicar
  setTesteRapidoPendente(null);
}, [testeRapidoPendente, parametrosQuimicos]);

  //  FUNÇÃO DE CARREGAMENTO DA MANUTENÇÃO (Coloque antes do useFocusEffect)
const fetchDadosManutencao = useCallback(async () => {
  if (!clienteId || !diaSemana || !empresaid) {
    console.warn('⚠️ Cliente ID, Dia da Semana ou Empresaid não definidos.');
    return;
  }

  await initOffline();

// 1) CACHE PRIMEIRO — permite abrir offline
const cachedCliente = await getClienteCache(empresaid, clienteId);
if (cachedCliente?.data) {
  setCliente(cachedCliente.data);
}

const cachedISL = await getISLEstadoAtualCache(empresaid, clienteId);
if (cachedISL?.data !== undefined) {
  const st = cachedISL.data;
  setIslEstadoAtual(st || null);

  // ✅ preencher inputs a partir do cache (para offline)
  if (st) {
    if (st.ph != null) setIslPH(String(st.ph));
    if (st.alcalinidade != null) setIslAlc(String(Math.round(Number(st.alcalinidade))));
    if (st.dureza != null) setIslDur(String(Math.round(Number(st.dureza))));
    if (st.temperatura != null) setIslTemp(String(st.temperatura));
    if (st.tds != null) setIslTds(String(Math.round(Number(st.tds))));

    // ✅ sugestão alvo baseada no ISL atual (cache)
    const islNum = Number(st.isl);
    if (st.isl != null && Number.isFinite(islNum)) {
      const phNum  = toNum(String(st.ph ?? ''));
      const tacNum = toNum(String(st.alcalinidade ?? ''));
      const thNum  = toNum(String(st.dureza ?? ''));

      if (Number.isFinite(phNum) && Number.isFinite(tacNum) && Number.isFinite(thNum)) {
        const finalSug = gerarSugestaoFinal({
          isl: islNum,
          phAtual: phNum,
          tacAtual: tacNum,
          thAtual: thNum,
        });
        setIslSugestao(finalSug);
      } else {
        setIslSugestao(sugerirAlvosPorISL(islNum));
      }
    } else {
      setIslSugestao(null);
    }
  } else {
    // ✅ se o cache tiver null, limpa
    setIslPH('');
    setIslAlc('');
    setIslDur('');
    setIslTemp('');
    setIslTds('');
    setIslSugestao(null);
  }
}

const cachedManut = await getManutencaoAtualCache<any>(empresaid, clienteId, diaSemana);
if (cachedManut?.data) {
  const manutencaoData = cachedManut.data;

  const m = manutencaoData?.manutencao;
setManutencaoAtual(m || null);

// ✅ preencher também os states que controlam o UI (offline)
const metodo = (m?.metodo_analise || m?.metodoAnalise) as MetodoAnalise | undefined;
const modo = (m?.modo_tratamento || m?.modoTratamento) as ModoTratamento | undefined;

if (metodo === 'fotometro' || metodo === 'gotas' || metodo === 'fitas') {
  setMetodoAnalise(metodo);
}

if (modo === 'sal' || modo === 'cloro') {
  setModoTratamento(modo);
} else {
  // fallback inteligente (se no cache faltar)
  const eletrolise = !!(cachedCliente?.data?.eletrolise_sal || cachedCliente?.data?.eletroliseSal);
  setModoTratamento(eletrolise ? 'sal' : 'cloro');
}  

  // aplicar parametros como já fazes
  if (m?.id && Array.isArray(manutencaoData.parametros)) {
    const parametrosAtivos = manutencaoData.parametros.map((parametro: any) => {
      const nome = String(parametro.parametro || '').trim();
      const requeridoHoje = nome === 'pH' || nome === 'Cloro Livre em ppm';

      return {
        ...parametro,
        requeridoHoje,
        bloqueado: ['aplicado', 'sem estoque', 'nao necessario', 'nao ajustavel'].includes(parametro.status),
        resultado:
          parametro.status === 'nao ajustavel'
            ? { resultado: 'Foi solicitada assistência à administração com sucesso', quantidade: 0, produto: null }
            : parametro.resultado || null,
      };
    });

    // ✅ Ao carregar a Folha: tudo fechado (exceto se vier do Teste Rápido)
     if (!skipNextFocusReloadRef.current) {
       collapseAllParams();
     }

    setParametrosQuimicos((prev) => {
      const byKey = new Map<string, any>();
      for (const p of prev) byKey.set(norm(p.parametro), p);
      for (const p of parametrosAtivos) {
        const k = norm(p.parametro);
        const base = byKey.get(k) || p;
        const baseValor = (base as any)?.valor_atual;
const novoValor = (p as any)?.valor_atual;

// "vazio" = null/undefined/'' (string vazia)
const isVazio = (v: any) => v === null || v === undefined || String(v).trim() === '';

const statusNovo = (p as any)?.status;
const statusBase = (base as any)?.status;

// ✅ Se o backend vier pendente (ou sem status) e trouxer valor vazio,
// mantém o valor local (baseValor) para não apagar o que o técnico acabou de meter.
const manterValorLocal =
  isVazio(novoValor) &&
  !isVazio(baseValor) &&
  (statusNovo === 'pendente' || statusNovo === null || statusNovo === undefined);

byKey.set(k, {
  ...base,
  ...p,
  ...(manterValorLocal ? { valor_atual: baseValor } : null),
});
      }
      if (!byKey.has('cloro total em ppm')) byKey.set('cloro total em ppm', { parametro: 'Cloro Total em ppm', valor_atual: '', valor_ultimo: null, bloqueado: false, status: null, resultado: null });
      if (!byKey.has('cloro combinado em ppm')) byKey.set('cloro combinado em ppm', { parametro: 'Cloro Combinado em ppm', valor_atual: '', valor_ultimo: null, bloqueado: true, status: null, resultado: null });
      return Array.from(byKey.values());
    });
  }
}

// ✅ Flag ANTES da rede (para o catch final)
const tinhaAlgoEmCache =
  !!cachedCliente?.data ||
  !!cachedManut?.data ||
  cachedISL?.data !== undefined;

  try {
    console.log('📡 Buscando dados do cliente...');
    const clienteResponse = await fetch(
      `${Config.API_URL}/clientes/${clienteId}?empresaid=${empresaid}`
    );

    if (!clienteResponse.ok) {
      throw new Error('Erro ao buscar dados do cliente.');
    }

    const clienteData = await clienteResponse.json();
    setCliente(clienteData);
    console.log('✅ Dados do cliente carregados:', clienteData);

    // ✅ guardar cache (cliente)
    await setClienteCache(empresaid, clienteId, clienteData);
    console.log('💾 [CACHE] cliente gravado', { empresaid, clienteId });
    

    // ✅ Buscar estado atual ISL (persistente)
try {
  console.log('📡 Buscando ISL estado atual...');
  const islResp = await fetch(
    `${Config.API_URL}/isl/estado-atual?empresaid=${empresaid}&cliente_id=${clienteId}`
  );

  if (islResp.ok) {
  const st = await islResp.json();
  setIslEstadoAtual(st || null);

  // ✅ guardar cache (ISL estado atual)
  await setISLEstadoAtualCache(empresaid, clienteId, st || null);
  console.log('💾 [CACHE] isl gravado', { empresaid, clienteId, tem: !!st });

  if (st) {
    // ✅ preencher inputs (inclui temperatura e tds)
    if (st.ph != null) setIslPH(String(st.ph));
    if (st.alcalinidade != null) setIslAlc(String(Math.round(Number(st.alcalinidade))));
    if (st.dureza != null) setIslDur(String(Math.round(Number(st.dureza))));
    if (st.temperatura != null) setIslTemp(String(st.temperatura));
    if (st.tds != null) setIslTds(String(Math.round(Number(st.tds))));

    // ✅ sugestão alvo baseada no ISL atual
    const islNum = Number(st.isl);
    if (st.isl != null && Number.isFinite(islNum)) {
      const phNum  = toNum(String(st.ph ?? ''));
const tacNum = toNum(String(st.alcalinidade ?? ''));
const thNum  = toNum(String(st.dureza ?? ''));

if (Number.isFinite(phNum) && Number.isFinite(tacNum) && Number.isFinite(thNum)) {
  const finalSug = gerarSugestaoFinal({
    isl: islNum,
    phAtual: phNum,
    tacAtual: tacNum,
    thAtual: thNum,
  });
  setIslSugestao(finalSug);
} else {
  setIslSugestao(sugerirAlvosPorISL(islNum));
}

      const sug = sugerirAlvosPorISL(islNum);
setIslSugestao(sug);
console.log('🎯 SUG ISL (estado atual):', sug);

    } else {
      setIslSugestao(null);
    }
  } else {
    // ✅ se não houver estado para o cliente, limpa tudo
    setIslPH('');
    setIslAlc('');
    setIslDur('');
    setIslTemp('');
    setIslTds('');
    setIslSugestao(null);
  }

  console.log('✅ ISL estado atual carregado:', st);
} else {
  console.warn('⚠️ Falha ao buscar ISL estado atual. Status:', islResp.status);
  setIslEstadoAtual(null);

  await setISLEstadoAtualCache(empresaid, clienteId, null);

  // ✅ limpa tudo
  setIslPH('');
  setIslAlc('');
  setIslDur('');
  setIslTemp('');
  setIslTds('');
  setIslSugestao(null);
}

} catch (e) {
  console.warn('⚠️ Erro ao buscar ISL estado atual:', e);
  setIslEstadoAtual(null);
  setIslSugestao(null);
}


    console.log('📡 Buscando dados de manutenção...');
    const manutencaoResponse = await fetch(
      `${Config.API_URL}/manutencao-atual?clienteId=${clienteId}&diaSemana=${diaSemana}&empresaid=${empresaid}`
    );

    if (!manutencaoResponse.ok) {
      throw new Error('Erro ao buscar dados da manutenção.');
    }

    const manutencaoData = await manutencaoResponse.json();

// ✅ guardar cache (manutenção atual + parâmetros)
await setManutencaoAtualCache(empresaid, clienteId, diaSemana, manutencaoData);
console.log('💾 [CACHE] manutencao gravada', { empresaid, clienteId, diaSemana, manutencaoId: manutencaoData?.manutencao?.id });

// ✅ DEBUG (Render vs Local)
const m = manutencaoData?.manutencao;

console.log('🧪 [DEBUG MANUT] clienteId/diaSemana/empresaid:', { clienteId, diaSemana, empresaid });

console.log('🧪 [DEBUG MANUT] manutencao recebida:', {
  id: m?.id,
  status: m?.status,
  dia_semana: m?.dia_semana ?? (m as any)?.diaSemana,
  data_manutencao: m?.data_manutencao ?? (m as any)?.data_manutencao_iso,
  created_at: (m as any)?.created_at,
  metodo_analise: (m as any)?.metodo_analise,
  modo_tratamento: (m as any)?.modo_tratamento,
  parametrosCount: Array.isArray(manutencaoData?.parametros) ? manutencaoData.parametros.length : null,
});

// ✅ AQUI: aplicar método + modo vindos da rede (simétrico do cache)
setManutencaoAtual(m || null);

const metodo = ((m as any)?.metodo_analise || (m as any)?.metodoAnalise) as MetodoAnalise | undefined;
const modo   = ((m as any)?.modo_tratamento || (m as any)?.modoTratamento) as ModoTratamento | undefined;

if (metodo === 'fotometro' || metodo === 'gotas' || metodo === 'fitas') {
  setMetodoAnalise(metodo);
}

if (modo === 'sal' || modo === 'cloro') {
  setModoTratamento(modo);
} else {
  const eletrolise = !!((cliente as any)?.eletrolise_sal || (cliente as any)?.eletroliseSal);
  setModoTratamento(eletrolise ? 'sal' : 'cloro');
}



console.log('🧪 [DEBUG MANUT] clienteId/diaSemana/empresaid:', {
  clienteId,
  diaSemana,
  empresaid,
});

console.log('🧪 [DEBUG MANUT] manutencao recebida:', {
  id: m?.id,
  status: m?.status,
  dia_semana: m?.dia_semana ?? m?.diaSemana,     // caso venha com nomes diferentes
  data_manutencao: m?.data_manutencao ?? m?.data_manutencao_iso,
  created_at: m?.created_at,
  metodo_analise: m?.metodo_analise,
  modo_tratamento: m?.modo_tratamento,
  parametrosCount: Array.isArray(manutencaoData?.parametros) ? manutencaoData.parametros.length : null,
});

// (Opcional) ver rapidamente se já vem “bloqueável”
if (Array.isArray(manutencaoData?.parametros)) {
  console.log(
    '🧪 [DEBUG MANUT] parametros resumidos:',
    manutencaoData.parametros.map((p: any) => ({
      parametro: p.parametro,
      status: p.status,
      valor_atual: p.valor_atual,
    }))
  );
}

    setManutencaoAtual(manutencaoData.manutencao || null);
    console.log('✅ Dados da manutenção carregados:', manutencaoData.manutencao);
    // ✅ carregar método/modo guardados na manutenção
    

    setMetodoAnalise((m?.metodo_analise as MetodoAnalise) ?? 'fotometro');
    setModoTratamento((m?.modo_tratamento as ModoTratamento) ?? (clienteData?.eletrolise_sal ? 'sal' : 'cloro'));



    if (manutencaoData.manutencao?.id && Array.isArray(manutencaoData.parametros)) {
      const parametrosAtivos = manutencaoData.parametros.map((parametro: any) => {
        const nome = String(parametro.parametro || '').trim();

        const requeridoHoje = nome === 'pH' || nome === 'Cloro Livre em ppm';

        return {
          ...parametro,
          requeridoHoje, // ✅ NOVO
          bloqueado: ['aplicado', 'sem estoque', 'nao necessario', 'nao ajustavel'].includes(
            parametro.status
          ),
          resultado:
            parametro.status === 'nao ajustavel'
              ? {
                  resultado: 'Foi solicitada assistência à administração com sucesso',
                  quantidade: 0,
                  produto: null,
                }
              : parametro.resultado || null,
        };
      });

      // ✅ Ao carregar a Folha: tudo fechado
      if (!skipNextFocusReloadRef.current) {
  collapseAllParams();
}

      setParametrosQuimicos((prev) => {
  const byKey = new Map<string, any>();

  // 1) começa com o que já existe (a tua lista base / semeada)
  for (const p of prev) {
    byKey.set(norm(p.parametro), p);
  }

  // 2) aplica por cima os dados carregados/ativos da manutenção
  for (const p of parametrosAtivos) {
    const k = norm(p.parametro);
    const base = byKey.get(k) || p;

    const baseValor = (base as any)?.valor_atual;
const novoValor = (p as any)?.valor_atual;

// "vazio" = null/undefined/'' (string vazia)
const isVazio = (v: any) => v === null || v === undefined || String(v).trim() === '';

const statusNovo = (p as any)?.status;
const statusBase = (base as any)?.status;

// ✅ Se o backend vier pendente (ou sem status) e trouxer valor vazio,
// mantém o valor local (baseValor) para não apagar o que o técnico acabou de meter.
const manterValorLocal =
  isVazio(novoValor) &&
  !isVazio(baseValor) &&
  (statusNovo === 'pendente' || statusNovo === null || statusNovo === undefined);

byKey.set(k, {
  ...base,
  ...p,
  ...(manterValorLocal ? { valor_atual: baseValor } : null),
});
  }

  // 3) garante que os novos existem (se por algum motivo não vieram)
  const existeTotal = byKey.has('cloro total em ppm');
  const existeComb = byKey.has('cloro combinado em ppm');

  if (!existeTotal) {
    byKey.set('cloro total em ppm', {
      parametro: 'Cloro Total em ppm',
      valor_atual: '',
      valor_ultimo: null,
      bloqueado: false,
      status: null,
      resultado: null,
    });
  }

  if (!existeComb) {
    byKey.set('cloro combinado em ppm', {
      parametro: 'Cloro Combinado em ppm',
      valor_atual: '',
      valor_ultimo: null,
      bloqueado: true,
      status: null,
      resultado: null,
    });
  }

  // 4) devolve array final
  return Array.from(byKey.values());
});


    } else {
  console.warn('⚠️ Nenhum parâmetro químico encontrado para esta manutenção.');

  // ✅ Ao carregar a Folha sem parâmetros: tudo fechado
  // ✅ Ao carregar a Folha sem parâmetros (exceto se vier do Teste Rápido)
  if (!skipNextFocusReloadRef.current) {
  collapseAllParams();
}

  // NÃO apagues a lista base; garante pelo menos os 2 novos
  setParametrosQuimicos((prev) => {
  const byKey = new Map<string, any>();

  // 1️⃣ Começa com o que já existe
  for (const p of prev) {
    byKey.set(norm(p.parametro), p);
  }

  // 2️⃣ Helper para garantir existência
  const ensure = (normKey: string, obj: any) => {
    if (!byKey.has(normKey)) {
      byKey.set(normKey, obj);
    }
  };

  // 3️⃣ Parâmetros base (SEMPRE garantidos)

  // Cloro Total
  ensure('cloro total em ppm', {
    parametro: 'Cloro Total em ppm',
    valor_atual: '',
    valor_ultimo: null,
    bloqueado: false,
    status: null,
    resultado: null,
  });

  // Cloro Combinado (só leitura, dentro do cloro total)
  ensure('cloro combinado em ppm', {
    parametro: 'Cloro Combinado em ppm',
    valor_atual: '',
    valor_ultimo: null,
    bloqueado: true,
    status: null,
    resultado: null,
  });

  // Ácido Cianúrico
  ensure('acido cianurico', {
    parametro: 'Ácido Cianúrico',
    valor_atual: '',
    valor_ultimo: null,
    bloqueado: false,
    status: null,
    resultado: null,
  });

  // Sal
  ensure('sal em kg/m³', {
    parametro: 'Sal em Kg/m³',
    valor_atual: '',
    valor_ultimo: null,
    bloqueado: false,
    status: null,
    resultado: null,
  });

  // 4️⃣ devolve array final
  return Array.from(byKey.values());
});

}

  } catch (error) {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

  console.error('❌ Erro ao processar fetchDadosManutencao:', msg);

  if (!tinhaAlgoEmCache) {
    Alert.alert('Erro', msg || 'Não foi possível carregar os dados. Verifique a conexão e tente novamente.');
  } else {
    console.log('🟡 Sem rede, mas cache já carregado. Ignorar alert.');
  }
}
}, [clienteId, diaSemana, empresaid]);

useFocusEffect(
  useCallback(() => {
    if (!clienteId || !diaSemana || !empresaid) return;

    if (skipNextFocusReloadRef.current) {
      console.log('🟨 [Folha] skip reload (regresso do Teste Rápido)');
      skipNextFocusReloadRef.current = false;
      return;
    }

    fetchDadosManutencao();
  }, [clienteId, diaSemana, empresaid, fetchDadosManutencao])
);

const registrarStatusParametro = async (
  parametro: Parametro,
  status: 'aplicado' | 'sem estoque' | 'nao necessario' | 'nao ajustavel',
  motivo: string = ''
): Promise<void> => {
  if (!manutencaoAtual?.id || !empresaid) {
    Alert.alert('Erro', 'ID da manutenção atual ou Empresaid não encontrado.');
    return;
  }

  // 🔍 Verifica se o status está correto antes de enviar
  console.log('🔄 Enviando status para o backend:', {
    manutencao_id: manutencaoAtual.id,
    parametro: parametro.parametro,
    valor_atual: parametro.valor_atual,
    produto_usado: parametro.resultado?.produto || null,
    quantidade_usada: parametro.resultado?.quantidade || 0,
    status,
    motivo,
    empresaid,
  });

  try {
    const response = await fetch(`${Config.API_URL}/manutencoes_parametros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manutencao_id: manutencaoAtual.id,
        parametro: parametro.parametro,
        valor_atual: parametro.valor_atual,
        produto_usado: parametro.resultado?.produto || null,
        quantidade_usada: parametro.resultado?.quantidade || 0,
        status, // ✅ Garante que "nao ajustavel" será enviado corretamente
        motivo,
        empresaid,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || 'Erro ao registrar status do parâmetro.');
    }

    // ✅ Se deu certo, exibir sucesso e bloquear o parâmetro
    Alert.alert('Sucesso', 'Status registrado com sucesso.');

    setParametrosQuimicos((prev) =>
      prev.map((p) =>
        p.parametro === parametro.parametro
          ? {
              ...p,
              status,
              bloqueado: true, // ✅ Agora bloqueia corretamente
              valor_atual: p.valor_atual, // ✅ Mantém o valor_atual ao voltar à tela
            }
          : p
      )
    );

    console.log(`✅ Status "${status}" registrado com sucesso para o parâmetro ${parametro.parametro}`);
  } catch (error) {
    console.error('Erro de conexão ao registrar status:', error);
    Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de conexão com o servidor.');
  }
};

type ResultadoCalculo = {
    resultado: string;
    quantidade: number;
    produto?: string;
    status?: 'aplicado' | 'sem estoque' | 'nao necessario' | 'nao ajustavel' | 'pendente';
};

const calcularProduto = (
  parametro: Parametro,
  volumePiscina: number
): ResultadoCalculo => {
  if (!parametro || !parametro.parametro) {
    return { resultado: 'Parâmetro inválido ou não configurado.', quantidade: 0 };
  }

  const {
    valor_atual,
    valor_minimo,
    valor_maximo,
    valor_alvo,
    produto_aumentar,
    produto_diminuir,
    dosagem_aumentar,
    dosagem_diminuir,
    incremento_aumentar,
    incremento_diminuir,
    volume_calculo,
  } = parametro;

  const valorAtualNum = parseFloat(valor_atual?.toString() || '0');
  const valorMinNum = parseFloat(valor_minimo?.toString());
  const valorMaxNum = parseFloat(valor_maximo?.toString());
  const valorAlvoNum = parseFloat(valor_alvo?.toString());
  const volumeCalculoNum = parseFloat(volume_calculo?.toString());

  if (
    isNaN(valorAtualNum) ||
    isNaN(valorMinNum) ||
    isNaN(valorMaxNum) ||
    isNaN(valorAlvoNum) ||
    isNaN(volumeCalculoNum)
  ) {
    return { resultado: 'Valores insuficientes ou inválidos para cálculo.', quantidade: 0 };
  }


  // Verifica se o parâmetro está dentro do intervalo ideal
  if (valorAtualNum >= valorMinNum && valorAtualNum <= valorMaxNum) {
    return { resultado: 'Dentro do intervalo ideal', quantidade: 0 };
  }

  // Determina se o ajuste é para cima ou para baixo
  const ajustarParaCima = valorAtualNum < valorAlvoNum;

  if (!ajustarParaCima) {
    if (!produto_diminuir || !dosagem_diminuir || !incremento_diminuir) {
      return {
        resultado: 'Não é possível diminuir este parâmetro.',
        quantidade: 0,
        status: 'nao ajustavel',
      };
    }
  } else {
    if (!produto_aumentar || !dosagem_aumentar || !incremento_aumentar) {
      return {
        resultado: 'Não é possível aumentar este parâmetro.',
        quantidade: 0,
        status: 'nao ajustavel',
      };
    }
  }

  const produto = ajustarParaCima ? produto_aumentar : produto_diminuir;
  const diferenca = ajustarParaCima
    ? valorAlvoNum - valorAtualNum
    : valorAtualNum - valorAlvoNum;

  const dosagem = ajustarParaCima ? dosagem_aumentar : dosagem_diminuir;
  const incremento = ajustarParaCima ? incremento_aumentar : incremento_diminuir;

  if (!dosagem || !incremento || volumeCalculoNum === 0) {
    return { resultado: 'Dados insuficientes para calcular a quantidade.', quantidade: 0 };
  }

  const quantidade = parseFloat(
    ((diferenca / incremento) * dosagem * (volumePiscina / volumeCalculoNum)).toFixed(2)
  );

  return {
    resultado: `Adicionar ${quantidade}kg de ${produto}`,
    quantidade,
    produto,
    status: 'pendente',
  };
};

const calcularUmParametro = useCallback(
  (item: any) => {
    if (isSomenteLeitura || item?.bloqueado) return;

    const nome = String(item?.parametro || '').trim();
    const valor = toNum(item?.valor_atual);

// ======================================================
// ✅ ALERTAS A/B (pH + TAC) + pH "muito fora" (6.2–8.2)
// ======================================================

const nomeNorm = norm(nome);

// ✅ BLOQUEIO: Fitas/Fotómetro -> Cloro Total é só leitura
const isCloroTotal = nomeNorm === 'cloro total em ppm';
const isGotas = metodoAnalise === 'gotas';

if (isCloroTotal && !isGotas) {
  Alert.alert(
    'Info',
    'No modo Fitas/Fotómetro, o Cloro Total é apenas informativo (serve para calcular Cloro Combinado). O doseamento é feito no Cloro Livre.'
  );
  return;
}


// helper: encontra o item atual do estado por nome normalizado
const getItem = (targetNorm: string) =>
  (parametrosQuimicos ?? []).find((p: any) => norm(p.parametro) === targetNorm);

// valores atuais do pH e TAC (se existirem)
const phStateItem = getItem('ph');
const tacStateItem = getItem('alcalinidade');

const parseValorAtual = (v: any) => {
  const s = String(v ?? '').trim();
  if (!s) return NaN;           // 👈 vazio => “não medido”
  return toNum(s);
};

const phAtual = phStateItem ? parseValorAtual(phStateItem.valor_atual) : NaN;
const tacAtual = tacStateItem ? parseValorAtual(tacStateItem.valor_atual) : NaN;


// ideais (min/max) vindos do próprio parâmetro (empresa-specific)
const phMin = phStateItem ? toNum(phStateItem.valor_minimo) : NaN;
const phMax = phStateItem ? toNum(phStateItem.valor_maximo) : NaN;

const tacMin = tacStateItem ? toNum(tacStateItem.valor_minimo) : NaN;
const tacMax = tacStateItem ? toNum(tacStateItem.valor_maximo) : NaN;

// flags “fora do ideal” (usa min/max reais)
const phBaixoIdeal =
  Number.isFinite(phAtual) && Number.isFinite(phMin) && phAtual < phMin;
const phAltoIdeal =
  Number.isFinite(phAtual) && Number.isFinite(phMax) && phAtual > phMax;

const tacBaixoIdeal =
  Number.isFinite(tacAtual) && Number.isFinite(tacMin) && tacAtual < tacMin;
const tacAltoIdeal =
  Number.isFinite(tacAtual) && Number.isFinite(tacMax) && tacAtual > tacMax;


// ✅ pH “muito fora” (técnico) — só aviso/confirmar, não bloqueia cálculo
// (regra C: apenas pH com 6.2–8.2)
const alertaPHTecnico =
  nomeNorm === 'ph' && Number.isFinite(valor) && (valor < 6.2 || valor > 8.2)
    ? {
        level: 'warn' as const,
        title: '⚠ pH muito fora do normal',
        msg: 'O valor de pH está muito fora do intervalo técnico (6.2–8.2). Confirma se não houve erro de leitura.',
      }
    : null;


    const isPiscinaSal = !!cliente?.eletrolise_sal;

    // ✅ alerta: variação grande pH vs último valor (não bloqueia, mas pede confirmação)
    const ultimoPH = nome === 'pH' ? toNum(item?.valor_ultimo) : NaN;
    const diffPH =
      nome === 'pH' && Number.isFinite(valor) && Number.isFinite(ultimoPH)
        ? Math.abs(valor - ultimoPH)
        : 0;

    // ✅ validações “hard/warn” existentes
    const alertaBase =
      nome === 'pH'
        ? validarPH(valor)
        : nome === 'Cloro Livre em ppm'
        ? validarCloro(valor, isPiscinaSal)
        : null;

    // prioridade: hard do validarPH/validarCloro primeiro, depois A/B, depois variação pH, depois pH técnico
    const alerta = alertaBase ?? alertaPHTecnico;

    // hard-stop: não calcula
    if (alerta?.level === 'hard') {
      Alert.alert(alerta.title, alerta.msg);
      return;
    }

    const continuar = () => {
      // ✅ 1) Se for pH/Alcalinidade, e houver ISL válido, usamos o alvo do ISL no cálculo
      // ✅ 1) Override do valor_alvo (pH/TAC) com alvos memorizados no estado ISL
      const isPH = nome === 'pH';
      const isAlc = nome === 'Alcalinidade';

      // prioridade 1: alvos guardados no estado atual (persistem até novo cálculo/guardar)
      const phAlvoEstado = islEstadoAtual?.ph_alvo;
      const alcAlvoEstado = islEstadoAtual?.alc_alvo;

      // prioridade 2 (fallback): sugestão atual em memória (acabaste de recalcular ISL/Taylor nesta sessão)
      const phAlvoSug = islSugestao?.phAlvo;
      const alcAlvoSug = islSugestao?.alcAlvo;

      const alvoFinal =
        isPH
          ? (phAlvoEstado ?? phAlvoSug)
          : isAlc
          ? (alcAlvoEstado ?? alcAlvoSug)
          : undefined;

      // só faz override se houver alvo e for número válido
      const itemParaCalculo =
        (isPH || isAlc) && alvoFinal != null && Number.isFinite(Number(alvoFinal))
        ? { ...item, valor_alvo: String(alvoFinal) }
        : item;

      const resultadoBase = calcularProduto(itemParaCalculo, volume);


      // ✅ 2) Nota ORP só para piscina a sal e cloro "alto"
      const isCloro = nome === 'Cloro Livre em ppm';
      const precisaNotaORP =
        isCloro && isPiscinaSal && Number.isFinite(valor) && valor > 5;

      const resultadoFinal = precisaNotaORP
        ? {
            ...resultadoBase,
            resultado:
              `${resultadoBase.resultado}\n` +
              `ℹ️ Piscina a sal: discrepância ORP vs ppm pode indicar alcalinidade desajustada.`,
          }
        : resultadoBase;

        // ✅ guardar meta de variação pH para o gerador de mensagens (sem popup)
        const resultadoFinalComMeta: any =
        nome === 'pH' && diffPH >= 0.3
        ? { ...resultadoFinal, variacaoPH: diffPH }
        : resultadoFinal;


      setParametrosQuimicos((prev) =>
        prev.map((p) =>
          p.parametro === item.parametro ? { ...p, resultado: resultadoFinalComMeta } : p
        )
      );
    };

    // warn: pede confirmação mas deixa calcular
    if (alerta?.level === 'warn') {
      Alert.alert(alerta.title, alerta.msg, [
        { text: 'Corrigir', style: 'cancel' },
        { text: 'Confirmo', onPress: continuar },
      ]);
      return;
    }

    continuar();
  },
  [
    isSomenteLeitura,
    cliente?.eletrolise_sal,
    volume,
    calcularProduto,
    islUltimoRegisto?.created_at,
    islSugestao?.phAlvo,
    islSugestao?.alcAlvo,
    setParametrosQuimicos,
    validarPH,
    validarCloro,
    toNum,
  ]
);

const mostrarProximoPasso = (lista: any[]) => {
  const isGotas = metodoAnalise === 'gotas';
  const cloroPrincipal = isGotas ? 'cloro total em ppm' : 'cloro livre em ppm';

  const precisaAcao = (p: any) => {
    const r = p?.resultado?.resultado;
    if (!r) return false;
    if (typeof r !== 'string') return true;
    return !r.includes('Dentro do intervalo ideal');
  };

  const rank = (p: any) => {
    const n = norm(p.parametro);
    if (n === 'dureza') return 1;
    if (n === 'alcalinidade') return 2;
    if (n === 'ph') return 3;
    if (n === cloroPrincipal) return 4;
    if (n.includes('acido cianurico')) return 6;
    if (n.includes('sal')) return 7;
    return 99;
  };

  const next = [...(lista ?? [])]
    .filter((p) => !p?.bloqueado && precisaAcao(p))
    .sort((a, b) => rank(a) - rank(b))[0];

  if (next) {
    Alert.alert('Próximo passo', `Agora corrigir: ${next.parametro}`);
  }
};

const calcularTodos = useCallback(() => {
  const normP = (s: any) => String(s || '').toLowerCase().trim();

  const lista = (parametrosQuimicos ?? [])
    .filter((p) => !p.bloqueado && String(p.valor_atual ?? '').trim() !== '');

  if (lista.length === 0) {
    Alert.alert('Nada para calcular', 'Não há parâmetros pendentes com valor preenchido.');
    return;
  }

  // ✅ Ranking final: Dureza → TAC → pH → Cloro → resto
  const rank = (p: any) => {
    const nome = normP(p.parametro);

    if (nome === 'dureza') return 1;
    if (nome === 'alcalinidade') return 2;
    if (nome === 'ph') return 3;

    // “Cloro” depende do método
    if (metodoAnalise === 'gotas') {
      if (nome.includes('cloro total')) return 4;
      if (nome.includes('cloro livre')) return 5;
    } else {
      if (nome.includes('cloro livre')) return 4;
      if (nome.includes('cloro total')) return 5;
    }

    if (nome.includes('acido cianurico')) return 6;
    if (nome.includes('sal')) return 7;
    return 99;
  };

  const ordenada = [...lista].sort((a, b) => rank(a) - rank(b));

  const durItem = ordenada.find((p) => normP(p.parametro) === 'dureza');
  const tacItem = ordenada.find((p) => normP(p.parametro) === 'alcalinidade');
  const phItem  = ordenada.find((p) => normP(p.parametro) === 'ph');

  const durValor = durItem ? toNum(durItem.valor_atual) : NaN;
  const tacValor = tacItem ? toNum(tacItem.valor_atual) : NaN;
  const phValor  = phItem  ? toNum(phItem.valor_atual)  : NaN;

  const durForaIdeal = !!durItem && isForaDoIdeal(durItem, durValor);
  const tacForaIdeal = !!tacItem && isForaDoIdeal(tacItem, tacValor);
  const phForaIdeal  = !!phItem  && isForaDoIdeal(phItem,  phValor);

  function roundToStep(v: number, step: number) {
  return Math.round(v / step) * step;
}

function refineComTaylorParaMinimizarISL(opts: {
  phBase: number;
  tacBase: number;
  th: number;
  temp: number;
  tds: number;
  w: number;
  h: number;
  angTolDeg?: number;     // default 3
  islTol?: number;        // default 0.20
}) {
  const {
    phBase, tacBase, th, temp, tds, w, h,
    angTolDeg = 3,
    islTol = 0.20,
  } = opts;

  // steps “humanos”
  const PH_STEP = 0.05;
  const TAC_STEP = 5;

  // limites ideais (os teus)
  const PH_MIN = 7.0, PH_MAX = 7.4;
  const TAC_MIN = 80, TAC_MAX = 150;

  // arredonda base já para steps
  const ph0 = Math.min(PH_MAX, Math.max(PH_MIN, roundToStep(phBase, PH_STEP)));
  const tac0 = Math.min(TAC_MAX, Math.max(TAC_MIN, roundToStep(tacBase, TAC_STEP)));

  // calcula ISL do ponto base
  const isl0 = calcularISL({
    pH: String(ph0),
    alcalinidade: String(tac0),
    dureza: String(th),
    temperatura: String(temp),
    tds: String(tds),
  }).isl;

  // Se já está dentro do desejado, não inventa.
  if (Number.isFinite(isl0) && Math.abs(Number(isl0)) <= islTol) {
    return { phAlvo: ph0, alcAlvo: tac0 };
  }

  // varre uma “janela” pequena à volta (±0.20 pH e ±20 ppm TAC)
  const phCandidates: number[] = [];
  for (let d = -0.20; d <= 0.20001; d += PH_STEP) {
    const v = Math.min(PH_MAX, Math.max(PH_MIN, roundToStep(ph0 + d, PH_STEP)));
    if (!phCandidates.includes(v)) phCandidates.push(v);
  }

  const tacCandidates: number[] = [];
  for (let d = -20; d <= 20.00001; d += TAC_STEP) {
    const v = Math.min(TAC_MAX, Math.max(TAC_MIN, roundToStep(tac0 + d, TAC_STEP)));
    if (!tacCandidates.includes(v)) tacCandidates.push(v);
  }

  let best = {
    ph: ph0,
    tac: tac0,
    islAbs: Number.isFinite(isl0) ? Math.abs(Number(isl0)) : Number.POSITIVE_INFINITY,
    angDelta: Number.POSITIVE_INFINITY,
  };

  for (const ph of phCandidates) {
    for (const tac of tacCandidates) {
      // 1) filtra por “retas verdes”: ângulo perto de 180
      const ang = calcTaylorAngleDeg(ph, tac, th, w, h);
      const deltaAng = Math.abs(180 - ang);
      if (!Number.isFinite(deltaAng) || deltaAng > angTolDeg) continue;

      // 2) calcula ISL e minimiza |ISL|
      const isl = calcularISL({
        pH: String(ph),
        alcalinidade: String(tac),
        dureza: String(th),
        temperatura: String(temp),
        tds: String(tds),
      }).isl;

      if (!Number.isFinite(isl)) continue;

      const islAbs = Math.abs(Number(isl));

      // critério: primeiro |ISL|, depois “mais verde” (menor deltaAng)
      if (
        islAbs < best.islAbs - 1e-9 ||
        (Math.abs(islAbs - best.islAbs) < 1e-9 && deltaAng < best.angDelta)
      ) {
        best = { ph, tac, islAbs, angDelta: deltaAng };
      }
    }
  }

  return { phAlvo: best.ph, alcAlvo: best.tac };
}


 // ✅ (Opção A) Recalcular ISL antes do CalcularTodos (sem guardar BD)
// Regra: só recalcula se tiver pH + TAC + Dureza + Temperatura + TDS.
// Sem defaults -> se não preencherem Temp/TDS, então "não há ISL".
const tempValor = toNum(islTemp);
const tdsValor  = toNum(islTds);

const temBaseISL =
  Number.isFinite(phValor) &&
  Number.isFinite(tacValor) &&
  Number.isFinite(durValor);

const temTemp = Number.isFinite(tempValor);
const temTds  = Number.isFinite(tdsValor);

const podeRecalcularISL = temBaseISL && temTemp && temTds;

if (podeRecalcularISL) {
  const resISL = calcularISL({
    pH: String(phValor),
    alcalinidade: String(tacValor),
    dureza: String(durValor),
    temperatura: String(tempValor),
    tds: String(tdsValor),
  });

  if (Number.isFinite(resISL.isl)) {
  setIslResultado(resISL);

  const finalSug = gerarSugestaoFinal({
    isl: Number(resISL.isl),
    phAtual: phValor,
    tacAtual: tacValor,
    thAtual: durValor,
  });

  setIslSugestao(finalSug);

  console.log('🧪 ISL recalculado no CalcularTodos:', resISL);
}


}

// (Se NÃO pode recalcular: não mexe em nada — mantém o último ISL/sugestão que já exista)

const executar = () => {
  ordenada.forEach((p) => calcularUmParametro(p));
};

  // ⚠ só avisa TAC antes do pH quando ambos fora do ideal
  if (tacForaIdeal && phForaIdeal) {
  // ✅ sem popup antigo — a central de mensagens trata da ordem TAC → pH
  executar();
  return;
}

  // (opcional) se quiseres também um aviso quando Dureza está fora do ideal e TAC/pH também,
  // podemos criar cenário, mas por agora fica simples.

    executar();

  // ✅ Depois de calcular tudo, gravar Cloro Combinado (se Total + Livre existirem)
  const getNumFromOrdenada = (keyIncludes: string) => {
    const it = ordenada.find((p: any) =>
      String(p?.parametro || '').toLowerCase().includes(keyIncludes)
    );
    const s = String(it?.valor_atual ?? '').trim();
    if (!s) return NaN;
    return toNum(s);
  };

  const livre = getNumFromOrdenada('cloro livre');
  const total = getNumFromOrdenada('cloro total');

  const cc =
    Number.isFinite(livre) && Number.isFinite(total)
      ? Math.max(0, total - livre)
      : NaN;

  if (Number.isFinite(cc)) {
    setParametrosQuimicos((prev) =>
      prev.map((p: any) => {
        const k = String(p.parametro || '').toLowerCase().trim();
        if (k !== 'cloro combinado em ppm') return p;

        return {
          ...p,
          bloqueado: true,
          valor_atual: String(cc.toFixed(2)), // 👈 grava já formatado
          status: p.status ?? 'pendente',
          // fallback para já (sem quantidades de choque)
          resultado:
            p.resultado ??
            { resultado: `Cloro Combinado: ${cc.toFixed(2)} ppm`, quantidade: 0, status: 'pendente' },
        };
      })
    );
  }
}, [
  parametrosQuimicos,
  calcularUmParametro,
  metodoAnalise,
  toNum,
  isForaDoIdeal,
  setParametrosQuimicos,
  islTemp,
  islTds,
  calcularISL,
  sugerirAlvosPorISL,
  setIslResultado,
  setIslSugestao,
]);

const handleCalcularTodos = useCallback(() => {
  // 1) faz o cálculo (vai atualizar state de parâmetros)
  calcularTodos();

  // 2) sinaliza que queremos auto-popup assim que os parâmetros estiverem atualizados
  setAbrirProcedimentoAposCalcular(true);
}, [calcularTodos]);

// ✅ Garantir que o gerador recebe os parâmetros com (resultado + status)
//    (a mesma "shape" que o UI já renderiza com item.resultado e item.status)
const parametrosParaMensagens = useMemo(() => {
  // Se já tiveres uma lista "itens" / "parametrosCalculados" usada na FlatList,
  // substitui "parametrosQuimicos" por essa lista aqui.
  return (parametrosQuimicos ?? []).map((p: any) => ({
    ...p,
    // manter o que já existe; se não existir, fica undefined
    resultado: p.resultado,
    status: (p.status ?? p.resultado?.status ?? 'pendente'),
  }));
}, [parametrosQuimicos]);

const abrirProcedimento = useCallback(() => {
  const msg =
    gerarMensagensManutencao({
      empresaid,
      clienteId,
      clienteNome: cliente?.nome,
      cliente,
      parametros: parametrosParaMensagens,
      metodoAnalise,
      modoTratamento,
    });

  // ✅ DEBUGS — depois de msg existir
  console.log('DEBUG msg.temMensagem?', msg.temMensagem);
  console.log(
    'DEBUG msg.procedimento.linhas?',
    Array.isArray(msg.procedimento) ? msg.procedimento.length : 'nao-array'
  );

  if (!msg.temMensagem) {
    Alert.alert('Procedimento', 'Sem mensagens.');
    return;
  }

  const resumoStr = Array.isArray(msg.resumo)
    ? msg.resumo.join('\n')
    : String(msg.resumo ?? '');

  const procStr = Array.isArray(msg.procedimento)
    ? msg.procedimento.join('\n')
    : String(msg.procedimento ?? '');

  Alert.alert(
    msg.titulo,
    `${resumoStr}\n\nProcedimento:\n${procStr}`
  );
}, [
  empresaid,
  clienteId,
  cliente,
  parametrosParaMensagens,
  metodoAnalise,
  modoTratamento,
]);

useEffect(() => {
  if (!abrirProcedimentoAposCalcular) return;

  // ✅ só abre quando já houver pelo menos 1 resultado calculado (quantidade/mensagem)
  const jaTemResultados = (parametrosParaMensagens ?? []).some((p: any) => !!p?.resultado?.resultado);

  if (!jaTemResultados) return;

  abrirProcedimento();              // ✅ agora já apanha o state atualizado
  setAbrirProcedimentoAposCalcular(false);
}, [abrirProcedimentoAposCalcular, parametrosParaMensagens, abrirProcedimento]);

const getCorData = (data: string) => {
  if (!data) {
    return '#FFF';// Branco por padrão
  }
  const hoje = moment();
  const dataManutencao = moment(data);
  const diferencaDias = dataManutencao.diff(hoje, 'days');

  if (diferencaDias <= 3) {
    return '#FF6347'; // Vermelho (urgente)
  }
  if (diferencaDias <= 15) {
    return '#FFA500'; // Laranja (alerta)
  }
  if (diferencaDias <= 30) {
    return '#FFD700'; // Amarelo (aviso)
  }

  return '#FFF'; // Branco (sem alerta)
};

const [itensManutencaoPeriodica, setItensManutencaoPeriodica] = useState<ItemManutencao[]>(() => {
  return [
    ...(bomba_calor
      ? [
          {
            id: 1,
            nome: 'Bomba de Calor',
            ultimaManutencao: '2024-06-01',
            proximaManutencao: '2024-07-01',
            cor: getCorData('2024-07-01'),
          },
        ]
      : []),
    ...(equipamentos_especiais
      ? [
          {
            id: 2,
            nome: 'Equipamentos Especiais',
            ultimaManutencao: '2024-05-15',
            proximaManutencao: '2024-06-15',
            cor: getCorData('2024-06-15'),
          },
        ]
      : []),
    ...(cobertura
      ? [
          {
            id: 3,
            nome: 'Cobertura',
            ultimaManutencao: '2024-01-10',
            proximaManutencao: '2024-07-10',
            cor: getCorData('2024-07-10'),
          },
        ]
      : []),
    ...(tanque_compensacao
      ? [
          {
            id: 4,
            nome: 'Tanque de Compensação',
            ultimaManutencao: '2024-01-10',
            proximaManutencao: '2024-07-10',
            cor: getCorData('2024-07-10'),
          },
        ]
      : []),
    {
      id: 5,
      nome: 'Última Substituição da Carga Filtrante',
      ultimaManutencao: ultima_substituicao || 'Data desconhecida',
      proximaManutencao: '2025-05-01',
      cor: getCorData('2025-05-01'),
    },
  ];
});

const confirmarManutencaoPeriodica = async (item: ItemManutencao) => {
  try {
    // 🔹 Obtém a data atual como "Última Manutenção"
    const hoje = moment().format('YYYY-MM-DD');
    // 🔹 Adiciona 1 ou 6 meses à data atual, dependendo do equipamento
    const proximaData = moment(hoje).add(
      item.nome === 'Tanque de Compensação' || item.nome === 'Cobertura' ? 6 : 1,
      'months'
    ).format('YYYY-MM-DD');

    // 🔹 Atualiza a manutenção no banco de dados
    await axios.put(`${Config.API_URL}/manutencoes/${clienteId}/confirmar-periodica`, {
      equipamento: item.nome,
      novaData: proximaData,
      empresaid,
    });

    Alert.alert('Sucesso', `Manutenção de ${item.nome} confirmada! Próxima: ${proximaData}`);

    // ✅ Atualiza a UI com as novas datas
    setItensManutencaoPeriodica((prevItens) =>
      prevItens.map((i) =>
        i.id === item.id ? { ...i, ultimaManutencao: hoje, proximaManutencao: proximaData } : i
      )
    );
  } catch (error) {
    console.error('Erro ao confirmar manutenção periódica:', error);
    Alert.alert('Erro', 'Não foi possível confirmar a manutenção.');
  }
};

const handleAnexarFoto = async () => {
  try {
    console.log('📎 A abrir DocumentPicker...');
    const res = await DocumentPicker.pick({
      type: [
        DocumentPicker.types.images,
        DocumentPicker.types.pdf,
        DocumentPicker.types.video,
      ],
      allowMultiSelection: false,
    });

    console.log('📄 Resultado do DocumentPicker:', res);

    // ⚙️ Garante que estamos a ler o formato correto (array ou único objeto)
    const file = Array.isArray(res) ? res[0] : res;

    if (!file || !file.uri) {
      throw new Error('O ficheiro selecionado não contém URI.');
    }

    const finalUriOriginal = file.uri;
    let finalUri = finalUriOriginal;

    // 🧩 Corrige URIs de conteúdo (Android)
    if (Platform.OS === 'android' && finalUri.startsWith('content://')) {
      const filePath = `${RNFS.CachesDirectoryPath}/anexo_${Date.now()}`;
      await RNFS.copyFile(finalUri, filePath);
      finalUri = `file://${filePath}`;
      console.log('✅ URI convertida:', finalUri);
    }

    // 🔥 Novo trecho — converte a imagem para base64
    const base64Data = await RNFS.readFile(finalUri, 'base64');
    const mimeType = file.type || 'image/jpeg'; // Padrão caso não venha definido
    const base64Uri = `data:${mimeType};base64,${base64Data}`;

    // 📦 Guarda o base64 no array de anexos
    setImagensAnexadas((prev) => [...prev, base64Uri]);
    console.log('📸 Imagem convertida e adicionada com sucesso');

  } catch (err: any) {
    console.log('🧩 ERRO COMPLETO (DocumentPicker):', JSON.stringify(err, null, 2));

    if (err?.code === 'DOCUMENT_PICKER_CANCELED') {
      console.log('❌ Seleção cancelada pelo utilizador');
    } else {
      console.error('❌ Erro ao selecionar ficheiro:', err);
      Alert.alert('Erro', err?.message || 'Erro ao selecionar o ficheiro.');
    }
  }
};

const handleEnviarRelatorio = async () => {
  if (!anomaliaDescricao.trim()) {
    Alert.alert('Erro', 'Por favor, descreva a anomalia antes de enviar.');
    return;
  }

  // ✅ 1) empresaid
  let empresaidFinal: number | null = userEmpresaid ?? null;

  if (!empresaidFinal) {
    try {
      const storedEmpresaid = await AsyncStorage.getItem('empresaid');
      if (storedEmpresaid && storedEmpresaid !== 'undefined') {
        const parsed = parseInt(storedEmpresaid, 10);
        empresaidFinal = Number.isNaN(parsed) ? null : parsed;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar empresaid do AsyncStorage:', error);
    }
  }

  if (!empresaidFinal) {
    Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
    return;
  }

  // ✅ 2) criador_id (userId)
  let criadorIdFinal: number | null = null;

  try {
    const storedUserId = await AsyncStorage.getItem('userId');
    if (storedUserId && storedUserId !== 'undefined') {
      const parsed = parseInt(storedUserId, 10);
      criadorIdFinal = Number.isNaN(parsed) ? null : parsed;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar userId do AsyncStorage:', error);
  }

  if (!criadorIdFinal) {
    Alert.alert('Erro', 'UserId não encontrado. Faça login novamente.');
    return;
  }

  const dadosEnvio = {
    cliente_id: clienteId,
    assunto: 'Relatório de Anomalia',
    mensagem: anomaliaDescricao,
    empresaid: empresaidFinal,
    anexos: imagensAnexadas.length > 0 ? imagensAnexadas : [],
    valor_servico_extra:
      valorServicoExtra !== '' ? parseFloat(valorServicoExtra) : null,
    criador_id: criadorIdFinal,
  };

  console.log('📩 Enviando relatório com os seguintes dados:', dadosEnvio);

  try {
    const response = await axios.post(`${Config.API_URL}/notificacoes`, dadosEnvio);

    if (response.status === 201) {
      Alert.alert('Sucesso', 'Relatório enviado com sucesso!');
      setAnomaliaDescricao('');
      setValorServicoExtra('');
      setImagensAnexadas([]); // Limpa os anexos
      setIsReportExpanded(false);
    } else {
      Alert.alert('Erro', 'Não foi possível enviar o relatório.');
    }
  } catch (error: unknown) {
    console.error('❌ Erro ao enviar relatório:', error);

    if (axios.isAxiosError(error)) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar relatório.');
    } else if (error instanceof Error) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado.');
    } else {
      Alert.alert('Erro', 'Erro desconhecido ao enviar relatório.');
    }
  }
};

// Lógica para alterar cor baseado na data
const isManutencaoAtrasada = (dataProxima: string) => {
    const hoje = new Date();
    const proxima = new Date(dataProxima);
    return hoje > proxima; // Retorna true se a próxima manutenção estiver atrasada
};

const atualizarPrefsManutencao = useCallback(
  async (prefs: { metodo_analise?: 'fotometro' | 'gotas' | 'fitas'; modo_tratamento?: 'sal' | 'cloro' }) => {
    if (!manutencaoAtual?.id || !empresaid) return;

    try {
      await fetch(`${Config.API_URL}/manutencoes/${manutencaoAtual.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaid,
          ...prefs,
          // ⚠️ NOTA: não envia status aqui
        }),
      });
    } catch (e) {
      console.warn('⚠️ Falha a guardar prefs da manutenção:', e);
    }
  },
  [manutencaoAtual?.id, empresaid]
);

  const concluirManutencao = async () => {
  if (!manutencaoAtual || !manutencaoAtual.id) {
    console.error('❌ Manutenção atual inválida ou não encontrada:', manutencaoAtual);
    Alert.alert('Erro', 'Manutenção atual não encontrada!');
    return;
  }

  // =========================================================
  // ✅ 0) Obrigatórios dependem do método de análise
  //   - FITAS / FOTÓMETRO: pH + Cloro Livre
  //   - GOTAS:            pH + Cloro Total
  // =========================================================
  const obrigatoriosNorm =
    metodoAnalise === 'gotas'
      ? ['ph', 'cloro total em ppm']
      : ['ph', 'cloro livre em ppm'];

  // ✅ 1) Só validar o que é obrigatório HOJE (dinâmico) e que não seja "não ajustável"
  const parametrosParaValidar = parametrosQuimicos.filter((p: any) => {
    const n = norm(p.parametro);
    const ehObrigatorioHoje = obrigatoriosNorm.includes(n);
    const podeValidar = p.status !== 'nao ajustavel';
    return ehObrigatorioHoje && podeValidar;
  });

  console.log(
    '📌 Parâmetros para validar (obrigatórios hoje):',
    parametrosParaValidar.map((p: any) => ({ parametro: p.parametro, status: p.status, valor_atual: p.valor_atual }))
  );

  // ✅ 2) Validação forte: tem de ter valor_atual + status final
  const faltas = parametrosParaValidar.filter((p: any) => {
    const valorVazio =
      p.valor_atual === undefined ||
      p.valor_atual === null ||
      String(p.valor_atual).trim() === '';

    const statusOk =
      p.status === 'aplicado' ||
      p.status === 'sem estoque' ||
      p.status === 'nao necessario' ||
      p.status === 'nao ajustavel';

    return valorVazio || !statusOk;
  });

  if (faltas.length > 0) {
    const nomes = faltas.map((p: any) => `• ${p.parametro}`).join('\n');

    // texto mais explícito consoante o método
    const obrigTxt =
      metodoAnalise === 'gotas'
        ? 'pH e Cloro Total'
        : 'pH e Cloro Livre';

    Alert.alert(
      'Erro',
      `Faltam parâmetros obrigatórios para concluir hoje (${obrigTxt}):\n\n${nomes}\n\n(Preenche o valor atual e valida o parâmetro.)`
    );
    return;
  }

  // ✅ 3) Enviar para o backend apenas os que foram validados (limpo)
  const parametrosParaEnviar = parametrosQuimicos
    .filter(
      (p: any) =>
        p.status === 'aplicado' ||
        p.status === 'sem estoque' ||
        p.status === 'nao necessario' ||
        p.status === 'nao ajustavel'
    )
    .map((p: any) => ({
      parametro: p.parametro,
      valor_atual: p.valor_atual,
      produto_usado: p.resultado?.produto || null,
      quantidade_usada: p.resultado?.quantidade || 0,
    }));

    // ✅ 3.5) Guardar ISL automaticamente ao concluir (se existir cálculo/valores)
try {
  const temBaseISL =
    String(islPH || '').trim() !== '' &&
    String(islAlc || '').trim() !== '' &&
    String(islDur || '').trim() !== '' &&
    String(islTemp || '').trim() !== '';

} catch (e) {
  console.warn('⚠️ [AUTO] Erro inesperado ao guardar ISL:', e);
}

  try {
    const response = await fetch(`${Config.API_URL}/manutencoes/${manutencaoAtual.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'concluida',
        parametros: parametrosParaEnviar,
        metodo_analise: metodoAnalise,
        modo_tratamento: modoTratamento,
        empresaid,
      }),
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData.error || 'Erro ao concluir manutenção.');
    }

    setManutencaoAtual((prev) => (prev ? { ...prev, status: 'concluida' } : prev));

    setParametrosQuimicos((prev: any[]) =>
      prev.map((p) => ({
        ...p,
        bloqueado: true,
      }))
    );

    // ✅ atualiza estado ISL (sem histórico)
  
    // ✅ Após concluir manutenção: atualizar estado ISL (sem criar histórico)
try {
  const islAtivo = !!cliente?.isl_ativo; // coluna nova
  const islOk = Number.isFinite(Number(islResultado?.isl));

  if (islAtivo && islOk) {
    const payloadEstado = {
      empresaid,
      cliente_id: clienteId,
      ph: Number(islPH),
      alcalinidade: Number(islAlc),
      dureza: Number(islDur),
      temperatura: Number(islTemp),
      tds: islTds ? Number(islTds) : null,
      isl: Number(islResultado?.isl),
      indicacao: islResultado?.indicacao ?? null,

      // ✅ gravar os alvos finais (Taylor/ISL)
      ph_alvo: islSugestao?.phAlvo ?? null,
      alc_alvo: islSugestao?.alcAlvo ?? null,
    };

    const respEstado = await fetch(`${Config.API_URL}/isl/estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadEstado),
    });

    if (!respEstado.ok) {
      const txt = await respEstado.text().catch(() => '');
      console.warn('⚠️ Falha a atualizar ISL estado:', respEstado.status, txt);
    } else {
      console.log('✅ ISL estado atualizado no concluir manutenção');
    }
  }
} catch (e) {
  console.warn('⚠️ Erro ao atualizar ISL estado no concluir manutenção:', e);
}


        Alert.alert('Sucesso', 'Manutenção concluída com sucesso!');

navigation.dispatch(
  CommonActions.reset({
    index: 2,
    routes: [
      {
        name: 'Login', // 👈 o teu ecrã "raiz" das equipas
        params: { empresaid, equipeId, equipeNome },
      },
      {
        name: 'EquipeHome', // 👈 o teu ecrã "raiz" das equipas
        params: { empresaid, equipeId, equipeNome },
      },
      {
        name: 'EquipesDiasDaSemana', // 👈 ecrã dos dias
        params: { empresaid, equipeId, equipeNome },
      },
      {
        name: 'EquipesPiscinasPorDia', // 👈 lista do dia
        params: { empresaid, equipeId, equipeNome, diaSemana },
      },
    ],
  })
);

  } catch (error) {
    console.error('❌ Erro ao concluir manutenção:', error);
    Alert.alert('Erro', 'Não foi possível concluir a manutenção.');
  }

};

  const marcarNaoConcluidaComMotivo = () => {
  Alert.alert(
    'Motivo da Não Conclusão',
    'Escolhe a razão:',
    [
      { text: '🚰 Piscina a encher / torneira aberta', onPress: () => marcarNaoConcluida('torneira_aberta') },
      { text: '⏱️ Motor em manual', onPress: () => marcarNaoConcluida('motor_manual') },
      { text: '🚪 Cliente não estava / sem acesso', onPress: () => marcarNaoConcluida('cliente_ausente') },
      { text: 'Cancelar', style: 'cancel' },
    ]
  );
};

  const marcarNaoConcluida = async (motivoEscolhido: string) => {
  if (!manutencaoAtual?.id) {
    Alert.alert('Erro', 'Manutenção atual não encontrada!');
    return;
  }

  try {
    const response = await fetch(`${Config.API_URL}/manutencoes/${manutencaoAtual.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'nao_concluida',
        motivo: motivoEscolhido, // ✅ usa a coluna existente "motivo"
        empresaid,
        metodo_analise: metodoAnalise,
        modo_tratamento: modoTratamento,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erro ao registrar manutenção não concluída.');
    }

    setManutencaoAtual((prev) =>
      prev ? { ...prev, status: 'nao_concluida', motivo: motivoEscolhido } : prev
    );

    navigation.goBack();
  } catch (e) {
    console.error('Erro ao marcar manutenção como não concluída:', e);
    Alert.alert('Erro', 'Não foi possível registrar a manutenção como não concluída.');
  }
};

const norm = (s: any) =>
  String(s || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getValorAtualByNorm = React.useCallback(
  (key: string) => {
    const it = parametrosQuimicos.find((p) => norm(p.parametro) === key);
    const n = it ? toNum(it.valor_atual) : NaN;
    return Number.isFinite(n) ? n : NaN;
  },
  [parametrosQuimicos]
);

const calcCloroCombinado = React.useCallback(() => {
  const livre = toNum(getValorAtualByNorm('cloro livre em ppm'));
  const total = toNum(getValorAtualByNorm('cloro total em ppm'));
  if (!Number.isFinite(livre) || !Number.isFinite(total)) return NaN;
  return Math.max(0, total - livre);
}, [getValorAtualByNorm]);

const recolherTudoParametros = useCallback(() => {
  setExpandMetodo(false);
  setExpandCloroTotal(false);
  setExpandTratamento(false);

  // Se tiveres mais estados de “expand/slider”, fecha aqui também:
  // setAlgumaCoisa(false);
}, []);

useEffect(() => {
  const fromTR = (route.params as any)?.fromTesteRapido;
  if (!fromTR) return;

  setIsParametrosExpanded(true);
  recolherTudoParametros();

  // limpa flag para não repetir
  navigation.setParams({ fromTesteRapido: undefined } as any);
}, [route.params, recolherTudoParametros, navigation]);

useEffect(() => {
  const normP = (s: any) => String(s || '').toLowerCase().trim();

  const getAtual = (nomeProc: string) => {
    const it = (parametrosQuimicos ?? []).find((p) => normP(p.parametro) === nomeProc);
    const v = it ? toNum(it.valor_atual) : NaN;
    return Number.isFinite(v) ? v : NaN;
  };

  const ph = getAtual('ph');
  const alc = getAtual('alcalinidade');
  const dur = getAtual('dureza');

  // ✅ só atualiza se existir valor (não apaga o que já lá estava)
  if (Number.isFinite(ph)) setIslPH(String(ph));
  if (Number.isFinite(alc)) setIslAlc(String(Math.round(alc)));
  if (Number.isFinite(dur)) setIslDur(String(Math.round(dur)));
}, [parametrosQuimicos, toNum, setIslPH, setIslAlc, setIslDur]);


// estados, hooks, helpers, etc...

// 🔹 1️⃣ Aqui (ANTES do return)
const getOrdemParametro = (p: any) => {
  const n = norm(p?.parametro);

  // ⚠️ não mostramos cloro combinado como card (fica dentro do cloro total)
  if (n === 'cloro combinado em ppm') return 9999;

  // ✅ ordem fixa (a tua)
  if (n === 'dureza') return 10;

  // cloro total primeiro (como tu queres para estruturar: cloro combinado dentro)
  if (n === 'cloro total em ppm') return 20;

  if (n === 'cloro livre em ppm') return 30;

  if (n === 'ph') return 40;

  if (n === 'alcalinidade') return 50;

  if (n.includes('acido cianurico')) return 60;

  if (n.includes('sal')) return 70;
  if (n.includes('cloro orp')) return 80;
  if (n.includes('oxigenio')) return 90;

  // tudo o resto vai para o fim
  return 500;
};

const isGotas = metodoAnalise === 'gotas'; 

// ✅ Filtra o que deve aparecer (ANTES de ordenar)
const parametrosVisiveis: Parametro[] = (parametrosQuimicos ?? []).filter((p) => {
  const n = norm(p.parametro);

  // Nunca mostrar combinado como card (vai ser inline no total quando fizer sentido)
  if (n === 'cloro combinado em ppm') return false;

  // Sal só se modoTratamento === 'sal'
  if (n === 'sal em kg/m³' && modoTratamento !== 'sal') return false;

  // GOTAS: não existe cloro livre
  if (isGotas && n === 'cloro livre em ppm') return false;

  return true;
});

// ✅ Ordenação estável (não depende de valor/resultado)
const parametrosOrdenados: Parametro[] = [...parametrosVisiveis].sort((a, b) => {
  const da = getOrdemParametro(a);
  const db = getOrdemParametro(b);

  if (da !== db) return da - db;

  // desempate estável (nunca muda ordem ao calcular)
  return norm(a.parametro).localeCompare(norm(b.parametro));
});

      const cc = calcCloroCombinado();
      const limiteCloroCombinado = metodoAnalise === 'fotometro' ? 0.5 : 0.5;
      const mostrarAlertaCC = Number.isFinite(cc) && cc > limiteCloroCombinado;

      const getValorAtualRawByNorm = (targetNorm: string) => {
  const p = (parametrosQuimicos ?? []).find((x) => norm(x.parametro) === targetNorm);
  // devolve o que está MESMO no input (string/null/undefined)
  return p?.valor_atual;
};

const fmtDataCurta = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

return (
  <FlatList
    data={isItensExpanded ? itensManutencaoPeriodica : []} // Apenas carrega os itens quando expandido
    keyExtractor={(item) => item.id.toString()}
    ListHeaderComponent={
      <>
       <View style={styles.container}>
  {/* Cliente */}
  <View style={styles.section}>
    <TouchableOpacity onPress={() => setIsClienteExpanded(!isClienteExpanded)}>
      <Text style={styles.sectionTitle}>
        {cliente?.nome ?? 'Carregando...'}
      </Text>
    </TouchableOpacity>

    {isClienteExpanded && cliente && (
      <View style={styles.expandedContent}>
        <Text style={styles.details}>
          Morada: {cliente.morada || '—'}
        </Text>

        {cliente.google_maps ? (
          <TouchableOpacity
            onPress={() => {
              if (cliente.google_maps) {
                Linking.openURL(cliente.google_maps);
              }
            }}
          >
            <Text style={styles.linkText}>📍 Abrir no Google Maps</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.details}>📍 Localização não disponível</Text>
        )}

        <Text style={styles.details}>
          Telefone: {cliente.telefone || '—'}
        </Text>

        <Text style={styles.details}>
          Informação de Acesso:{' '}
          {cliente.info_acesso?.trim() || '—'}
        </Text>
      </View>
    )}
  </View>

         {/* Índice de Saturação (Langelier) */} 
<View style={styles.section}>
  <TouchableOpacity onPress={() => setIslExpanded(!islExpanded)}>
    <Text style={styles.sectionTitle}>Índice de Saturação (Langelier)</Text>
  </TouchableOpacity>

  {islExpanded && (
    <View style={styles.expandedContent}>
  {/* pH */}
  <View style={styles.labelRow}>
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
    <Text style={styles.label}>pH</Text>
    <Text style={styles.badgeAuto}>Automático</Text>
  </View>

  <Text style={styles.updateDate}>
    {fmtDataCurta(islEstadoAtual?.ph_updated_at)}
  </Text>
</View>

<View style={styles.parametroLinha}>
  <TextInput
    style={[styles.input, styles.inputPequeno, styles.inputAuto]}
    value={islPH}
    editable={false}
    placeholder="—"
    placeholderTextColor="#888"
  />
</View>


      {/* Alcalinidade */}
    <View style={styles.labelRow}>
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
    <Text style={styles.label}>Alcalinidade (ppm)</Text>
    <Text style={styles.badgeAuto}>Automático</Text>
  </View>

  <Text style={styles.updateDate}>
    {fmtDataCurta(islEstadoAtual?.alcalinidade_updated_at)}
  </Text>
</View>
      <View style={styles.parametroLinha}>
  <TextInput
    style={[styles.input, styles.inputPequeno, styles.inputAuto]}
    value={islAlc}
    editable={false}
    placeholder="—"
    placeholderTextColor="#888"
  />
</View>

      {/* Dureza */}
    <View style={styles.labelRow}>
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
    <Text style={styles.label}>Dureza (ppm)</Text>
    <Text style={styles.badgeAuto}>Automático</Text>
  </View>

  <Text style={styles.updateDate}>
    {fmtDataCurta(islEstadoAtual?.dureza_updated_at)}
  </Text>
</View>
      <View style={styles.parametroLinha}>
  <TextInput
    style={[styles.input, styles.inputPequeno, styles.inputAuto]}
    value={islDur}
    editable={false}
    placeholder="—"
    placeholderTextColor="#888"
  />
</View>

      {/* Temperatura */}
      <View style={styles.labelRow}>
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
    <Text style={styles.label}>Temperatura (°C)</Text>
    <Text style={styles.badgeManual}>Manual</Text>
  </View>

  <Text style={styles.updateDate}>
    {fmtDataCurta(islEstadoAtual?.temperatura_updated_at)}
  </Text>
</View>

      <View style={styles.parametroLinha}>
        <TextInput
  style={[styles.input, styles.inputPequeno]}
  placeholder="Ex: 24"
  keyboardType="decimal-pad"
  value={islTemp}
  onChangeText={(t) => {
    const limpo = t
      .replace(',', '.')              // vírgula → ponto
      .replace(/[^0-9.]/g, '')        // só números e ponto
      .replace(/(\..*?)\..*/g, '$1'); // só 1 ponto

    setIslTemp(limpo);
  }}
  placeholderTextColor="#888"
/>

      </View>

      {/* TDS opcional */}
      <View style={styles.labelRow}>
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
    <Text style={styles.label}>TDS (ppm)</Text>
    <Text style={styles.badgeManual}>Manual</Text>
  </View>

  <Text style={styles.updateDate}>
    {fmtDataCurta(islEstadoAtual?.tds_updated_at)}
  </Text>
</View>

      {/* linha só com o input */}
<View style={styles.parametroLinha}>
  <TextInput
  style={[styles.input, styles.inputPequeno]}
  placeholder="Ex: 1000"
  keyboardType="numeric"
  value={islTds}
  onChangeText={(t) => {
    const limpo = t.replace(/[^0-9]/g, '');
    setIslTds(limpo);
  }}
  placeholderTextColor="#888"
/>

</View>

{/* botão em linha própria, centrado */}
<View style={styles.centerRow}>
  <TouchableOpacity
    style={[
      styles.buttonCalcular,
      styles.btnSameHeight,
      styles.btnMedium,
      styles.btnCenter,
      (!islPH || !islAlc || !islDur || !islTemp) && styles.buttonDisabled,
    ]}
    onPress={onCalcularISL}
    disabled={!islPH || !islAlc || !islDur || !islTemp}
  >
    <Text style={styles.buttonText}>Calcular ISL</Text>
  </TouchableOpacity>
</View>

      {/* Resultado */}
      {islResultado && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.details}>📌 ISL: {islResultado.isl}</Text>
          <Text style={styles.details}>🧭 {islResultado.indicacao}</Text>

          <Text style={styles.details}>
            (D={islResultado.D} | A={islResultado.A} | T={islResultado.T} | S={islResultado.S})
          </Text>

        {(() => {
  const durParam = parametrosQuimicos.find((p) => String(p.parametro).trim() === 'Dureza');
  const durAtual = toNum(islDur);

  const durMin = durParam ? toNum(durParam.valor_minimo) : 175; // fallback seguro
  const durMax = durParam ? toNum(durParam.valor_maximo) : 300; // fallback seguro

  const phNum = toNum(islPH);
  const tacNum = toNum(islAlc);

  const islNum = Number(islResultado?.isl);

  const phOk = Number.isFinite(phNum) && phNum >= 7.0 && phNum <= 7.4;
  const tacOk = Number.isFinite(tacNum) && tacNum >= 80 && tacNum <= 150;
  const thOk =
    Number.isFinite(durAtual) &&
    Number.isFinite(durMin) &&
    Number.isFinite(durMax) &&
    durAtual >= durMin &&
    durAtual <= durMax;

  const islEstavel = Number.isFinite(islNum) && Math.abs(islNum) <= 0.15;

  const durezaBaixa = Number.isFinite(durAtual) && Number.isFinite(durMin) && durAtual < durMin;
  const durezaAlta  = Number.isFinite(durAtual) && Number.isFinite(durMax) && durAtual > durMax;
  const durezaFora  = durezaBaixa || durezaAlta;

  // 1) Se a dureza está fora do intervalo, esta é sempre a prioridade
  if (durezaFora) {
    const sentido = durezaBaixa ? 'aumentar' : 'diminuir';
    const ref = `(${durMin}–${durMax})`;

    return (
      <View style={{ marginTop: 10 }}>
        <Text style={styles.details}>
          ⚠️ Dureza fora do intervalo ideal {ref}. Prioridade: {sentido} a dureza.
          {'\n'}Após a correção, aguarda 12–24h (com circulação) e faz novos testes para recalcular o ISL e as sugestões.
        </Text>
      </View>
    );
  }

  // 2) Parâmetros OK, ISL ligeiramente fora da zona estável
if (
  Number.isFinite(islNum) &&
  Math.abs(islNum) > 0.15 &&
  Math.abs(islNum) <= 0.20 &&
  phOk &&
  tacOk &&
  thOk
) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.details}>
        🟡 Parâmetros dentro do intervalo ideal. ISL ligeiramente fora da zona estável.
        {'\n'}
        Se quiseres aproximar do equilíbrio ideal, consulta o gráfico e faz apenas um micro-ajuste
        de pH ou alcalinidade ou dureza, o que for mais favorável para alinhar as duas retas.
        {'\n'}
        ⚠️ Evita ajustes sucessivos — pequenas correções são suficientes.
      </Text>
    </View>
  );
}


  // 2) Zona estável só faz sentido se pH + TAC + TH estiverem dentro dos ideais
if (islEstavel && phOk && tacOk && thOk) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.details}>
        ✅ Zona estável (±0.15) e parâmetros dentro do ideal. Manter — evitar micro-ajustes.
      </Text>
    </View>
  );
}

// 2b) ISL dentro do aceitável, mas algum parâmetro fora do ideal => NÃO permitir "manter"
if (islEstavel && !(phOk && tacOk && thOk)) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.details}>
        🟡 ISL dentro do aceitável (±0.20), mas há parâmetros fora do intervalo ideal.
        Ajusta para trazer tudo ao ideal e só depois evita micro-ajustes.
      </Text>

      {islSugestao?.phAlvo != null && islSugestao?.alcAlvo != null && (
        <Text style={styles.details}>
          🎯 Sugestão alvo: pH {islSugestao.phAlvo} | Alcalinidade {islSugestao.alcAlvo} ppm
        </Text>
      )}
    </View>
  );
}



  // 3) Caso normal: mostrar sugestão apenas quando for "ajustar" e não vier null
  if (islSugestao?.modo !== 'manter' && islSugestao?.phAlvo != null && islSugestao?.alcAlvo != null) {
    return (
      <View style={{ marginTop: 10 }}>
        <Text style={styles.details}>
          🎯 Sugestão alvo: pH {islSugestao.phAlvo} | Alcalinidade {islSugestao.alcAlvo} ppm
        </Text>
      </View>
    );
  }

  // 4) Tudo dentro do ideal, mas ISL ligeiramente fora da zona estável
const islLigeiro =
  Number.isFinite(islNum) &&
  Math.abs(islNum) > 0.15 &&
  Math.abs(islNum) <= 0.30;

if (islLigeiro && phOk && tacOk && thOk) {
  const sentido = islNum < 0 ? 'negativo' : 'positivo';
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.details}>
        ✅ Parâmetros dentro do ideal. ISL ligeiramente {sentido} (fora de ±0.15).
        {'\n'}Se quiseres aproximar da zona estável, consulta o gráfico e ajusta *apenas* pH ou alcalinidade
        em pequenos passos (pH 0.05 / TAC 5 ppm) para alinhar as duas retas.
      </Text>
    </View>
  );
}

  // Se modo=manter mas não cumpre pH/TAC/TH ideais, não chamamos “zona estável”
  // e também não forçamos sugestão (fica só o ISL/indicação e o gráfico para leitura)
  return null;
})()}




            {/* Tabela de Taylor */}
          <View style={styles.islButtonsRow}>
  <TouchableOpacity
    style={[styles.buttonCalcular, styles.islBtnCompact]}
    onPress={() => setTaylorOpen((v) => !v)}
  >
    <Text style={styles.buttonText}>
      {taylorOpen ? 'Ocultar gráfico' : 'Ver gráfico'}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.buttonCalcular,
      styles.islBtnCompact,
      (!empresaid || !clienteId) && styles.buttonDisabled,
    ]}
    onPress={onGuardarISL}
    disabled={!empresaid || !clienteId}
  >
    <Text style={styles.buttonText}>Guardar ISL</Text>
  </TouchableOpacity>
</View>

{taylorOpen && (
  <View style={styles.taylorWrapper}>
    <Text style={styles.taylorTitle}>Tabela de Taylor</Text>

    <TaylorChart
      width={260}
      height={460}
      ph={toNum(islPH)}
      tac={toNum(islAlc)}
      th={toNum(islDur)}
      phAlvo={islSugestao?.phAlvo ?? null}
      tacAlvo={islSugestao?.alcAlvo ?? null}
      thAlvo={null}
    />
  </View>
)}

        </View>
      )}
    </View>
  )}
</View>




{/* Parâmetros Químicos */}
<View style={styles.section}>
  <TouchableOpacity onPress={() => setIsParametrosExpanded(!isParametrosExpanded)}>
    <Text style={styles.sectionTitle}>
      Parâmetros Químicos - Volume: {volume} m³
    </Text>
  </TouchableOpacity>

  {/* ✅ Tratamento (Sal vs Cloro) */}
<View style={styles.radioBlock}>
  <TouchableOpacity
    style={styles.radioHeader}
    onPress={() => setExpandTratamento((v) => !v)}
  >
    <Text style={styles.radioTitle}>
      Piscina tratada com:{" "}
      <Text style={{ fontWeight: '600' }}>
        {modoTratamento === 'sal'
          ? 'Eletrólise de sal'
          : 'Cloro'}
      </Text>
    </Text>
    <Text style={styles.chevron}>{expandTratamento ? '▲' : '▼'}</Text>
  </TouchableOpacity>

  {expandTratamento && (
    <>
      {/* Sal */}
      <TouchableOpacity
        style={styles.radioRow}
        onPress={() => {
          if (modoTratamento === 'sal') return;
          Alert.alert(
            'Confirmar',
            'Está a tratar esta manutenção como piscina a SAL. OK?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'OK',
                onPress: async () => {
                  setModoTratamento('sal');
                  await atualizarPrefsManutencao({ modo_tratamento: 'sal' });
                  setExpandTratamento(false);
                },
              },
            ]
          );
        }}
      >
        <View style={[styles.radioDot, modoTratamento === 'sal' && styles.radioDotOn]} />
        <Text style={styles.radioText}>Eletrólise de sal</Text>
      </TouchableOpacity>

      {/* Cloro */}
      <TouchableOpacity
        style={styles.radioRow}
        onPress={() => {
          if (modoTratamento === 'cloro') return;
          Alert.alert(
            'Confirmar',
            'Está a tratar esta manutenção como piscina a CLORO. OK?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'OK',
                onPress: async () => {
                  setModoTratamento('cloro');
                  await atualizarPrefsManutencao({ modo_tratamento: 'cloro' });
                  setExpandTratamento(false);
                },
              },
            ]
          );
        }}
      >
        <View style={[styles.radioDot, modoTratamento === 'cloro' && styles.radioDotOn]} />
        <Text style={styles.radioText}>Cloro (manual / automático)</Text>
      </TouchableOpacity>
    </>
  )}
</View>

{/* 🧪 Método de análise */}
<View style={styles.radioBlock}>
  <TouchableOpacity
    style={styles.radioHeader}
    onPress={() => setExpandMetodo((v) => !v)}
  >
    <Text style={styles.radioTitle}>
      Análises com:{" "}
      <Text style={{ fontWeight: '600' }}>
        {metodoAnalise === 'fotometro'
          ? 'Fotómetro'
          : metodoAnalise === 'gotas'
          ? 'Gotas / titulação'
          : 'Fitas (AquaChek)'}
      </Text>
    </Text>
    <Text style={styles.chevron}>{expandMetodo ? '▲' : '▼'}</Text>
  </TouchableOpacity>

  {expandMetodo && (
    <>
      {/* Fotómetro */}
      <TouchableOpacity
        style={styles.radioRow}
        onPress={() => {
          if (metodoAnalise === 'fotometro') return;
          Alert.alert(
            'Confirmar',
            'Está a usar o FOTÓMETRO para esta análise. OK?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'OK',
                onPress: async () => {
                  setMetodoAnalise('fotometro');
                  await atualizarPrefsManutencao({ metodo_analise: 'fotometro' });
                  setExpandMetodo(false);
                },
              },
            ]
          );
        }}
      >
        <View
          style={[
            styles.radioDot,
            metodoAnalise === 'fotometro' && styles.radioDotOn,
          ]}
        />
        <Text style={styles.radioText}>Fotómetro (mais preciso)</Text>
      </TouchableOpacity>

      {/* Gotas */}
      <TouchableOpacity
        style={styles.radioRow}
        onPress={() => {
          if (metodoAnalise === 'gotas') return;
          Alert.alert(
            'Confirmar',
            'Está a usar TESTES DE GOTAS para esta análise. OK?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'OK',
                onPress: async () => {
                  setMetodoAnalise('gotas');
                  await atualizarPrefsManutencao({ metodo_analise: 'gotas' });
                  setExpandMetodo(false);
                },
              },
            ]
          );
        }}
      >
        <View
          style={[
            styles.radioDot,
            metodoAnalise === 'gotas' && styles.radioDotOn,
          ]}
        />
        <Text style={styles.radioText}>Gotas / titulação</Text>
      </TouchableOpacity>

      {/* Fitas */}
      <TouchableOpacity
        style={styles.radioRow}
        onPress={() => {
          if (metodoAnalise === 'fitas') return;
          Alert.alert(
            'Confirmar',
            'Está a usar FITAS (AquaChek) para esta análise. OK?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'OK',
                onPress: async () => {
                  setMetodoAnalise('fitas');
                  await atualizarPrefsManutencao({ metodo_analise: 'fitas' });
                  setExpandMetodo(false);
                },
              },
            ]
          );
        }}
      >
        <View
          style={[
            styles.radioDot,
            metodoAnalise === 'fitas' && styles.radioDotOn,
          ]}
        />
        <Text style={styles.radioText}>Fitas (AquaChek) — rápido</Text>
      </TouchableOpacity>
    </>
  )}
</View>

<View style={styles.acoesRow}>
  <TouchableOpacity
  style={[
    styles.acaoBtnBase,
    styles.testeRapidoBtn,
    (isSomenteLeitura || bloquearTesteRapido) && styles.acaoBtnDisabled,
  ]}
  disabled={isSomenteLeitura || bloquearTesteRapido}
  onPress={() => {
    if (isSomenteLeitura) return;

    if (!testeRapidoPermitido) {
      Alert.alert(
        'Teste Rápido indisponível',
        'O Teste Rápido só está disponível quando as análises são feitas com FITAS.'
      );
      return;
    }

    if (bloquearTesteRapido) {
      Alert.alert(
        'Teste Rápido bloqueado',
        'Já existe pelo menos 1 parâmetro validado. Conclui a manutenção (ou faz reset) antes de usar o Teste Rápido.'
      );
      return;
    }

    abrirTesteRapidoComConfirmacao();
  }}
>
  <Text style={styles.acaoBtnText}>⚡ Teste rápido</Text>
</TouchableOpacity>

  <TouchableOpacity
  style={[
    styles.acaoBtnBase,
    styles.calcularTodosBtn,
    (isSomenteLeitura || bloquearAcoesAuto) && styles.acaoBtnDisabled,
  ]}
  disabled={isSomenteLeitura || bloquearAcoesAuto}
  onPress={() => {
    if (bloquearAcoesAuto) {
      Alert.alert(
        'Ação bloqueada',
        'Já existe pelo menos 1 parâmetro validado/bloqueado. Para segurança, não é possível recalcular em massa após validações.'
      );
      return;
    }
    handleCalcularTodos();
  }}
>
  <Text style={styles.acaoBtnText}>Calcular todos</Text>
</TouchableOpacity>

<TouchableOpacity onPress={abrirProcedimento} style={styles.botaoProcedimento}>
  <Text style={styles.botaoProcedimentoTxt}>Info</Text>
</TouchableOpacity>

</View>

 {isParametrosExpanded && parametrosOrdenados.length > 0 ? (
  <>
    {parametrosOrdenados.map((item, index) => {
      const nomeNorm = norm(item.parametro);

      const isPH = nomeNorm === 'ph';
      const isAlc = nomeNorm === 'alcalinidade';
      const isCloroTotal = nomeNorm === 'cloro total em ppm';
      const isCloroLivre = nomeNorm === 'cloro livre em ppm';
      const isSal = nomeNorm === 'sal';

      const totalRaw = getValorAtualRawByNorm('cloro total em ppm');
const livreRaw = getValorAtualRawByNorm('cloro livre em ppm');

const totalTemValor =
  totalRaw !== undefined && totalRaw !== null && String(totalRaw).trim() !== '';
const livreTemValor =
  livreRaw !== undefined && livreRaw !== null && String(livreRaw).trim() !== '';

const totalAtual = totalTemValor ? toNum(totalRaw) : NaN;
const livreAtual = livreTemValor ? toNum(livreRaw) : NaN;

// ✅ só aparece quando OS DOIS estão realmente preenchidos
const mostrarCloroCombinadoInline =
  !isGotas &&
  isCloroTotal &&
  totalTemValor &&
  livreTemValor &&
  Number.isFinite(totalAtual) &&
  Number.isFinite(livreAtual);

const cc = mostrarCloroCombinadoInline ? Math.max(0, totalAtual - livreAtual) : NaN;

const limiteCloroCombinado = 0.5;
const mostrarAlertaCC = mostrarCloroCombinadoInline && cc > limiteCloroCombinado;

      // Fotómetro/Fitas: cloro total é só leitura (sem doseamento/botões)
const cloroTotalSoLeitura = isCloroTotal && !isGotas;

const tituloFinal =
  nomeNorm === 'cloro livre em ppm' ? 'Cloro Livre em ppm' :
  nomeNorm === 'cloro total em ppm' ? 'Cloro Total em ppm' :
  nomeNorm === 'ph' ? 'pH' :
  nomeNorm === 'alcalinidade' ? 'Alcalinidade em ppm' :
  nomeNorm.includes('acido cianurico') ? 'Ácido Cianúrico em ppm' :
  nomeNorm === 'dureza' ? 'Dureza em ppm' :
  nomeNorm === 'sal' ? 'sal em kg/m³' :
  item.parametro;

// ✅ Aviso CYA: só para FITAS e só quando houver alcalinidade preenchida e < 65
const alcRaw = getValorAtualByNorm('alcalinidade'); // pode ser '', null, undefined, '80', etc.
const alcTemValor =
  alcRaw !== undefined && alcRaw !== null && String(alcRaw).trim() !== '';

const alcHoje = parametrosQuimicos.find(
  (p) => norm(p.parametro) === 'alcalinidade'
);

const alcValorHoje =
  alcHoje?.valor_atual !== undefined &&
  alcHoje?.valor_atual !== null &&
  String(alcHoje.valor_atual).trim() !== ''
    ? toNum(alcHoje.valor_atual)
    : NaN;


const isCYA =
  nomeNorm === 'acido cianurico' ||
  nomeNorm === 'acido cianurico em ppm' ||
  nomeNorm.includes('acido cianurico');

const mostrarAvisoCYA =
  metodoAnalise === 'fitas' &&
  isCYA &&
  Number.isFinite(alcValorHoje) &&
  alcValorHoje < 65;

const mostrarConteudo = isExpanded(item.parametro);

const alvoISL =
  isPH ? islSugestao?.phAlvo :
  isAlc ? islSugestao?.alcAlvo :
  null;

const islCreatedAt =
  islEstadoAtual?.isl_updated_at ||
  islEstadoAtual?.updated_at ||
  islEstadoAtual?.created_at ||
  null;

const bloquearTesteRapidoFinal = bloquearTesteRapido || !testeRapidoPermitido;

const corParametro = (() => {
  switch (nomeNorm) {
    case 'ph': return '#4CAF50';
    case 'alcalinidade': return '#03A9F4';
    case 'cloro livre em ppm': return '#00BCD4';
    case 'cloro total em ppm': return '#009688';
    case 'acido cianurico': return '#FF9800';
    case 'dureza': return '#9C27B0';
    case 'sal em kg/m³': return '#607D8B';
    default: return '#BDBDBD';
  }
})();

      const islValido =
        !!islCreatedAt &&
        Date.now() - new Date(islCreatedAt).getTime() <= 90 * 24 * 60 * 60 * 1000;

      const mostrarAlvoISL =
        (isPH || isAlc) && alvoISL !== null && islValido;

  return (
    <View key={`${item.parametro}-${index}`} style={styles.parametroContainer}>
  {/* Aba de cor (cortada dentro do cartão) */}
  <View style={styles.cornerClip}>
    <View
      style={[
        styles.parametroDiamond,
        { backgroundColor: corParametro },
      ]}
    />
  </View>

      {/* ✅ TÍTULO (todos clicáveis) */}
      <TouchableOpacity
        onPress={() => toggleExpanded(item.parametro)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={styles.parametroTitulo}>{tituloFinal}</Text>
        <Text style={styles.chevron}>
          {isExpanded(item.parametro) ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>


      {/* ✅ CONTEÚDO (só aparece quando expandido) */}
      {mostrarConteudo && (
        <View style={styles.parametroLinha}>

          {/* 🎯 Alvo ISL (Opção B) */}
      {mostrarAlvoISL && (
        <Text style={styles.details}>
          🎯 Alvo ISL: {alvoISL}{isAlc ? ' ppm' : ''} • Atualizado em:{' '}
          {fmtDataCurta(islCreatedAt)}
        </Text>
      )}

          {/* ✅ Linha 1: Último + Atual + Calcular */}
          <View style={styles.rowInputs}>
            <View style={styles.colInput}>
              <Text style={styles.inputLabel}>Último</Text>
              <TextInput
                style={styles.inputBox}
                value={
                  item.valor_ultimo !== undefined && item.valor_ultimo !== null
                    ? String(item.valor_ultimo)
                    : 'N/A'
                }
                editable={false}
              />
            </View>

            <View style={styles.colInput}>
              <Text style={styles.inputLabel}>Atual</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="Ex: 1.5"
                keyboardType="decimal-pad"
                editable={!isSomenteLeitura && !item.bloqueado}
                value={item.valor_atual?.toString() || ''}
                onChangeText={(text: string) => {
                  if (isSomenteLeitura || item.bloqueado) return;

                  const formattedText = text
                    .replace(',', '.')
                    .replace(/[^0-9.]/g, '')
                    .replace(/(\..*?)\..*/g, '$1');

                  setParametrosQuimicos((prev) =>
                    prev.map((p) =>
                      p.parametro === item.parametro ? { ...p, valor_atual: formattedText } : p
                    )
                  );
                }}
                placeholderTextColor="#888"
              />
            </View>
            

            {/* Botão Calcular (mantém regras todas) */}
            {!cloroTotalSoLeitura && (
              <TouchableOpacity
                style={[
                  styles.buttonCalcular,
                  (isSomenteLeitura || item.bloqueado) && styles.buttonDisabled,
                  ]}
                onPress={() => calcularUmParametro(item)}
                disabled={isSomenteLeitura || item.bloqueado || !item.valor_atual}
                >
                <Text style={styles.buttonText}>Calcular</Text>
              </TouchableOpacity>
              )}
            </View>

          {/* ✅ Cloro Combinado (dentro do Cloro Total) */}
          {mostrarCloroCombinadoInline && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.inputLabel, { marginBottom: 4 }]}>
                Cloro Combinado (ppm)
              </Text>

              <TextInput
                style={[styles.inputBox, { backgroundColor: '#f2f2f2' }]}
                value={Number.isFinite(cc) ? cc.toFixed(1) : ''}
                editable={false}
                placeholder="—"
                placeholderTextColor="#888"
              />

              {mostrarAlertaCC && (
                <Text style={{ marginTop: 6, fontSize: 12, color: '#B00020' }}>
                  ⚠️ Acima de {limiteCloroCombinado.toFixed(1)} ppm: A sua água contém resíduos de cloro
                  que causam odores e irritação. Ação necessária: Realize um tratamento choque utilizando
                  Cloro Rápido!
                </Text>
              )}
            </View>
          )}

          {/* ✅ Aviso do CYA quando alcalinidade baixa */}
          {mostrarAvisoCYA && (
            <Text style={{ marginTop: 6, fontSize: 12, color: '#B00020' }}>
              ⚠️ Alcalinidade baixa: a leitura do ácido cianúrico pode ficar menos fiável. Recomenda-se
              corrigir a alcalinidade antes de usar este valor como referência.
            </Text>
          )}

          {/* ✅ Mensagem do Resultado (mantida) */}
          {item.resultado && (
            <Text
              style={[
                styles.resultado,
                item.status === 'aplicado'
                  ? styles.resultadoVerde
                  : item.status === 'sem estoque'
                  ? styles.resultadoAmarelo
                  : item.resultado.resultado.includes('Dentro do intervalo ideal')
                  ? styles.resultadoIdeal
                  : styles.resultadoAdicionar,
              ]}
            >
              {item.status === 'aplicado'
                ? `Foi adicionado ${item.resultado.quantidade}kg de ${item.resultado.produto}`
                : item.status === 'sem estoque'
                ? `Na próxima semana adicionar ${item.resultado.quantidade}kg de ${item.resultado.produto}`
                : item.resultado.resultado}
            </Text>
          )}

          {/* ✅ Botão Enviar Notificação (mantido) */}
          {item.resultado?.resultado === 'Não é possível diminuir este parâmetro.' &&
            !item.notificacaoEnviada && (
              <TouchableOpacity
                style={styles.notifyButton}
                onPress={() => {
                  console.log(
                    "🔄 Botão 'Enviar Notificação' pressionado para o parâmetro:",
                    item.parametro
                  );

                  Alert.alert(
                    'Confirmação',
                    'Tem certeza de que deseja enviar esta notificação à administração?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Enviar',
                        onPress: async () => {
                          try {
                            const storedEmpresaid = await AsyncStorage.getItem('empresaid');
                            if (!storedEmpresaid) {
                              Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
                              return;
                            }

                            const parsedEmpresaid = parseInt(storedEmpresaid, 10);
                            if (isNaN(parsedEmpresaid)) {
                              Alert.alert('Erro', 'Empresaid inválido. Faça login novamente.');
                              return;
                            }

                            console.log('🔄 Enviando notificação para o backend...');

                            await axios.post(`${Config.API_URL}/notificacoes`, {
                              clienteId,
                              parametro: item.parametro,
                              assunto: `Alerta parâmetro não ajustável: ${item.parametro}`,
                              mensagem: 'Não é possível diminuir este parâmetro. Ação necessária.',
                              empresaid: parsedEmpresaid,
                            });

                            console.log('✅ Notificação enviada com sucesso!');

                            console.log("🔄 Atualizando status para 'nao ajustavel' no backend...");
                            await registrarStatusParametro(item, 'nao ajustavel');

                            Alert.alert('Sucesso', 'Notificação enviada à administração.');

                            setParametrosQuimicos((prev) =>
                              prev.map((param) =>
                                param.parametro === item.parametro
                                  ? {
                                      ...param,
                                      notificacaoEnviada: true,
                                      bloqueado: true,
                                      resultado: {
                                        ...param.resultado,
                                        resultado:
                                          'Foi solicitada assistência à administração com sucesso',
                                      },
                                    }
                                  : param
                              )
                            );
                          } catch (error) {
                            console.error('❌ Erro ao enviar notificação:', error);
                            Alert.alert('Erro', 'Não foi possível enviar a notificação.');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.notifyButtonText}>Enviar Notificação à Administração</Text>
              </TouchableOpacity>
            )}

          {/* ✅ Botões de Ação (mantidos) */}
          {!isSomenteLeitura &&
            item.resultado?.resultado !== 'Dentro do intervalo ideal' &&
            item.resultado?.produto &&
            !item.bloqueado && (
              <View style={styles.actionButtons}>
                {/* Produto Aplicado */}
                <TouchableOpacity
                  style={styles.buttonAplicado}
                  onPress={() => {
                    Alert.alert(
                      'Confirmação',
                      `Confirma aplicação de ${item.resultado?.produto}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Confirmar',
                          onPress: () => {
                            registrarStatusParametro(item, 'aplicado');

                            const updated = (parametrosQuimicos ?? []).map((p) =>
                              p.parametro === item.parametro ? { ...p, bloqueado: true } : p
                            );

                            setParametrosQuimicos(updated);
                            mostrarProximoPasso(updated);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.buttonText}>Produto Aplicado</Text>
                </TouchableOpacity>

                {/* Sem Stock */}
                <TouchableOpacity
                  style={styles.buttonSemEstoque}
                  onPress={() => {
                    Alert.alert(
                      'Confirmação',
                      `Confirma que está sem stock de ${item.resultado?.produto}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Confirmar',
                          onPress: () => {
                            registrarStatusParametro(item, 'sem estoque');

                            const updated = (parametrosQuimicos ?? []).map((p) =>
                              p.parametro === item.parametro ? { ...p, bloqueado: true } : p
                            );

                            setParametrosQuimicos(updated);
                            mostrarProximoPasso(updated);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.buttonText}>Sem Stock</Text>
                </TouchableOpacity>
              </View>
            )}

          {/* ✅ Botão Validar Dentro do Intervalo Ideal */}
{!isSomenteLeitura &&
  item.resultado?.resultado === 'Dentro do intervalo ideal' &&
  !item.bloqueado && (
    <TouchableOpacity
      style={styles.buttonValidar}
      onPress={async () => {
        await registrarStatusParametro(item, 'nao necessario');
        Alert.alert('Sucesso', 'Parâmetro validado com sucesso.');
      }}
    >
      <Text style={styles.buttonText}>Validar</Text>
    </TouchableOpacity>
)}


          {/* ✅ Botão Validar (exceção cloro “não adicionar”) */}
          {!isSomenteLeitura &&
            !item.bloqueado &&
            item.parametro === 'Cloro Livre em ppm' &&
            typeof item.resultado?.resultado === 'string' &&
            item.resultado.resultado.includes('Não adicionar cloro') && (
              <TouchableOpacity
                style={styles.buttonValidar}
                onPress={() => {
                  Alert.alert(
                    'Confirmação',
                    'Cloro acima do ideal (zona tampão). Confirma que NÃO foi adicionado cloro?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Confirmar',
                        onPress: () => registrarStatusParametro(item, 'nao necessario'),
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.buttonText}>Validar</Text>
              </TouchableOpacity>
            )}
        </View>
      )}
     </View>
      );
    })}
  </>
) : null}
</View>

{/* Reportar Anomalias */}
<View style={styles.section}>
  <TouchableOpacity onPress={() => setIsReportExpanded(!isReportExpanded)}>
    <Text style={styles.sectionTitle}>Reportar Anomalias</Text>
  </TouchableOpacity>

  {isReportExpanded && (
    <View style={styles.expandedContent}>
      {/* Campo de Descrição da Anomalia */}
      <Text style={styles.label}>Descrição da Anomalia:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Descreva a anomalia encontrada..."
        placeholderTextColor="#888"
        value={anomaliaDescricao}
        onChangeText={setAnomaliaDescricao}
        multiline
      />

      {/* Botão para Anexar Foto */}
      <TouchableOpacity style={styles.attachButton} onPress={handleAnexarFoto}>
        <Text style={styles.attachButtonText}>📷 Anexar Foto</Text>
      </TouchableOpacity>

      {/* Exibir número de imagens anexadas */}
      {imagensAnexadas.length > 0 && (
        <Text style={styles.anexosInfo}>
          {imagensAnexadas.length} {imagensAnexadas.length === 1 ? 'imagem anexada' : 'imagens anexadas'}
        </Text>
      )}

      {/* Exibir miniaturas das imagens anexadas */}
      <View style={styles.anexosContainer}>
        {imagensAnexadas.map((uri, index) => (
          <Image key={index} source={{ uri }} style={styles.anexoImagem} />
        ))}
      </View>

      {/* Botão Enviar Relatório */}
      <TouchableOpacity style={styles.submitButton} onPress={handleEnviarRelatorio}>
        <Text style={styles.submitButtonText}>Enviar Relatório</Text>
      </TouchableOpacity>
    </View>
  )}
</View>


          {/* Itens com Manutenção Periódica */}
          <View style={styles.section}>
            <TouchableOpacity onPress={() => setIsItensExpanded(!isItensExpanded)}>
              <Text style={styles.sectionTitle}>Itens com manutenção periódica</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    }
    renderItem={({ item }) => (
      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>{item.nome}</Text>
        {/* 🔹 Container para organizar os rótulos e os campos de datas */}
        <View style={styles.dadosManutencaoContainer}>
          {/* 🔹 Rótulos "Última Manutenção" e "Próxima Manutenção" */}
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Última Manutenção</Text>
            <Text style={styles.label}>Próxima Manutenção</Text>
          </View>
          {/* 🔹 Campos de data */}
          <View style={styles.inputLinha}>
            <TextInput
              style={[styles.input, styles.inputPequeno, { backgroundColor: item.cor }]}
              value={item.ultimaManutencao}
              editable={false}
            />
            <TextInput
              style={[
                styles.input,
                styles.inputPequeno,
                isManutencaoAtrasada(item.proximaManutencao) ? styles.inputAtrasado : styles.inputNormal,
              ]}
              value={item.proximaManutencao}
              editable={false}
            />
          </View>
        </View>
        {/* 🔹 Botão de confirmação */}
        <TouchableOpacity
          style={styles.botaoConfirmar}
          onPress={() => confirmarManutencaoPeriodica(item)}
        >
          <Text style={styles.botaoConfirmarTexto}>✔ Confirmar</Text>
        </TouchableOpacity>
      </View>
    )}
     ListFooterComponent={
      <View style={styles.actions}>
        {/* Botão Concluir Manutenção */}
        <TouchableOpacity
  style={[
    styles.buttonConcluir,
    manutencaoAtual?.status === 'concluida' && styles.opacityHalf, // Aplicação condicional do estilo
  ]}
  disabled={manutencaoAtual?.status === 'concluida'}
  onPress={() => {
    Alert.alert(
      'Concluir Manutenção',
      'Tem certeza de que deseja concluir esta manutenção?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Concluir', onPress: concluirManutencao },
      ]
    );
  }}
>
  <Text style={styles.buttonText}>Concluir Manutenção</Text>
</TouchableOpacity>


        {/* 🔹 Botão "Manutenção Não Concluída" */}
<TouchableOpacity
  style={[
    styles.buttonNaoConcluida,
    manutencaoAtual?.status === 'nao_concluida' && styles.opacityHalf,
  ]}
  disabled={manutencaoAtual?.status === 'nao_concluida'}
  onPress={() => {
    Alert.alert(
      'Marcar como Não Concluída',
      'Tem certeza de que esta manutenção não foi concluída?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => marcarNaoConcluidaComMotivo() },
      ]
    );
  }}
>
  <Text style={styles.buttonText}>Manutenção Não Concluída</Text>
</TouchableOpacity>
</View>

    }
  />
);


};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: isDarkMode ? '#D3D3D3' : '#D3D3D3',
  },
  actions: {
    marginTop: 20,
  },
  buttonConcluir: {
    backgroundColor: '#adcfae', // Verde claro
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25, // Cantos arredondados
    marginBottom: 10, // Espaçamento abaixo
    width: '80%', // Botão maior
    alignItems: 'center', // Centraliza o texto dentro do botão
    alignSelf: 'center', // Centraliza o botão no ecrã
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  buttonNaoConcluida: {
    backgroundColor: '#FFB3B3', // Vermelho tomate para indicar erro
    padding: 15,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 70,
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
     // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },

  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Botões lado a lado
  },
  linkText: {
    color: '#1E90FF', // Cor azul para link
    textDecorationLine: 'underline', // Sublinhado para parecer um link
    fontSize: 16, // Tamanho do texto
    marginTop: 8, // Margem superior para separação
  },
  buttonDisabled: {
    backgroundColor: '#d3d3d3', // Cor cinza para indicar que está desativado
    opacity: 0.6, // Torna o botão visualmente menos proeminente
  },
  resultado: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  resultadoIdeal: {
    color: 'green',
  },
  resultadoAdicionar: {
    color: 'red',
  },
  buttonAplicado: {
    backgroundColor: '#adcfae',
    flex: 1,
    height: 45,             // 🔹 altura fixa igual nos dois
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center', // 🔹 garante texto centralizado verticalmente
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
  buttonSemEstoque: {
    backgroundColor: '#FFB3B3',
    flex: 1,
    height: 45,             // 🔹 mesma altura
    borderRadius: 5,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
  buttonValidar: {
    backgroundColor: '#adcfae', // Verde claro
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
  actionButtons: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   width: '100%',
   alignSelf: 'center',
   marginVertical: 10,
  },
  button: {
    backgroundColor: '#ADD8E6', // Azul claro
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25, // Cantos redondos
    marginBottom: 15, // Espaçamento entre os botões
    width: '48%', // Largura proporcional para dividir espaço
    alignItems: 'center', // Centraliza o texto dentro do botão
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000', // Texto preto
  },
  notifyButton: {
    backgroundColor: '#FFA500',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  notifyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successMessage: {
    fontSize: 14,
    marginTop: 8,
  },
  scrollContainer: {
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    flexGrow: 1, // Garante que o conteúdo cresça verticalmente
    padding: 16, // Mesma margem interna que o container
  },
  emptyText: {
    textAlign: 'center',
    color: '#888', // Cinza claro para destacar que é um texto de estado vazio
    fontSize: 16,
    marginVertical: 10,
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#ECECEC', // cinza claro neutro
    borderRadius: 8,
    borderWidth: 0,
    borderColor: '#909090',
    padding: 12,
     // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 8,
  },
  details: {
    fontSize: 14,
    marginTop: 4,
  },
  parametroContainer: {
  padding: 12,
  backgroundColor: '#D3D3D3', // cinza claro neutro
  marginBottom: 8,
  borderRadius: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 3,
  elevation: 4,
},
  parametroTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
  },
  inputPequeno: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputGrande: {
    flex: 2,
    marginHorizontal: 4,
    textAlign: 'center',
  },
  inputAtrasado: {
    borderColor: 'red',
    color: 'red',
  },
  resultadoVerde: {
    color: 'green',
    fontWeight: 'bold',
  },
  resultadoAmarelo: {
    color: 'orange',
    fontWeight: 'bold',
  },
   itemContainer: {
    padding: 12,
    backgroundColor: '#D3D3D3',
    marginBottom: 8,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  attachButton: {
    backgroundColor: '#22b4b4ff',
    padding: 10,
    borderRadius: 5,
    width: '50%',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  attachButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#adcfae',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 15,
    width: '50%',
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  submitButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  unitText: {
    marginLeft: 5, // 🔥 Espaço entre o campo e o "€"
    alignSelf: 'center', // 🔥 Mantém o € centralizado na altura do input
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: '#555',
    borderRadius: 5,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingHorizontal: 5,
    width: '63%', // Mantém alinhado
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center', // 🔥 Alinha os elementos na mesma linha
    justifyContent: 'flex-start', // 🔥 Mantém tudo alinhado à esquerda
    marginBottom: 10,
    gap: 10, // 🔥 Dá um pequeno espaço entre o texto e o input
  },
  valorInput: {
    width: 50, // 🔥 Define um tamanho fixo para o campo de input
    textAlign: 'right', // 🔥 Mantém o número alinhado à direita dentro do campo
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center', // 🔥 Mantém o input e o símbolo € alinhados
    borderWidth: 1.2,
    borderColor: '#555',
    borderRadius: 5,
    paddingHorizontal: 10, // 🔥 Espaço interno para evitar que o texto fique colado à borda
    paddingVertical: 5,
  },
  anexosInfo: {
    marginTop: 0,
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#000',
    fontWeight: 'bold',
    marginBottom: 0,
  },
  anexosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -25,
  },
  anexoImagem: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 5,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  inputNormal: { backgroundColor: '#FFF' }, // Branco normal
  botaoConfirmar: {
    backgroundColor: '#adcfae',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginTop: 5,
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  botaoConfirmarTexto: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  dadosManutencaoContainer: {
    flexDirection: 'column', // 🔹 Garante que rótulos e inputs fiquem alinhados corretamente
  },
  inputLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  opacityHalf: {
    opacity: 0.5, // Reduz opacidade quando manutenção estiver concluída
  },

// ✅ Coluna para cada input (Último / Atual)
colInput: {
  flex: 1,
},

// ✅ Label pequeno por cima do input
inputLabel: {
  marginBottom: 4,
  color: '#555',
  fontSize: 12,
},

// ✅ Caixa do input (altura consistente e legível)
inputBox: {
  height: 44,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingHorizontal: 10,
  backgroundColor: '#fff',
  color: '#000',
},

// ✅ Botão calcular (mantém tamanho fixo para não “dançar”)
buttonCalcular: {
  height: 44,
  minWidth: 92,
  paddingHorizontal: 14,
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'flex-end',
  backgroundColor: '#adcfae', // usa a tua se já tinhas
  shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
},
// ✅ Linha 2 (o bloco do slider)
colorTool: {
  marginTop: 10,
},colorToolLabel: {
  fontWeight: '600',
  marginBottom: 6,
},
// ✅ 7 cores + valor/hint na mesma linha, sem sair do ecrã
colorSwatchRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'nowrap',
},
colorSwatch: {
  width: 22,
  height: 22,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#999',
},
// slider ocupa a largura toda e não invade o layout
colorSlider: {
  
  width: '100%',
  marginTop: 6,
},
colorMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 6,
},
parametroLinha: {
  flexDirection: 'column',   // ✅ ISTO é o que faltava
  width: '100%',
},
rowColorTool: {
  width: '100%',
  alignSelf: 'stretch',
  marginTop: 6,
  marginBottom: 8,           // ✅ separa do rowInputs
},
rowInputs: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  width: '100%',
  gap: 10,                   // se o teu RN não suportar gap, digo já alternativa
},
colorRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  width: '100%',
  marginTop: 6,
},
previewSwatch: {
  width: 30,
  height: 30,
  borderRadius: 6,
  // ✅ sem moldura (como pediste)
},
middleHint: {
  flex: 1,                 // ✅ empurra as âncoras para a direita
  paddingLeft: 12,         // ✅ cria o gap entre preview e o resto
  paddingRight: 12,        // ✅ dá “ar” antes das âncoras
  flexDirection: 'row',
  alignItems: 'baseline',
  flexWrap: 'wrap',
},
valueText: {
  fontSize: 16,
  fontWeight: '700',
  marginRight: 8,
},
hintText: {
  fontSize: 12,
  opacity: 0.7,
},
anchorsRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between', // ✅ distribui 0..10
  width: 220,                      // ✅ afina para “bater” com o Calcular
},
anchorWrap: {
  alignItems: 'center',
},
anchorSwatch: {
  width: 30,
  height: 30,
  borderRadius: 5,
  // ✅ sem moldura (como pediste)
},
anchorLabel: {
  fontSize: 12,
  marginTop: 3,
  opacity: 0.8,
},
radioBlock: { marginTop: 6 },
radioTitle: { fontWeight: '700', marginBottom: 6, color: '#222' },
radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
radioDot: {
  width: 16, height: 16, borderRadius: 8,
  borderWidth: 2, borderColor: '#adcfae', marginRight: 10,
},
radioDotOn: { backgroundColor: '#adcfae' },
radioText: { color: '#222' },
radioHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 0,
  marginBottom: 0, // ↓ baixa isto (ex: 2)
},

chevron: {
  fontSize: 14,
  opacity: 0.6,
  marginLeft: 10,
},
testeRapidoBtnText: {
  color: '#000',
  fontWeight: '700',
},
acaoBtnSpacer: { width: 10 },
acoesRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 12, // se o teu RN não suportar, digo alternativa abaixo
  marginTop: 10,
},

acaoBtnBase: {
  //flex: .5,
  width: 125,
  height: 42,          // 👈 ligeiramente maior (fica mais premium)
  borderRadius: 12,    // 👈 acompanha o novo tamanho
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 15,

  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },

  paddingVertical: 0,
  paddingHorizontal: 0,
},
acaoBtnText: {
  width: '100%',
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
},
acaoBtnDisabled: {
  opacity: 0.45,
},
botaoProcedimento: {
  //flex: .5,
  width: 65,
  height: 42,          // 👈 ligeiramente maior (fica mais premium)
  borderRadius: 12,    // 👈 acompanha o novo tamanho
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 15,

  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },

  paddingVertical: 0,
  paddingHorizontal: 0,
},
botaoProcedimentoTxt: {
  width: '100%',
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
},
// ✅ aqui só COR (mantém as tuas cores atuais)
testeRapidoBtn: {
  backgroundColor: '#20B8B3', // exemplo: mete a tua
  shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 10,
},
calcularTodosBtn: {
  backgroundColor: '#BFD9BF', // exemplo: mete a tua
  shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 10,
},
cornerClip: {
  position: 'absolute',
  top: 0,
  left: 0,
  width: 22,
  height: 22,
  overflow: 'hidden',
  borderTopLeftRadius: 12, // igual ao borderRadius do card
},
parametroDiamond: {
  position: 'absolute',
  top: -10,
  left: -10,
  width: 22,
  height: 22,
  borderRadius: 5, // arredonda o “bico”
  transform: [{ rotate: '45deg' }],
},
updateDate: {
  marginLeft: 10,
  fontSize: 12,
  color: '#777',
},
labelRow: {
  flexDirection: 'row',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  marginTop: 8,
},
taylorWrapper: {
  alignItems: 'center',     // 👈 centra horizontalmente
  marginTop: 12,
  marginBottom: 16,
},
taylorTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: '#444',
  marginBottom: 8,
},

islBtnHalf: {
  flex: 1,
},

islBtnLeft: {
  marginRight: 10,
},
islButtonsRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 20,
  marginTop: 10,
},

islBtnCompact: {
  paddingHorizontal: 14,
  minWidth: 140,
},
centerRow: {
  alignItems: 'center',
  marginTop: 10,
},

btnSameHeight: {
  paddingVertical: 12, // garante altura consistente
},

btnMedium: {
  minWidth: 160,       // “calcular isl” fica com presença
  paddingHorizontal: 18,
},
btnCenter: {
  alignSelf: 'center',
},
inputAuto: {
  backgroundColor: '#F2F2F2',
  color: '#666',
},
badgeAuto: {
  fontSize: 11,
  color: '#0B6E4F',
  fontWeight: '600',
},

badgeManual: {
  fontSize: 11,
  color: '#8A5A00',
  fontWeight: '600',
},
});

export default FolhaManutencaoScreen;
