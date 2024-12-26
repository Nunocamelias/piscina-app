import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import type { StackScreenProps } from '@react-navigation/stack';

// Definição dos tipos de navegação
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
  } | null>(null);

  useEffect(() => {
    console.log('Recebido equipeId no EquipesListaManutencoesScreen:', equipeId);
    const fetchEquipeDetalhes = async () => {
      try {
        const response = await axios.get(`${Config.API_URL}/detalhes-equipe`, {
          params: { equipeId },
        });
        console.log('Detalhes da equipe recebidos:', response.data);
        setEquipeDetalhes(response.data);
      } catch (error) {
        console.error('Erro ao buscar detalhes da equipe:', error);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes da equipe.');
      }
    };

    fetchEquipeDetalhes();
  }, [equipeId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definida';
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
        <Text style={styles.detailItem}>
          Próxima Inspeção: {formatDate(equipeDetalhes.proxima_inspecao)}
        </Text>
      </View>
      
      {/* Botão para navegar para Dias da Semana */}
      <TouchableOpacity
  style={styles.button}
  onPress={() =>
    navigation.navigate('EquipesDiasDaSemana', { equipeId, equipeNome, })
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
    backgroundColor: '#D3D3D3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    marginBottom: 20,
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EquipesListaManutencoesScreen;







