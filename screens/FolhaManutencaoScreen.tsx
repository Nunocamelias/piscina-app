import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Linking, Alert, Appearance, Image, Platform } from 'react-native';
import Config from 'react-native-config';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import moment from 'moment';

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
};

type ItemManutencao = {
  id: number;
  nome: string;
  ultimaManutencao: string;
  proximaManutencao: string;
  cor?: string;
};

type Props = {
  navigation: any; // Ajuste o tipo para um tipo mais específico se necessário
  route: any; // Ajuste para refletir o formato exato dos parâmetros passados
};

const isDarkMode = Appearance.getColorScheme() === 'dark';

const FolhaManutencaoScreen: React.FC<Props> = () => {
  const navigation = useNavigation(); // Obtenha o navigation da navegação
  const route = useRoute();

  const {
    clienteId,
    diaSemana,
    volume,
    tanque_compensacao,
    cobertura,
    bomba_calor,
    equipamentos_especiais,
    ultima_substituicao,
  } = route.params as any;

  const [parametrosQuimicos, setParametrosQuimicos] = useState<Parametro[]>([]);
  const [isClienteExpanded, setIsClienteExpanded] = useState(false);
  const [isParametrosExpanded, setIsParametrosExpanded] = useState(false);
  const [isItensExpanded, setIsItensExpanded] = useState(false);
  const [manutencaoAtual, setManutencaoAtual] = useState<{ id: number | null; status?: string } | null>(null);
  const [empresaid, setEmpresaid] = useState<number | null>(null);
  const [userEmpresaid] = useState<number | null>(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [anomaliaDescricao, setAnomaliaDescricao] = useState('');
  const [valorServicoExtra, setValorServicoExtra] = useState('');
  const [imagensAnexadas, setImagensAnexadas] = useState<string[]>([]);
  const isSomenteLeitura = manutencaoAtual?.status === 'concluida';
  // 🔹 Função para buscar o empresaid
const fetchEmpresaid = useCallback(async () => {
  try {
    const storedEmpresaId = await AsyncStorage.getItem('empresaid');
    if (!storedEmpresaId) {
      Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
      return;
    }
    const parsedEmpresaId = parseInt(storedEmpresaId, 10);
    if (isNaN(parsedEmpresaId)) {
      Alert.alert('Erro', 'Empresaid inválido. Faça login novamente.');
      return;
    }
    setEmpresaid(parsedEmpresaId);
    console.log('[DEBUG] Empresaid carregado:', parsedEmpresaId);
  } catch (error) {
    console.error('[DEBUG] Erro ao carregar empresaid:', error);
    Alert.alert('Erro', 'Não foi possível carregar o empresaid.');
  }
}, []); // ✅ `useCallback` para evitar recriação desnecessária

// 🔹 `useEffect` para carregar `empresaid` primeiro
useEffect(() => {
  fetchEmpresaid();
}, [fetchEmpresaid]); // ✅ Agora está correto

// 🔹 Função para buscar os parâmetros químicos
const fetchParametros = useCallback(async () => {
  if (!userEmpresaid) {
    return;
  }
  try {
    console.log('[DEBUG] Buscando parâmetros com empresaid:', userEmpresaid);
    const response = await axios.get(`${Config.API_URL}/parametros-quimicos`, {
      params: { empresaid: userEmpresaid, ativo: true }, // Apenas parâmetros ativos
    });

    if (response.status === 200) {
      setParametrosQuimicos(response.data);
      console.log('[DEBUG] Parâmetros químicos carregados:', response.data);
    } else {
      console.error('[DEBUG] Erro ao buscar parâmetros químicos. Status:', response.status);
      Alert.alert('Erro', 'Não foi possível carregar os parâmetros químicos.');
    }
  } catch (error) {
    console.error('[DEBUG] Erro ao buscar parâmetros químicos:', error);
    Alert.alert('Erro', 'Não foi possível carregar os parâmetros.');
  }
}, [userEmpresaid]); // ✅ `useCallback` para evitar recriação desnecessária

// 🔹 `useEffect` para carregar os parâmetros **após** o `empresaid` ser carregado
useEffect(() => {
  if (userEmpresaid !== null) {
    fetchParametros(); // ✅ Agora espera `userEmpresaid` ser carregado
  }
}, [userEmpresaid, fetchParametros]); // ✅ Agora o ESLint não reclama

  //  FUNÇÃO DE CARREGAMENTO DA MANUTENÇÃO (Coloque antes do useFocusEffect)
  const fetchDadosManutencao = useCallback(async () => {
    if (!clienteId || !diaSemana || !empresaid) {
      console.warn('⚠️ Cliente ID, Dia da Semana ou Empresaid não definidos.');
      return;
    }
    try {
      console.log('📡 Buscando dados do cliente...');
      const clienteResponse = await fetch(`${Config.API_URL}/clientes/${clienteId}?empresaid=${empresaid}`);
      if (!clienteResponse.ok) {
        throw new Error('Erro ao buscar dados do cliente.');
      }
      const clienteData = await clienteResponse.json();
      setCliente(clienteData);
      console.log('✅ Dados do cliente carregados:', clienteData);
      console.log('📡 Buscando dados de manutenção...');
      const manutencaoResponse = await fetch(
        `${Config.API_URL}/manutencao-atual?clienteId=${clienteId}&diaSemana=${diaSemana}&empresaid=${empresaid}`
      );
      if (!manutencaoResponse.ok) {
      throw new Error('Erro ao buscar dados da manutenção.');
      }
      const manutencaoData = await manutencaoResponse.json();
      setManutencaoAtual(manutencaoData.manutencao || null);
      console.log('✅ Dados da manutenção carregados:', manutencaoData.manutencao);
      if (manutencaoData.manutencao?.id && Array.isArray(manutencaoData.parametros)) {
        const parametrosAtivos = manutencaoData.parametros.map((parametro: any) => ({
          ...parametro,
          bloqueado: ['aplicado', 'sem estoque', 'nao necessario', 'nao ajustavel'].includes(parametro.status),
          resultado:
            parametro.status === 'nao ajustavel'
              ? { resultado: 'Foi solicitada assistência à administração com sucesso', quantidade: 0, produto: null }
              : parametro.resultado || null, // ✅ Mantém a mensagem correta se for "nao ajustavel"
        }));
        setParametrosQuimicos(parametrosAtivos);
        console.log('✅ Parâmetros químicos ativos carregados:', parametrosAtivos);
      } else {
        console.warn('⚠️ Nenhum parâmetro químico encontrado para esta manutenção.');
        setParametrosQuimicos([]);
      }
    } catch (error) {
      console.error(
        '❌ Erro ao processar os parâmetros químicos:',
        error instanceof Error ? error.message : String(error)
      );
      Alert.alert(
        'Erro',
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os dados. Verifique a conexão e tente novamente.'
      );
    }
  }, [clienteId, diaSemana, empresaid]);// ✅ Memoiza a função e evita recriações desnecessárias

useFocusEffect(
  useCallback(() => {
    console.log('🔄 Recarregando os parâmetros químicos ao voltar para a tela...');

    if (!clienteId || !diaSemana || !empresaid) {
      console.warn('⚠️ Cliente ID, Dia da Semana ou Empresaid ainda não estão disponíveis. Aguardando...');
      return;
    }

    fetchDadosManutencao();
  }, [clienteId, diaSemana, empresaid, fetchDadosManutencao]) // ✅ Agora inclui `fetchDadosManutencao`
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

  const [cliente, setCliente] = useState<{
    nome: string;
    morada: string;
    telefone: string;
    google_maps: string;
    info_acesso: string;
  } | null>(null);

  type ResultadoCalculo = {
    resultado: string;
    quantidade: number;
    produto?: string;
    status?: 'aplicado' | 'sem estoque' | 'nao necessario' | 'nao ajustavel' | 'pendente';
  };


  const calcularProduto = (
  parametro: Parametro,
  volumePiscina: number
): ResultadoCalculo => { // ✅ Agora retorna um objeto corretamente tipado
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

  // Converte strings para números com validação
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
    // 🚨 Verifica se não é possível ajustar para baixo
    if (!produto_diminuir || !dosagem_diminuir || !incremento_diminuir) {
      return {
        resultado: 'Não é possível diminuir este parâmetro.',
        quantidade: 0,
        status: 'nao ajustavel', // ✅ Agora o status é retornado corretamente
      };
    }
  } else {
    // 🚨 Verifica se não é possível ajustar para cima
    if (!produto_aumentar || !dosagem_aumentar || !incremento_aumentar) {
      return {
        resultado: 'Não é possível aumentar este parâmetro.',
        quantidade: 0,
        status: 'nao ajustavel', // ✅ Garante que também há status neste caso
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
    status: 'pendente', // ✅ Por padrão, mantém pendente se for um cálculo normal
  };
};



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

    if (Platform.OS === 'android' && finalUri.startsWith('content://')) {
      const filePath = `${RNFS.CachesDirectoryPath}/anexo_${Date.now()}`;
      await RNFS.copyFile(finalUri, filePath);
      finalUri = `file://${filePath}`;
      console.log('✅ URI convertida:', finalUri);
    }

    setImagensAnexadas((prev) => [...prev, finalUri]);
    console.log('📸 Imagem adicionada com sucesso:', finalUri);

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

    let empresaidFinal = userEmpresaid;

    // 🔹 Se `userEmpresaid` for `null`, buscar do AsyncStorage
    if (!empresaidFinal) {
      try {
        const storedEmpresaid = await AsyncStorage.getItem('empresaid');
        if (storedEmpresaid) {
          empresaidFinal = parseInt(storedEmpresaid, 10);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar empresaid do AsyncStorage:', error);
      }
    }

    // Se ainda assim for `null`, não envia
    if (!empresaidFinal) {
      Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
      return;
    }

    const dadosEnvio = {
      cliente_id: clienteId,
      assunto: 'Relatório de Anomalia',
      mensagem: anomaliaDescricao,
      empresaid: empresaidFinal, // 🔹 Agora sempre tem um valor válido
      anexos: imagensAnexadas.length > 0 ? imagensAnexadas : [],
      valor_servico_extra: valorServicoExtra !== '' ? parseFloat(valorServicoExtra) : null,
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


  const concluirManutencao = async () => {
    if (!manutencaoAtual || !manutencaoAtual.id) {
      console.error('❌ Manutenção atual inválida ou não encontrada:', manutencaoAtual);
      Alert.alert('Erro', 'Manutenção atual não encontrada!');
      return;
    }
    // 🔹 Filtrar apenas os parâmetros ativos (que precisam de validação)
    const parametrosAtivos = parametrosQuimicos.filter(
      (parametro) => parametro.status !== 'nao ajustavel' // Parâmetros não ajustáveis não precisam de validação
    );
    console.log('📊 Parâmetros ativos:', parametrosAtivos);
    // 🔹 Verificar se todos os parâmetros ativos passaram por um dos botões de validação
    const parametrosValidados = parametrosAtivos.filter(
      (parametro) =>
        parametro.status === 'aplicado' ||
        parametro.status === 'sem estoque' ||
        parametro.status === 'nao necessario'
    );
    console.log('✅ Parâmetros validados:', parametrosValidados);
    if (parametrosValidados.length !== parametrosAtivos.length) {
      Alert.alert(
        'Erro',
        'Todos os parâmetros ativos devem ser validados antes de concluir a manutenção.'
      );
      return;
    }
    try {
      // 🔹 Atualizar manutenção no backend
      const response = await fetch(`${Config.API_URL}/manutencoes/${manutencaoAtual.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'concluida',
          parametros: parametrosValidados.map((parametro) => ({
            parametro: parametro.parametro,
            valor_atual: parametro.valor_atual,
            produto_usado: parametro.resultado?.produto || null,
            quantidade_usada: parametro.resultado?.quantidade || 0,
          })),
          empresaid, // Envia o ID da empresa para validação no backend
        }),
      });
      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Erro ao concluir manutenção.');
      }
      // ✅ Atualiza o estado da manutenção para "concluida"
      setManutencaoAtual((prev) => (prev ? { ...prev, status: 'concluida' } : prev));
      // ✅ Bloqueia todos os parâmetros após a conclusão
      setParametrosQuimicos((prev) =>
        prev.map((parametro) => ({
          ...parametro,
          bloqueado: true, // Agora não pode mais ser editado
        }))
      );
      Alert.alert('Sucesso', 'Manutenção concluída com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('❌ Erro ao concluir manutenção:', error);
      Alert.alert('Erro', 'Não foi possível concluir a manutenção.');
    }
  };

  const marcarNaoConcluida = async () => {
    if (!manutencaoAtual || !manutencaoAtual.id) {
      console.error('Manutenção atual inválida ou não encontrada:', manutencaoAtual);
      Alert.alert('Erro', 'Manutenção atual não encontrada!');
      return;
    }

    try {
      // Atualizar manutenção no backend para "não concluída"
      const response = await fetch(`${Config.API_URL}/manutencoes/${manutencaoAtual.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'nao_concluida', // Novo status para indicar que a manutenção não foi feita
          empresaid,
        }),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Erro ao registrar manutenção não concluída.');
      }

      // Atualiza o estado da manutenção para "não concluída"
      setManutencaoAtual((prev) => (prev ? { ...prev, status: 'nao_concluida' } : prev));

      Alert.alert('Aviso', 'Manutenção marcada como não concluída.');

      // Retorna para a tela anterior e sinaliza o cliente como "não concluído" (vermelho)
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao marcar manutenção como não concluída:', error);
      Alert.alert('Erro', 'Não foi possível registrar a manutenção como não concluída.');
    }
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
                {cliente ? cliente.nome : 'Carregando...'}
              </Text>
            </TouchableOpacity>
            {isClienteExpanded && cliente && (
              <View style={styles.expandedContent}>
                <Text style={styles.details}>Morada: {cliente.morada}</Text>
                {cliente.google_maps && (
                  <TouchableOpacity onPress={() => Linking.openURL(cliente.google_maps)}>
                    <Text style={styles.linkText}>{cliente.google_maps}</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.details}>Telefone: {cliente.telefone}</Text>
                <Text style={styles.details}>Informação de Acesso: {cliente.info_acesso}</Text>
              </View>
            )}
          </View>

         {/* Parâmetros Químicos */}
<View style={styles.section}>
  <TouchableOpacity onPress={() => setIsParametrosExpanded(!isParametrosExpanded)}>
    <Text style={styles.sectionTitle}>
      Parâmetros Químicos - Volume Considerado: {volume} m³
    </Text>
  </TouchableOpacity>

  {isParametrosExpanded && parametrosQuimicos.length > 0 ? (
    parametrosQuimicos.map((item, index) => (
      <View key={`${item.parametro}-${index}`} style={styles.parametroContainer}>
        {/* Nome do Parâmetro */}
        <Text style={styles.parametroTitulo}>{item.parametro}</Text>
        <View style={styles.parametroLinha}>
          {/* Último Valor */}
          <TextInput
            style={[styles.input, styles.inputPequeno]}
            placeholder="Último Valor"
            value={
              item.valor_ultimo !== undefined && item.valor_ultimo !== null
                ? item.valor_ultimo.toString()
                : 'N/A'
            }
            editable={false} // Apenas leitura
          />

          {/* Valor Atual */}
          <TextInput
  style={[styles.input, styles.inputPequeno]}
  placeholder="Valor Atual"
  keyboardType="decimal-pad"
  editable={!isSomenteLeitura && !item.bloqueado} // Editável apenas se desbloqueado
  value={item.valor_atual?.toString() || ''} // Exibe valor como string
  onChangeText={(text: string) => {
    if (!isSomenteLeitura && !item.bloqueado) {
      // Permite apenas números e um único ponto
      const formattedText = text
        .replace(/[^0-9.]/g, '') // Remove caracteres inválidos
        .replace(/(\..*?)\..*/g, '$1'); // Permite apenas um ponto decimal

      setParametrosQuimicos((prev) =>
        prev.map((parametro) =>
          parametro.parametro === item.parametro
            ? { ...parametro, valor_atual: formattedText } // Armazena como string
            : parametro
        )
      );
    }
  }}
  placeholderTextColor="#888"
/>

          {/* Botão Calcular */}
<TouchableOpacity
  style={[
    styles.buttonCalcular,
    (isSomenteLeitura || item.bloqueado) && styles.buttonDisabled, // Bloqueia se bloqueado
  ]}
  onPress={() => {
    if (!isSomenteLeitura && !item.bloqueado) {
      const resultado = calcularProduto(item, volume);
      setParametrosQuimicos((prev) =>
        prev.map((parametro) =>
          parametro.parametro === item.parametro
            ? { ...parametro, resultado }
            : parametro
        )
      );
    }
  }}
  disabled={isSomenteLeitura || item.bloqueado || !item.valor_atual} // Desabilita o botão
>
  <Text style={styles.buttonText}>Calcular</Text>
</TouchableOpacity>

        </View>

        {/* Mensagem do Resultado */}
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
{/* Botão Enviar Notificação */}
{item.resultado?.resultado === 'Não é possível diminuir este parâmetro.' && !item.notificacaoEnviada && (
  <TouchableOpacity
    style={styles.notifyButton}
    onPress={() => {
      console.log("🔄 Botão 'Enviar Notificação' pressionado para o parâmetro:", item.parametro);

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

                // Enviar a notificação para a administração
                await axios.post(`${Config.API_URL}/notificacoes`, {
                  clienteId,
                  parametro: item.parametro,
                  mensagem: 'Não é possível diminuir este parâmetro. Ação necessária.',
                  empresaid: parsedEmpresaid,
                });

                console.log('✅ Notificação enviada com sucesso!');

                // ✅ Agora atualizamos o status no backend para "nao ajustavel"
                console.log("🔄 Atualizando status para 'nao ajustavel' no backend...");
                await registrarStatusParametro(item, 'nao ajustavel');

                Alert.alert('Sucesso', 'Notificação enviada à administração.');

                // Atualiza o estado para bloquear o botão e impedir alterações
                setParametrosQuimicos((prev) =>
                  prev.map((param) =>
                    param.parametro === item.parametro
                      ? {
                          ...param,
                          notificacaoEnviada: true,
                          bloqueado: true, // Impede novas alterações
                          resultado: {
                            ...param.resultado,
                            resultado: 'Foi solicitada assistência à administração com sucesso',
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

{/* Botões de Ação */}
{!isSomenteLeitura &&
  item.resultado?.resultado !== 'Dentro do intervalo ideal' &&
  item.resultado?.produto &&
  !item.bloqueado && (
    <View style={styles.actionButtons}>
      {/* Botão Produto Aplicado */}
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
                  setParametrosQuimicos((prev) =>
                    prev.map((parametro) =>
                      parametro.parametro === item.parametro
                        ? { ...parametro, bloqueado: true }
                        : parametro
                    )
                  );
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.buttonText}>Produto Aplicado</Text>
      </TouchableOpacity>

      {/* Botão Produto sem Stock */}
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
                  setParametrosQuimicos((prev) =>
                    prev.map((parametro) =>
                      parametro.parametro === item.parametro
                        ? { ...parametro, bloqueado: true }
                        : parametro
                    )
                  );
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.buttonText}>Produto sem Stock</Text>
      </TouchableOpacity>
    </View>
  )}



        {/* Botão Validar Dentro do Intervalo Ideal */}
        {!isSomenteLeitura &&
          item.resultado?.resultado === 'Dentro do intervalo ideal' &&
          !item.bloqueado && (
            <TouchableOpacity
              style={styles.buttonValidar}
              onPress={() => {
                Alert.alert(
                  'Confirmação',
                  `Confirma que o valor está dentro do intervalo ideal para ${item.parametro}?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Confirmar',
                      onPress: () => {
                        registrarStatusParametro(item, 'nao necessario');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.buttonText}>Validar</Text>
            </TouchableOpacity>
          )}
      </View>
    ))
  ) : (
    <Text style={styles.emptyText}>Nenhum parâmetro químico encontrado.</Text>
  )}
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


        {/* 🔹 Novo Botão "Manutenção Não Concluída" */}
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
          { text: 'Confirmar', onPress: marcarNaoConcluida },
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
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
  },
  actions: {
    marginTop: 20,
  },
  buttonConcluir: {
    backgroundColor: '#ADD8E6', // Azul claro
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25, // Cantos arredondados
    borderWidth: 1.5,
    borderColor: '#909090',
    marginBottom: 10, // Espaçamento abaixo
    width: '80%', // Botão maior
    alignItems: 'center', // Centraliza o texto dentro do botão
    alignSelf: 'center', // Centraliza o botão no ecrã
  },
  buttonNaoConcluida: {
    backgroundColor: '#FF6347', // Vermelho tomate para indicar erro
    padding: 15,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#909090',
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
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
  buttonCalcular: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
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
  parametroLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonAplicado: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonSemEstoque: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonValidar: {
    backgroundColor: '#90EE90', // Verde claro
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#909090',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 8,
  },
  details: {
    fontSize: 16,
    marginTop: 4,
  },
  parametroContainer: {
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
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
    backgroundColor: '#fff',
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
    backgroundColor: '#ADD8E6',
    padding: 10,
    borderRadius: 5,
    width: '50%',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  attachButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#32CD32',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFF',
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
    backgroundColor: '#4CAF50',
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
});

export default FolhaManutencaoScreen;