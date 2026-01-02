import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity, Appearance } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';

type Props = {
  navigation: any;
  route: any;
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
  ultima_substituicao: string;
  status?: string;
  motivo?: string | null;
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



  // Função para buscar clientes associados
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${Config.API_URL}/clientes-por-dia`, {
        params: { equipeId, diaSemana, empresaid },
      });
      console.log('📊 Dados recebidos de clientes-por-dia:', response.data);
      setClientes(response.data);
    } catch (error) {
      console.error('❌ Erro ao buscar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes associados.');
    } finally {
      setLoading(false);
    }
  }, [equipeId, diaSemana, empresaid]);// ✅ Agora `fetchClientes` só muda quando necessário
  // ✅ Atualiza `useEffect()` para incluir `fetchClientes`
  useEffect(() => {
    fetchClientes();
    const unsubscribe = navigation.addListener('focus', fetchClientes);
    return unsubscribe;
  }, [navigation, fetchClientes]); // ✅ Agora o ESLint não reclama

  // Função para resetar o status
  const handleResetStatus = async () => {
    try {
      if (!empresaid) {
        Alert.alert('Erro', 'Empresaid não carregado. Tente novamente.');
        return;
      }

      const response = await axios.post(`${Config.API_URL}/reset-status`, {
        empresaid,
      });

      if (response.status === 200) {
        Alert.alert('Sucesso', response.data.message);

        // 🔹 Atualiza os clientes
        fetchClientes();

        // 🔹 Envia um sinal para resetar a barra de progresso
        navigation.navigate('EquipesDiasDaSemana', {
          equipeId,
          equipeNome,
          resetProgresso: true,
        });
      } else {
        Alert.alert('Erro', 'Não foi possível resetar as manutenções.');
      }
    } catch (error) {
      console.error('Erro ao resetar status:', error);
      Alert.alert('Erro', 'Não foi possível resetar as manutenções.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Clientes - {diaSemana} : {equipeNome}
      </Text>

      {/* Botão Reset Status */}
      <TouchableOpacity style={styles.resetButton} onPress={handleResetStatus}>
        <Text style={styles.resetButtonText}>Reset Status</Text>
      </TouchableOpacity>

      {clientes.length > 0 ? (
        <FlatList
          data={clientes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                item.status === 'concluida' && styles.cardConcluida,
                item.status === 'nao_concluida' && styles.cardNaoConcluida,
              ]}
              onPress={() =>
                navigation.navigate('FolhaManutencao', {
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
                  ultima_substituicao: item.ultima_substituicao,
                  status: item.status,
                  equipeId,
                  diaSemana,
                })
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.clientName}>{item.nome}</Text>
                {item.status === 'nao_concluida' && (
                <Text style={styles.motivoIcon}>{motivoIcon(item.motivo)}</Text>
                )}
              </View>
              <Text style={styles.clientDetails}>Morada: {item.morada}</Text>
              <Text style={styles.clientDetails}>Telefone: {item.telefone}</Text>
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
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
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
  resetButton: {
    backgroundColor: '#FF6347',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
