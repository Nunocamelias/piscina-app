import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ScrollView, Appearance, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definir o tipo da equipe
interface Equipe {
  empresaid: number;
  id: number;
  nomeequipe: string;
  nome1: string;
}

const isDarkMode = Appearance.getColorScheme() === 'dark';

const ListaEquipesScreen = ({ navigation }: any) => {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmpresaid, setUserEmpresaid] = useState<number | undefined>(undefined);
  const [empresaNome, setEmpresaNome] = useState('');

  // Função para buscar o empresaid do AsyncStorage
  useEffect(() => {
  const fetchEmpresa = async () => {
    try {
      console.log('[DEBUG] Tentando carregar o empresaid do AsyncStorage...');
      const empresaid = await AsyncStorage.getItem('empresaid');

      if (empresaid) {
        console.log('[DEBUG] Empresaid encontrado:', empresaid);
        setUserEmpresaid(parseInt(empresaid, 10));

        // 🔹 Carrega o nome da empresa a partir do cache
        const cachedNome = await AsyncStorage.getItem('empresa_nome');
        if (cachedNome) {
          console.log('[DEBUG] Nome da empresa carregado do cache:', cachedNome);
          setEmpresaNome(cachedNome);
        } else {
          console.log('[DEBUG] Nome da empresa não encontrado no cache.');
        }
      } else {
        console.log('[DEBUG] Empresaid não encontrado. Mostrando alerta após confirmação.');
        Alert.alert(
          'Erro',
          'Empresaid não encontrado. Faça login novamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('[DEBUG] Redirecionando para a tela de login...');
                navigation.navigate('Login');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao carregar dados da empresa:', error);
      Alert.alert('Erro', 'Ocorreu um problema ao recuperar as informações da empresa.');
    }
  };

  fetchEmpresa();
}, [navigation]);

  // Função para buscar equipes
  const fetchEquipes = useCallback(async () => {
    if (!userEmpresaid) {return;}

    setLoading(true);
    try {
      const response = await axios.get(`${Config.API_URL}/equipes`, {
        params: { empresaid: userEmpresaid },
      });

      if (Array.isArray(response.data) && response.data.length === 0) {
        console.log('[DEBUG] Nenhuma equipe cadastrada.');
        setEquipes([]); // ✅ Define a lista vazia sem erro
      } else {
        setEquipes(response.data);
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar equipes:', error);
      if (!axios.isAxiosError(error) || error.response?.status !== 200) {
        Alert.alert('Erro', 'Não foi possível carregar a lista de equipes.');
      }
    } finally {
      setLoading(false);
    }
  }, [userEmpresaid]);


  // Atualiza as equipes ao carregar a tela
  useFocusEffect(
    useCallback(() => {
      fetchEquipes();
    }, [fetchEquipes])
  );
  // Função para renderizar cada equipe
  const renderEquipe = ({ item }: { item: Equipe }) => (
    <View style={styles.equipeItem}>
      <View style={styles.equipeInfoContainer}>
        <Text style={styles.equipeNome}>{item.nomeequipe}</Text>
        <Text style={styles.equipeNome1}>{item.nome1}</Text>
        <Text style={styles.equipeId}>ID: {item.id}</Text>
      </View>
      <TouchableOpacity
        style={styles.detalhesButton}
        onPress={() => navigation.navigate('EditEquipe', { equipeId: item.id })}
      >
        <Text style={styles.buttonText}>Ver Detalhes</Text>
      </TouchableOpacity>
    </View>
  );
  // Componente principal
  return (
  <ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.container}>
      {/* 🔹 Título */}
      <Text style={styles.title}>Lista de Equipas</Text>

      {/* 🔹 Indicador de carregamento ou lista */}
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={equipes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEquipe}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma equipe encontrada.</Text>
          }
          scrollEnabled={false} // 🔹 evita conflito com o ScrollView
        />
      )}

      {/* 🔹 Rodapé dinâmico */}
      <View style={styles.footer}>
        <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
        <Text style={styles.subTitle}>powered by GESPOOL</Text>
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
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
    // 🔹 Sombra igual à dos botões
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  equipeItem: {
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
  equipeInfoContainer: {
    flex: 1, // Permite ao texto ocupar o espaço restante
    marginRight: -140, // Espaçamento entre o texto e o botão
  },
  equipeNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  equipeNome1: {
    fontSize: 16,
    color: '#555',
  },
  equipeId: {
    fontSize: 14,
    color: '#777',
  },
  detalhesButton: {
    backgroundColor: '#22b4b4ff',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 25,
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
  loadingIndicator: {
    marginTop: 20, // Ajusta conforme necessário
    alignSelf: 'center',
  },
  scrollContainer: {
  flexGrow: 1,
  justifyContent: 'flex-start',
  paddingBottom: 60, // 🔹 garante espaço suficiente no fim
  backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
},
footer: {
  marginTop: 0,
  marginBottom: -40,
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
});

export default ListaEquipesScreen;
