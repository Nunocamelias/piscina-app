import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Alert, StyleSheet } from 'react-native';
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
};

const EquipesPiscinasPorDiaScreen: React.FC<Props> = ({ route }) => {
  const { equipeId, equipeNome, diaSemana } = route.params;
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Função para buscar clientes associados
  const fetchClientes = async () => {
    try {
      const response = await axios.get(`${Config.API_URL}/clientes-por-dia`, {
        params: { equipeId, diaSemana },
      });
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes associados.');
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [equipeId, diaSemana]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Clientes - {diaSemana} : {equipeNome}
      </Text>
      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.clientName}>{item.nome}</Text>
            <Text style={styles.clientDetails}>Morada: {item.morada}</Text>
            <Text style={styles.clientDetails}>Telefone: {item.telefone}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum cliente associado.</Text>
        }
      />
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
});

export default EquipesPiscinasPorDiaScreen;
