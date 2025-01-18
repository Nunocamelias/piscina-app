import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, Button } from 'react-native';
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
  periodicidade: number;
  periodicidadeRestante: number;
  periodicidadeformatada: string;
};

const PiscinasPorDiaScreen: React.FC<Props> = ({ route }) => {
  const { equipeId, equipeNome, diaSemana, readOnly } = route.params;
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesDisponiveis, setClientesDisponiveis] = useState<Cliente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [userEmpresaid, setUserEmpresaid] = useState<number | null>(null);

  // Função para buscar o empresaid do AsyncStorage
  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        console.log('[DEBUG] Tentando carregar o empresaid do AsyncStorage...');
        const empresaid = await AsyncStorage.getItem('empresaid');

        if (empresaid) {
          console.log('[DEBUG] Empresaid encontrado:', empresaid);
          setUserEmpresaid(parseInt(empresaid, 10));
        } else {
          console.log('[DEBUG] Empresaid não encontrado. Mostrando alerta.');
          Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        }
      } catch (error) {
        console.error('[DEBUG] Erro ao carregar empresaid:', error);
        Alert.alert('Erro', 'Não foi possível carregar o empresaid.');
      }
    };

    fetchEmpresaid();
  }, []);

  // Função para buscar clientes associados
  const fetchClientes = async () => {
    if (!userEmpresaid) return;

    try {
      console.log('[DEBUG] Buscando clientes associados para equipe:', equipeId, 'e dia:', diaSemana);
      const response = await axios.get(`${Config.API_URL}/clientes-por-dia`, {
        params: { equipeId, diaSemana, empresaid: userEmpresaid },
      });
      console.log('[DEBUG] Clientes associados recebidos:', response.data);
      setClientes(response.data);
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar clientes associados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes associados.');
    }
  };

  // Função para buscar clientes disponíveis
  const fetchClientesDisponiveis = async () => {
    if (!userEmpresaid) return;

    try {
      console.log('[DEBUG] Buscando clientes disponíveis para dia:', diaSemana);
      const response = await axios.get(`${Config.API_URL}/clientes-disponiveis`, {
        params: { diaSemana, empresaid: userEmpresaid },
      });
      console.log('[DEBUG] Clientes disponíveis recebidos:', response.data);
      setClientesDisponiveis(response.data);
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar clientes disponíveis:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes disponíveis.');
    }
  };

  useEffect(() => {
    if (userEmpresaid) {
      fetchClientes();
      if (!readOnly) fetchClientesDisponiveis();
    }
  }, [userEmpresaid, equipeId, diaSemana]);

  const associarCliente = async (clienteId: number) => {
    if (readOnly) return;

    try {
      console.log('[DEBUG] Associando cliente:', clienteId, 'com equipe:', equipeId, 'e dia:', diaSemana);
      await axios.post(`${Config.API_URL}/associados`, {
        equipeId,
        diaSemana,
        clienteId,
        empresaid: userEmpresaid,
      });
      Alert.alert('Sucesso', 'Cliente associado com sucesso!');
      fetchClientes();
      fetchClientesDisponiveis();
      setModalVisible(false);
    } catch (error) {
      console.error('[DEBUG] Erro ao associar cliente:', error);
      Alert.alert('Erro', 'Não foi possível associar o cliente.');
    }
  };

  const desassociarCliente = async (clienteId: number) => {
    if (readOnly) return;

    Alert.alert(
      'Confirmação',
      'Tem certeza de que deseja desassociar este cliente?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sim',
          onPress: async () => {
            try {
              console.log('[DEBUG] Desassociando cliente:', clienteId);
              await axios.delete(`${Config.API_URL}/desassociar-cliente`, {
                data: { clienteId, equipeId, diaSemana, empresaid: userEmpresaid },
              });
              Alert.alert('Sucesso', 'Cliente desassociado com sucesso!');
              fetchClientes();
              fetchClientesDisponiveis();
            } catch (error) {
              console.error('[DEBUG] Erro ao desassociar cliente:', error);
              Alert.alert('Erro', 'Não foi possível desassociar o cliente.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Clientes - {diaSemana} : {equipeNome}
      </Text>
      {!readOnly && ( // Exibe botão associar apenas se não for somente leitura
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Associar Cliente</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.clientInfo}>
              <View style={styles.clientDetailsContainer}>
                <Text style={styles.clientName}>{item.nome}</Text>
                <Text style={styles.clientDetails}>Morada: {item.morada}</Text>
                <Text style={styles.clientDetails}>Telefone: {item.telefone}</Text>
              </View>
              {!readOnly && ( // Exibe botão desassociar apenas se não for somente leitura
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => desassociarCliente(item.id)}
                >
                  <Text style={styles.removeButtonText}>Desassociar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum cliente associado.</Text>
        }
      />
      {!readOnly && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Clientes Disponíveis</Text>
            <FlatList
              data={clientesDisponiveis}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => associarCliente(item.id)}
                >
                  <Text style={styles.modalItemText}>
                    {item.nome} ({item.periodicidadeformatada})
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Nenhum cliente disponível para associar.
                </Text>
              }
            />
            <Button title="Fechar" onPress={() => setModalVisible(false)} />
          </View>
        </Modal>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#ADD8E6',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Botão e detalhes ficam nas extremidades
    alignItems: 'center', // Centraliza verticalmente
  },
  clientDetailsContainer: {
    flex: 1, // O texto ocupará o restante do espaço
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clientDetails: {
    fontSize: 14,
    color: '#555',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF',
  },
  removeButton: {
    backgroundColor: '#ADD8E6', // Azul característico da app
    paddingVertical: 10,
    paddingHorizontal: 15, // Botão suficiente para o texto "Desassociar"
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Espaço entre o texto e o botão
  },
  removeButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  modalItemText: {
    fontSize: 16,
  },
});

export default PiscinasPorDiaScreen;
  






