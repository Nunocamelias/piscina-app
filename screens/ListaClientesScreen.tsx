import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import Config from 'react-native-config';

// Definir o tipo do cliente
interface Cliente {
  id: number;
  nome: string;
  morada: string,
}

const ListaClientesScreen = ({ navigation }: any) => {
    const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]); // Dados filtrados
  const [searchQuery, setSearchQuery] = useState(''); // Estado para a busca
  const [loading, setLoading] = useState(true);

  // Função para buscar clientes
  const fetchClientes = useCallback(async () => {
    setLoading(true); // Ativa o indicador de carregamento
    try {
      const response = await axios.get(`${Config.API_URL}/clientes`); // Ajuste a URL se necessário
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de clientes.');
    } finally {
      setLoading(false); // Desativa o indicador de carregamento
    }
  }, []);

  // Atualiza os clientes ao carregar a tela
  useFocusEffect(
    useCallback(() => {
      fetchClientes();
    }, [fetchClientes])
  );
  // Atualiza os clientes filtrados conforme a busca
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClientes(clientes); // Sem filtro, exibe todos os clientes
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clientes.filter((cliente) =>
      cliente.nome.toLowerCase().includes(query) ||
      cliente.morada.toLowerCase().includes(query));
      setFilteredClientes(filtered);
    }
  }, [searchQuery, clientes]);

  const renderCliente = ({ item }: { item: Cliente }) => (
    <View style={styles.clienteItem}>
      <View>
        <Text style={styles.clienteNome}>{item.nome}</Text>
        <Text style={styles.clienteMorada}>{item.morada}</Text>
      </View>
      <TouchableOpacity
        style={styles.detalhesButton}
        onPress={() =>
          navigation.navigate('EditCliente', {
            clienteId: item.id,
          })
        }
      >
        <Text style={styles.buttonText}>Ver Detalhes</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Clientes</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Procurar por nome ou morada"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={filteredClientes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCliente}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum cliente encontrado.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D3D3D3',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  searchInput: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  clienteItem: {
    backgroundColor: '#FFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderColor: '#CCC',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clienteNome: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  clienteMorada: {
    fontSize: 14, // Tamanho menor que o nome
    color: '#555', // Cinza mais claro para contraste
    marginTop: 4, // Pequeno espaçamento abaixo do nome
  },
  detalhesButton: {
    backgroundColor: '#ADD8E6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#000',
  },
});

export default ListaClientesScreen;


