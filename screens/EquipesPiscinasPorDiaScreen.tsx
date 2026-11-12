import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity, Appearance } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import { initOffline } from '../services/offline/db';
import { getClientesPorDiaCache, setClientesPorDiaCache, setManutencaoAtualCache } from '../services/offline/cache';

type Props = {
  navigation: any;
  route: any;
};

type MensagemProduto = {
  registo_id?: number;
  parametro: string;
  produto: string;
  quantidade: string;
};

type Cliente = {
  id: number;
  nome: string;
  morada: string;
  telefone: string;
  info_acesso: string;
  google_maps: string;
  volume: number;
  tanque_compensacao: boolean;
  cobertura: boolean;
  bomba_calor: boolean;
  equipamentos_especiais: boolean;
  eletrolise_sal: boolean;
  ultima_substituicao: string;
  status?: string;
  motivo?: string | null;
  status_semana?: string | null;
  frequencia?: 'semanal' | 'quinzenal';
  agenda_estado?: 'normal' | 'programada' | 'sem_visita' | 'concluida' | 'antecipada_em_curso';
  visita_programada?: boolean;
  proxima_visita?: string | null;
  mensagens_produtos?: {
    pendentes: MensagemProduto[];
    aplicados: MensagemProduto[];
  };
};

const isDarkMode = Appearance.getColorScheme() === 'dark';

const motivoIcon = (motivo?: string | null) => {
  switch (motivo) {
    case 'torneira_aberta':
      return '🚰';
    case 'motor_manual':
      return '⏱️';
    case 'cliente_ausente':
      return '🚪';
    default:
      return '❗';
  }
};

const EquipesPiscinasPorDiaScreen: React.FC<Props> = ({ route, navigation }) => {
  const { equipeId, equipeNome, diaSemana, empresaid } = route.params; // Recebe o empresaid
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [agendaEmCache, setAgendaEmCache] = useState(false);
  const [confirmacaoEmCurso, setConfirmacaoEmCurso] = useState<number | null>(null);



 // Função para buscar clientes associados (offline cache-first)
const fetchClientes = useCallback(async () => {
  setLoading(true);
  console.log('[fetchClientes] params:', { equipeId, diaSemana, empresaid });

  try {
    await initOffline();

    // 1) Cache primeiro
    const cached = await getClientesPorDiaCache<any[]>(empresaid, equipeId, diaSemana);
    if (cached?.data && Array.isArray(cached.data)) {
      console.log('[fetchClientes] carregou do cache. ts=', cached.ts);
      setClientes(cached.data);
      setAgendaEmCache(true);
    }

    // 2) Tenta online
    const response = await axios.get(`${Config.API_URL}/clientes-por-dia`, {
      params: { equipeId, diaSemana, empresaid },
    });

    console.log('📊 Dados recebidos de clientes-por-dia:', response.data);
    setClientes(response.data);
    setAgendaEmCache(false);

    // 3) Guardar cache
    await setClientesPorDiaCache(empresaid, equipeId, diaSemana, response.data);
  } catch (error) {
    console.error('❌ Erro ao buscar clientes:', error);

    // 4) fallback final
    const cached = await getClientesPorDiaCache<any[]>(empresaid, equipeId, diaSemana);
    if (cached?.data && Array.isArray(cached.data)) {
      setClientes(cached.data);
      setAgendaEmCache(true);
      return;
    }

    setAgendaEmCache(true);
    Alert.alert('Erro', 'Não foi possível carregar os clientes associados.');
  } finally {
    setLoading(false);
  }
}, [equipeId, diaSemana, empresaid]); // ✅ mantém dependências

  // ✅ Atualiza `useEffect()` para incluir `fetchClientes`
  useEffect(() => {
    fetchClientes();
    const unsubscribe = navigation.addListener('focus', fetchClientes);
    return unsubscribe;
  }, [navigation, fetchClientes]); // ✅ Agora o ESLint não reclama

  // A confirmação é independente da folha de manutenção e exige rede.
  // Não alteramos o estado original da manutenção concluída.
  const registarConfirmacaoProduto = async (
    item: Cliente,
    mensagem: MensagemProduto,
    estado: 'aplicado' | 'sem estoque'
  ) => {
    const registoId = mensagem.registo_id;
    if (!registoId || confirmacaoEmCurso !== null) return;

    setConfirmacaoEmCurso(registoId);
    try {
      await axios.post(`${Config.API_URL}/pendencias-produtos/confirmar`, {
        empresaid,
        registo_id: registoId,
        estado,
      });

      if (estado === 'aplicado') {
        // O aviso desaparece imediatamente. Atualizar também o cache para
        // não ressurgir quando a lista é carregada antes da resposta online.
        const atualizados = clientes.map((cliente) =>
          cliente.id === item.id
            ? {
                ...cliente,
                mensagens_produtos: {
                  pendentes: (cliente.mensagens_produtos?.pendentes || []).filter(
                    (p) => p.registo_id !== registoId
                  ),
                  aplicados: cliente.mensagens_produtos?.aplicados || [],
                },
              }
            : cliente
        );
        setClientes(atualizados);
        try {
          await setClientesPorDiaCache(empresaid, equipeId, diaSemana, atualizados);
        } catch (erroCache) {
          console.warn('Não foi possível atualizar o cache dos avisos:', erroCache);
        }
      } else {
        Alert.alert('Sem stock', 'A pendência continua visível para a próxima visita.');
      }

      // Atualiza a lista com o estado oficial da base de dados.
      await fetchClientes();
    } catch (erro) {
      const mensagemErro = axios.isAxiosError(erro)
        ? erro.response?.data?.error || 'Não foi possível confirmar a pendência.'
        : 'Não foi possível confirmar a pendência.';
      Alert.alert('Erro', mensagemErro);
    } finally {
      setConfirmacaoEmCurso(null);
    }
  };

  const abrirConfirmacaoProduto = (item: Cliente, mensagem: MensagemProduto) => {
    if (agendaEmCache || !mensagem.registo_id) {
      Alert.alert(
        'Sincronização necessária',
        'É necessário estar online e atualizar a agenda para confirmar este produto.'
      );
      return;
    }
    if (confirmacaoEmCurso !== null) return;

    Alert.alert(
      'Confirmar produto pendente',
      `${mensagem.produto} — ${mensagem.quantidade}\n\nConfirma a situação do produto?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sem stock',
          onPress: () => registarConfirmacaoProduto(item, mensagem, 'sem estoque'),
        },
        {
          text: 'Produto aplicado',
          onPress: () => registarConfirmacaoProduto(item, mensagem, 'aplicado'),
        },
      ]
    );
  };

  const navegarFolha = (item: Cliente) => {
    navigation.navigate('FolhaManutencao', {
      empresaid,
      clienteId: item.id,
      nome: item.nome,
      morada: item.morada,
      telefone: item.telefone,
      info_acesso: item.info_acesso,
      google_maps: item.google_maps,
      volume: item.volume,
      tanque_compensacao: item.tanque_compensacao,
      cobertura: item.cobertura,
      bomba_calor: item.bomba_calor,
      equipamentos_especiais: item.equipamentos_especiais,
      eletrolise_sal: item.eletrolise_sal,
      ultima_substituicao: item.ultima_substituicao,
      status: item.status,
      equipeId,
      diaSemana,
      equipeNome,
    });
  };

  const abrirPiscina = (item: Cliente) => {
    const semVisita = item.frequencia === 'quinzenal' && item.agenda_estado === 'sem_visita';
    const semRegistoEstaSemana = item.frequencia === 'quinzenal'
      && item.agenda_estado === 'programada' && !item.status_semana;
    // Consultar uma manutenção já aberta continua possível offline.
    // Só abrir uma visita NOVA exige sincronização com a API.
    if (agendaEmCache && (semVisita || semRegistoEstaSemana)) {
      Alert.alert(
        'Agenda por sincronizar',
        'É necessário confirmar a agenda online antes de abrir uma nova manutenção quinzenal.'
      );
      return;
    }

    if (!semVisita && !semRegistoEstaSemana) {
      navegarFolha(item);
      return;
    }

    Alert.alert(
      semVisita ? 'Antecipar manutenção quinzenal' : 'Iniciar manutenção quinzenal',
      semVisita
        ? `Esta piscina está sem visita prevista nesta semana. Queres antecipar a manutenção? O dia habitual (${diaSemana}) mantém-se e a próxima visita será recalculada depois da conclusão.`
        : 'Ainda não existe uma manutenção aberta nesta semana. Queres iniciar uma nova?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: semVisita ? 'Antecipar' : 'Iniciar',
          onPress: async () => {
            try {
              await axios.post(`${Config.API_URL}/manutencoes/iniciar-visita`, {
                clienteId: item.id,
                equipeId,
                diaSemana,
                empresaid,
              });
              // Impede que a folha leia do cache uma manutenção antiga concluída.
              await setManutencaoAtualCache(empresaid, item.id, diaSemana, null);
              navegarFolha({ ...item, status: 'pendente', status_semana: 'pendente' });
            } catch (error) {
              const mensagem = axios.isAxiosError(error)
                ? error.response?.data?.error || 'Não foi possível iniciar a manutenção.'
                : 'Não foi possível iniciar a manutenção.';
              Alert.alert('Erro', mensagem);
            }
          },
        },
      ],
    );
  };

  const formatarData = (iso?: string | null) =>
    iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
      : '';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Clientes - {diaSemana} : {equipeNome}
      </Text>
      {agendaEmCache && (
        <Text style={styles.avisoCache}>
          Agenda em cache: as semanas quinzenais podem estar desatualizadas. Sincroniza antes de iniciar visitas.
        </Text>
      )}

      {clientes.length > 0 ? (
        <FlatList
          data={clientes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                item.frequencia === 'quinzenal' && styles.cardQuinzenal,
                item.agenda_estado === 'sem_visita' && styles.cardSemVisita,
                (item.status === 'concluida' || item.agenda_estado === 'concluida') && styles.cardConcluida,
                item.status === 'nao_concluida' && styles.cardNaoConcluida,
              ]}
              onPress={() => abrirPiscina(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.clientName}>{item.nome}</Text>
                {item.status === 'nao_concluida' && (
                <Text style={styles.motivoIcon}>{motivoIcon(item.motivo)}</Text>
                )}
              </View>
              <Text style={styles.clientDetails}>Morada: {item.morada}</Text>
              <Text style={styles.clientDetails}>Telefone: {item.telefone}</Text>
              {item.frequencia === 'quinzenal' && (
                <Text style={styles.quinzenalLabel}>
                  {item.agenda_estado === 'sem_visita'
                    ? `Quinzenal · Sem visita esta semana · Próxima: ${formatarData(item.proxima_visita)}`
                    : item.agenda_estado === 'concluida'
                      ? 'Quinzenal · Concluída esta semana'
                      : item.agenda_estado === 'antecipada_em_curso'
                        ? 'Quinzenal · Visita antecipada em curso'
                        : 'Quinzenal · Visita programada nesta semana'}
                </Text>
              )}
              {item.mensagens_produtos?.pendentes?.map((mensagem, index) => (
                <TouchableOpacity
                  key={`pendente-${mensagem.registo_id || mensagem.parametro}-${index}`}
                  style={styles.avisoProdutoPendente}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Confirmar pendência: ${mensagem.produto}`}
                  onPress={(evento) => {
                    evento.stopPropagation();
                    abrirConfirmacaoProduto(item, mensagem);
                  }}
                >
                  <Text style={styles.mensagemProdutoTexto}>
                    ⚠ Pendente para a próxima visita: aplicar {mensagem.quantidade} de {mensagem.produto}
                  </Text>
                </TouchableOpacity>
              ))}
              {item.mensagens_produtos?.aplicados?.map((mensagem, index) => (
                <View
                  key={`aplicado-${mensagem.parametro}-${index}`}
                  style={styles.avisoProdutoAplicado}
                >
                  <Text style={styles.mensagemProdutoTexto}>
                    ✓ Aplicado na última manutenção: {mensagem.quantidade} de {mensagem.produto}
                  </Text>
                </View>
              ))}
            </TouchableOpacity>
          )}
        />
      ) : loading ? (
        <Text style={styles.loadingText}>Carregando...</Text>
      ) : (
        <Text style={styles.emptyText}>Nenhum cliente associado.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: isDarkMode ? '#D3D3D3' : '#D3D3D3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
     // 🔹 Sombra igual à dos botões
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#909090',
    marginBottom: 10,
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 3.65,
    elevation: 10,
  },
  avisoProdutoPendente: {
    marginTop: 8,
    padding: 9,
    borderRadius: 8,
    backgroundColor: '#FFF5CC',
    borderWidth: 1,
    borderColor: '#D9B74C',
  },
  avisoProdutoAplicado: {
    marginTop: 8,
    padding: 9,
    borderRadius: 8,
    backgroundColor: '#CCFFCC',
    borderWidth: 1,
    borderColor: '#75B875',
  },
  mensagemProdutoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  avisoCache: {
    color: '#733D00',
    backgroundColor: '#FFF5CC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  cardQuinzenal: {
    borderColor: '#8D78BC',
  },
  cardSemVisita: {
    backgroundColor: '#E7E7E7',
    borderColor: '#A0A0A0',
  },
  quinzenalLabel: {
    fontSize: 13,
    color: '#383838',
    fontWeight: '600',
    marginTop: 8,
  },
  cardConcluida: {
    backgroundColor: '#DFF2BF',
    borderColor: '#4CAF50',
  },
  cardNaoConcluida: {
    backgroundColor: '#FFB3B3', // Vermelho claro para indicar erro
    borderColor: '#FF0000',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clientDetails: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#888',
    marginTop: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
    marginTop: 20,
  },
  cardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
motivoIcon: {
  fontSize: 22,
  marginLeft: 10,
},
});

export default EquipesPiscinasPorDiaScreen;
