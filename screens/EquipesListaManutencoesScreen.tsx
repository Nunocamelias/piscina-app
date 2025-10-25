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
  const [empresaNome, setEmpresaNome] = useState('');
  const [equipeDetalhes, setEquipeDetalhes] = useState<{
    nomeequipe: string;
    nome1: string;
    nome2: string;
    matricula: string;
    telefone: string;
    proxima_inspecao: string | null;
    validade_seguro: string | null;
  } | null>(null);

  // 🔹 Carrega logo, nome da empresa e detalhes da equipe
  useEffect(() => {
    const fetchData = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (!empresaid) {
          Alert.alert('Erro', 'Empresaid não encontrado. Reinicie a aplicação.');
          return;
        }

        // Carrega o logo e nome (cache)
        const cachedNome = await AsyncStorage.getItem('empresa_nome');
        if (cachedNome) {setEmpresaNome(cachedNome);}

        // Busca detalhes da equipe
        const response = await axios.get(`${Config.API_URL}/detalhes-equipe`, {
          params: { equipeId, empresaid: parseInt(empresaid, 10) },
        });
        setEquipeDetalhes(response.data);
      } catch (error) {
        console.error('Erro ao buscar detalhes da equipe:', error);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes da equipe.');
      }
    };

    fetchData();
  }, [equipeId]);

  const getColorForDate = (date: string | null) => {
    if (!date) {return '#000';}
    const today = moment();
    const targetDate = moment(date);
    const diffDays = targetDate.diff(today, 'days');
    if (diffDays <= 3) {return '#FF6347';} // Vermelho
    if (diffDays <= 15) {return '#FFA500';} // Laranja
    if (diffDays <= 30) {return '#FFD700';} // Amarelo
    return '#000';
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

      {/* 🔹 Conteúdo principal afastado do logo */}
      <View style={{ alignItems: 'center', marginTop: 50 }}>
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
            ]}>
            Próxima Inspeção: {formatDate(equipeDetalhes.proxima_inspecao)}
          </Text>

          <Text
            style={[
              styles.detailItem,
              { color: getColorForDate(equipeDetalhes.validade_seguro) },
            ]}>
            Validade do Seguro: {formatDate(equipeDetalhes.validade_seguro)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('EquipesDiasDaSemana', { equipeId, equipeNome })
          }>
          <Text style={styles.buttonText}>Dias da Semana</Text>
        </TouchableOpacity>
      </View>

      {/* 🔹 Nome da empresa e "powered by" no fundo */}
      <View style={styles.footer}>
        <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
        <Text style={styles.subTitle}>powered by GES-POOL</Text>
      </View>
    </View>
  );
};

// 🔹 Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 60,
    textAlign: 'center',
    color: '#000',
    // 🔹 Sombra igual à dos botões
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  detailsContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 0,
    borderColor: '#909090',
    marginBottom: 20,
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  button: {
    backgroundColor: '#22b4b4ff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
    // 🔹 Remove o contorno preto
    borderWidth: 0,
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 25, // 🔹 afastado do fundo
    width: '100%',
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

export default EquipesListaManutencoesScreen;

