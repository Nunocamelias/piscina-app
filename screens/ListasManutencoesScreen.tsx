import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  DiasDaSemana: { equipeId: number; equipeNome: string }; // Navega para DiasDaSemana com dados da equipe
  Login: undefined; // Tela de Login
};

type ListasManutencoesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DiasDaSemana'
>;

type Props = {
  navigation: ListasManutencoesScreenNavigationProp;
};

const ListasManutencoesScreen = ({ navigation }: Props) => {
  const [equipes, setEquipes] = useState([]);
  const [userEmpresaid, setUserEmpresaid] = useState<number | undefined>(undefined);

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
      } catch (error) {
        console.error('Erro ao carregar empresaid:', error);
        Alert.alert('Erro', 'Não foi possível recuperar o empresaid.');
      }
    };

    fetchEmpresaid();
  }, [navigation]);

  useEffect(() => {
    const fetchEquipes = async () => {
      if (!userEmpresaid) {
        console.log('[DEBUG] Tentativa de buscar equipes sem empresaid.');
        return;
      }

      try {
        console.log('[DEBUG] Buscando equipes com empresaid:', userEmpresaid);
        const response = await axios.get(`${Config.API_URL}/equipes`, {
          params: { empresaid: userEmpresaid },
        });
        console.log('[DEBUG] Equipes recebidas:', response.data);
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
          {`Nome da Equipe: ${item.nomeequipe}\n` +
            `Técnicos: ${item.nome1}${item.nome2 ? ' & ' + item.nome2 : ''}\n` +
            `Telefone: ${item.telefone || 'Não informado'}\n` +
            `Matrícula: ${item.matricula || 'Não informada'}\n` +
            `Próxima inspeção: ${formatDate(item.proxima_inspecao)}\n` +
            `Validade do Seguro: ${formatDate(item.validade_seguro)}`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listas de Manutenções</Text>
      <FlatList
        data={equipes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEquipeItem}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma equipe encontrada.</Text>}
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
  equipeButton: {
    backgroundColor: '#ADD8E6', // Azul claro
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  equipeButtonText: {
    color: '#333', // Cinza escuro para suavizar o contraste
    fontSize: 14, // Reduzir o tamanho da fonte
    fontWeight: '500', // Peso intermediário para suavizar
    textAlign: 'left', // Alinha o texto à esquerda
    lineHeight: 20, // Espaçamento entre linhas para melhorar a legibilidade
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#333',
  },
});

export default ListasManutencoesScreen;
