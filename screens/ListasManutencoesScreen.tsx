import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import axios from 'axios';
import type { StackNavigationProp } from '@react-navigation/stack';
import Config from 'react-native-config';

type RootStackParamList = {
  DiasDaSemana: { equipeId: number; equipeNome: string }; // Navega para Dias da Semana com dados da equipe
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

  useEffect(() => {
    const fetchEquipes = async () => {
      try {
        const response = await axios.get(`${Config.API_URL}/equipes`);
        setEquipes(response.data);
      } catch (error) {
        console.error('Erro ao buscar equipes:', error);
        Alert.alert('Erro', 'Não foi possível carregar as equipes.');
      }
    };

    fetchEquipes();
  }, []);

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
      nomeequipe: string;
    };
  }) => {
    // Função para formatar a data
    const formatDate = (dateString: string | undefined) => {
      return dateString ? new Date(dateString).toISOString().split('T')[0] : 'Não definida';
    };
  
    return (
      <TouchableOpacity
        style={styles.equipeButton}
        onPress={() => navigation.navigate('DiasDaSemana', { equipeId: item.id, equipeNome: item.nomeequipe })}
      >
        <Text style={styles.equipeButtonText}>
          {`Nome da Equipe: ${item.nomeequipe}\n` +
            `Técnicos: ${item.nome1}${item.nome2 ? ' & ' + item.nome2 : ''}\n` +
            `Telefone: ${item.telefone || 'Não informado'}\n` +
            `Matrícula: ${item.matricula || 'Não informada'}\n` +
            `Próxima inspeção: ${formatDate(item.proxima_inspecao)}`}
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
