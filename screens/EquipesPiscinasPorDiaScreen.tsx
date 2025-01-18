import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

const EquipesPiscinasPorDiaScreen: React.FC<Props> = ({ route, navigation }) => {
  const { equipeId, equipeNome, diaSemana, empresaid } = route.params; // Recebe o empresaid
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  

  // Função para buscar clientes associados
  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${Config.API_URL}/clientes-por-dia`, {
        params: { equipeId, diaSemana, empresaid }, // Usa o empresaid passado
      });
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes associados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    const unsubscribe = navigation.addListener('focus', fetchClientes);
    return unsubscribe;
  }, [navigation, equipeId, diaSemana, empresaid]);

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
        fetchClientes();
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
              <Text style={styles.clientName}>{item.nome}</Text>
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
    backgroundColor: '#D3D3D3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    marginBottom: 10,
  },
  cardConcluida: {
    backgroundColor: '#DFF2BF',
    borderColor: '#4CAF50',
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
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EquipesPiscinasPorDiaScreen;
