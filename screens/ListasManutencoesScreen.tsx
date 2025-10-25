import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Appearance, ScrollView } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  DiasDaSemana: { equipeId: number; equipeNome: string };
  Login: undefined;
};

type ListasManutencoesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DiasDaSemana'
>;

type Props = {
  navigation: ListasManutencoesScreenNavigationProp;
};

const isDarkMode = Appearance.getColorScheme() === 'dark';

const ListasManutencoesScreen = ({ navigation }: Props) => {
  const [equipes, setEquipes] = useState([]);
  const [empresaNome, setEmpresaNome] = useState('');
  const [userEmpresaid, setUserEmpresaid] = useState<number | undefined>(undefined);

  // 🔹 Carrega empresaid
  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (empresaid) {
          setUserEmpresaid(parseInt(empresaid, 10));
        } else {
          Alert.alert(
            'Erro',
            'Empresaid não encontrado. Faça login novamente.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        }

        // Carrega logo e nome da empresa do cache
        const cachedNome = await AsyncStorage.getItem('empresa_nome');
        if (cachedNome) {setEmpresaNome(cachedNome);}
      } catch (error) {
        console.error('Erro ao carregar empresaid:', error);
        Alert.alert('Erro', 'Não foi possível recuperar o empresaid.');
      }
    };

    fetchEmpresaid();
  }, [navigation]);

  // 🔹 Carrega lista de equipes
  useEffect(() => {
    const fetchEquipes = async () => {
      if (!userEmpresaid) {return;}

      try {
        const response = await axios.get(`${Config.API_URL}/equipes`, {
          params: { empresaid: userEmpresaid },
        });
        setEquipes(response.data);
      } catch (error) {
        console.error('[DEBUG] Erro ao buscar equipes:', error);
        Alert.alert('Erro', 'Não foi possível carregar as equipes.');
      }
    };

    fetchEquipes();
  }, [userEmpresaid]);

  const renderEquipeItem = ({
    item,
  }: {
    item: {
      id: number;
      nome1: string;
      nome2?: string;
      telefone?: string;
      matricula?: string;
      proxima_inspecao?: string;
      validade_seguro?: string;
      nomeequipe: string;
    };
  }) => {
    const formatDate = (dateString: string | undefined) => {
      return dateString ? new Date(dateString).toISOString().split('T')[0] : 'Não definida';
    };

    return (
      <TouchableOpacity
        style={styles.equipeButton}
        onPress={() =>
          navigation.navigate('DiasDaSemana', {
            equipeId: item.id,
            equipeNome: item.nomeequipe,
          })
        }
      >
        <Text style={styles.equipeButtonText}>
          <Text style={styles.boldText}>Nome da Equipe: </Text>
          {item.nomeequipe + '\n'}

          <Text style={styles.boldText}>Técnicos: </Text>
          {item.nome1}
          {item.nome2 ? ` & ${item.nome2}` : ''} {'\n'}

          <Text style={styles.boldText}>Telefone: </Text>
          {item.telefone || 'Não informado'} {'\n'}

          <Text style={styles.boldText}>Matrícula: </Text>
          {item.matricula || 'Não informada'} {'\n'}

          <Text style={styles.boldText}>Próxima inspeção: </Text>
          {formatDate(item.proxima_inspecao)} {'\n'}

          <Text style={styles.boldText}>Validade do Seguro: </Text>
          {formatDate(item.validade_seguro)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
  <ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.container}>
      {/* 🔹 Secção dos botões — centralizada */}
          <View style={{ marginTop: 180, alignItems: 'center', width: '100%' }} />

      {/* 🔹 Título */}
      <Text style={styles.title}>Listas de Manutenções</Text>

      {/* 🔹 Lista dinâmica de equipes */}
      <FlatList
        data={equipes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEquipeItem}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma equipe encontrada.</Text>}
        scrollEnabled={false} // um único scroll
      />

      {/* 🔹 Rodapé sempre com espaçamento fixo do último item */}
      <View style={styles.footer}>
        <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
        <Text style={styles.subTitle}>powered by GES-POOL</Text>
      </View>
    </View>
  </ScrollView>
);

};

// 🔹 Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: isDarkMode ? '#D3D3D3' : '#D3D3D3',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    backgroundColor: isDarkMode ? '#D3D3D3' : '#D3D3D3',
    paddingVertical: 20,
    paddingBottom: 80, // 🔹 espaço fixo no fim (mantém o nome visível)
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
    marginTop: -180, // mantém posição
    // 🔹 Sombra igual à dos botões
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
    equipeButton: {
    backgroundColor: '#22b4b4ff',
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 25,   // ⬅️ aumenta a distância abaixo de cada quadro
    width: '90%',
    alignItems: 'center',
    alignSelf: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10,
  },
  equipeButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#333',
  },
  boldText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? '#FFF' : '#000',
  },
  footer: {
    alignItems: 'center',
    marginTop: 60, // 🔹 distância constante do último quadro
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

export default ListasManutencoesScreen;
