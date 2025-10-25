import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, TextInput, Appearance } from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Definir o tipo do cliente
interface Cliente {
  empresaid: number;
  id: number;
  nome: string;
  morada: string;
}

const isDarkMode = Appearance.getColorScheme() === 'dark';

const ListaClientesScreen = ({ navigation }: any) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]); // Dados filtrados
  const [searchQuery, setSearchQuery] = useState(''); // Estado para a busca
  const [loading, setLoading] = useState(true);
  const [userEmpresaid, setUserEmpresaid] = useState<number | undefined>(undefined); // Estado para armazenar o empresaid
  const [empresaNome, setEmpresaNome] = useState('');


  // Função para buscar o empresaid do token JWT
  useEffect(() => {
  const fetchEmpresaData = async () => {
    try {
      console.log('[DEBUG] Tentando carregar o empresaid e nome da empresa do AsyncStorage...');
      const empresaid = await AsyncStorage.getItem('empresaid');
      const nomeEmpresa = await AsyncStorage.getItem('empresa_nome');

      if (empresaid) {
        console.log('[DEBUG] Empresaid encontrado:', empresaid);
        setUserEmpresaid(parseInt(empresaid, 10));
      } else {
        console.log('[DEBUG] Empresaid não encontrado. Mostrando alerta.');
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.', [
          {
            text: 'OK',
            onPress: () => {
              console.log('[DEBUG] Redirecionando para a tela de login...');
              navigation.navigate('Login');
            },
          },
        ]);
      }

      if (nomeEmpresa) {
        console.log('[DEBUG] Nome da empresa carregado do cache:', nomeEmpresa);
        setEmpresaNome(nomeEmpresa);
      } else {
        console.log('[DEBUG] Nome da empresa não encontrado no AsyncStorage.');
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao carregar dados da empresa:', error);
      Alert.alert('Erro', 'Ocorreu um problema ao recuperar os dados da empresa.');
    }
  };

  fetchEmpresaData();
}, [navigation]);



  // Função para buscar clientes
  const fetchClientes = useCallback(async () => {
    if (!userEmpresaid) {
      return; // Evita chamar o backend sem empresaid
    }
    setLoading(true);
    try {
      const response = await axios.get(`${Config.API_URL}/clientes`, {
        params: { empresaid: userEmpresaid },
      });

      setClientes(response.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar a lista de clientes.');
    } finally {
      setLoading(false);
    }
  }, [userEmpresaid]);



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
        cliente.morada.toLowerCase().includes(query)
      );
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
            empresaid: userEmpresaid,
          })
        }
      >
        <Text style={styles.buttonText}>Ver Detalhes</Text>
      </TouchableOpacity>
    </View>
  );

  return (
  <ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.container}>
      {/* 🔹 Título */}
      <Text style={styles.title}>Lista de Clientes</Text>

      {/* 🔹 Barra de pesquisa */}
      <TextInput
        style={isDarkMode ? styles.searchInputDark : styles.searchInputLight}
        placeholder="Procurar por nome ou morada"
        placeholderTextColor={isDarkMode ? '#333' : '#666666'}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* 🔹 Lista ou indicador de carregamento */}
      {loading ? (
        <ActivityIndicator size="large" color={isDarkMode ? '#FFF' : '#0000ff'} />
      ) : (
        <FlatList
          data={filteredClientes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCliente}
          ListEmptyComponent={
            <Text style={isDarkMode ? styles.emptyTextDark : styles.emptyTextLight}>
              Nenhum cliente encontrado.
            </Text>
          }
          scrollEnabled={false} // ✅ Evita conflito com o ScrollView
        />
      )}

      {/* 🔹 Rodapé com nome da empresa (dinâmico) */}
      <View style={styles.footer}>
        <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
        <Text style={styles.subTitle}>powered by GES-POOL</Text>
      </View>
    </View>
  </ScrollView>
);


};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: isDarkMode ? '#000' : '#000', // 🔥 Mantém preto para ambos
    // 🔹 Sombra igual à dos botões
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  searchInput: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  searchInputLight: {
    backgroundColor: '#FFF',
    borderWidth: 0,
    borderColor: '#CCC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
    color: '#000',
    textAlign: 'center',
  },
  searchInputDark: {
    backgroundColor: '#FFF', // 🔥 Mantém branco para contraste com o fundo cinza
    borderWidth: 0,
    borderColor: '#000', // 🔥 Borda preta para destaque
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
    color: '#000',
    textAlign: 'center',
  },
  emptyTextLight: {
    fontSize: 16,
    color: '#666', // 🔥 Cinza escuro no modo claro
    textAlign: 'center',
    marginTop: 20,
  },
  emptyTextDark: {
    fontSize: 16,
    color: '#222', // 🔥 Cinza mais escuro para melhorar a visibilidade no dark mode
    textAlign: 'center',
    marginTop: 20,
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
    backgroundColor: '#22b4b4ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
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
  footer: {
  marginTop: 20,
  marginBottom: 30,
  alignItems: 'center',
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
scrollContainer: {
  flexGrow: 1,
  justifyContent: 'flex-start',
  paddingBottom: 60, // 🔹 espaço para o rodapé visível no final
  backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
},

});

export default ListaClientesScreen;
