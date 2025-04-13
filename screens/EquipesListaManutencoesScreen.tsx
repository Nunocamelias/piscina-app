import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Appearance } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import type { StackScreenProps } from '@react-navigation/stack';

const isDarkMode = Appearance.getColorScheme() === 'dark';

type RootStackParamList = {
  EquipesListaManutencoes: { equipeId: number; equipeNome: string };
  EquipesDiasDaSemana: { equipeId: number; equipeNome: string };
};

type Props = StackScreenProps<RootStackParamList, 'EquipesListaManutencoes'>;

const EquipesListaManutencoesScreen = ({ navigation, route }: Props) => {
  const { equipeId, equipeNome } = route.params;
  const [equipeDetalhes, setEquipeDetalhes] = useState<{
    nomeequipe: string;
    nome1: string;
    nome2: string;
    matricula: string;
    telefone: string;
    proxima_inspecao: string | null;
    validade_seguro: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchEquipeDetalhes = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (!empresaid) {
          Alert.alert('Erro', 'Empresaid não encontrado. Reinicie a aplicação.');
          return;
        }

        const response = await axios.get(`${Config.API_URL}/detalhes-equipe`, {
          params: { equipeId, empresaid: parseInt(empresaid, 10) },
        });
        setEquipeDetalhes(response.data);
      } catch (error) {
        console.error('Erro ao buscar detalhes da equipe:', error);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes da equipe.');
      }
    };

    fetchEquipeDetalhes();
  }, [equipeId]);

  const getColorForDate = (date: string | null) => {
    if (!date) {return '#000';} // Preto por padrão

    const today = moment();
    const targetDate = moment(date);

    const diffDays = targetDate.diff(today, 'days');

    if (diffDays <= 3) {return '#FF6347';} // Vermelho
    if (diffDays <= 15) {return '#FFA500';} // Laranja
    if (diffDays <= 30) {return '#FFD700';} // Amarelo
    return '#000'; // Preto (fora do período de alerta)
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) {return 'Não definida';}
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  };

  if (!equipeDetalhes) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Carregando detalhes da equipe...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{equipeDetalhes.nomeequipe}</Text>
      <View style={styles.detailsContainer}>
        <Text style={styles.detailItem}>Nome da Equipe: {equipeDetalhes.nomeequipe}</Text>
        <Text style={styles.detailItem}>Técnico 1: {equipeDetalhes.nome1}</Text>
        <Text style={styles.detailItem}>Técnico 2: {equipeDetalhes.nome2}</Text>
        <Text style={styles.detailItem}>Matrícula: {equipeDetalhes.matricula}</Text>
        <Text style={styles.detailItem}>Telefone: {equipeDetalhes.telefone}</Text>

        <Text
          style={[
            styles.detailItem,
            { color: getColorForDate(equipeDetalhes.proxima_inspecao) },
          ]}
        >
          Próxima Inspeção: {formatDate(equipeDetalhes.proxima_inspecao)}
        </Text>

        <Text
          style={[
            styles.detailItem,
            { color: getColorForDate(equipeDetalhes.validade_seguro) },
          ]}
        >
          Validade do Seguro: {formatDate(equipeDetalhes.validade_seguro)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate('EquipesDiasDaSemana', { equipeId, equipeNome })
        }
      >
        <Text style={styles.buttonText}>Dias da Semana</Text>
      </TouchableOpacity>
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
    color: '#000',
  },
  detailsContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#909090', // Cinza escuro para contraste
    marginBottom: 20,
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555', // Cinza mais escuro
  },
  button: {
    backgroundColor: '#ADD8E6', // Azul claro
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2, // Linha de contorno suave
    borderColor: '#909090', // Cinza escuro para contraste
  },
  buttonText: {
    color: '#000', // Preto
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EquipesListaManutencoesScreen;