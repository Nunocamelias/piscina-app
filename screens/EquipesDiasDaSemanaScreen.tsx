import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressBar } from 'react-native-paper'; // Biblioteca para barra de progresso

const EquipesDiasDaSemanaScreen = ({ navigation, route }: any) => {
  const { equipeId, equipeNome } = route.params;

  const [contadores, setContadores] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [userEmpresaid, setUserEmpresaid] = useState<number | null>(null);
  const isFocused = useIsFocused();

  const diasDaSemana = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  // Busca o empresaid
  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (empresaid) {
          setUserEmpresaid(parseInt(empresaid, 10));
        } else {
          Alert.alert('Erro', 'Empresaid não encontrado.');
        }
      } catch (error) {
        console.error('[DEBUG] Erro ao buscar empresaid:', error);
      }
    };

    fetchEmpresaid();
  }, []);

  // Busca os contadores de clientes
  const fetchContadores = async () => {
    if (!userEmpresaid) return;

    try {
      const response = await axios.get(`${Config.API_URL}/contador-clientes`, {
        params: { equipeId, empresaid: userEmpresaid },
      });
      setContadores(response.data);

      // Inicializa o progresso como 0 para todos os dias
      const initialProgress: Record<string, number> = {};
      diasDaSemana.forEach((dia) => {
        initialProgress[dia] = 0; // Assume 0% completo inicialmente
      });
      setProgress(initialProgress);
    } catch (error) {
      console.error('Erro ao buscar contadores de clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os contadores de clientes.');
    }
  };

  useEffect(() => {
    if (isFocused && userEmpresaid !== null) {
      fetchContadores();
    }
  }, [isFocused, userEmpresaid]);

  // Atualiza o progresso (simulado)
  const atualizarProgresso = (dia: string) => {
    if (!contadores[dia]) return; // Evita divisão por zero
    const novosProgresso = Math.min(progress[dia] + 1 / contadores[dia], 1); // Incrementa o progresso
    setProgress((prev) => ({ ...prev, [dia]: novosProgresso }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dias da Semana - {equipeNome}</Text>
      {diasDaSemana.map((dia) => (
        <View key={dia} style={styles.dayContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              atualizarProgresso(dia);
              navigation.navigate('EquipesPiscinasPorDia', {
                equipeId,
                equipeNome,
                diaSemana: dia,
                empresaid: userEmpresaid,
              });
            }}
          >
            <Text style={styles.buttonText}>
              {dia} - {contadores[dia] || 0} clientes
            </Text>
          </TouchableOpacity>
          <ProgressBar
            progress={progress[dia] || 0}
            color="#007BFF"
            style={styles.progressBar}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#D3D3D3', // Cinza claro
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000', // Preto
  },
  dayContainer: {
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#ADD8E6', // Azul claro esbatido
    padding: 15,
    borderRadius: 25,
    borderWidth: 2, // Contorno cinzento
    borderColor: '#A9A9A9',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000', // Preto
    fontWeight: '600',
    fontSize: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 5,
    marginTop: 8,
    backgroundColor: '#D3D3D3', // Fundo da barra de progresso
  },
});

export default EquipesDiasDaSemanaScreen;
