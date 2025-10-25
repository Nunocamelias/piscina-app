import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Appearance } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

type Props = {
  navigation: any;
  route: any;
};

const isDarkMode = Appearance.getColorScheme() === 'dark';

const DiasDaSemanaScreen: React.FC<Props> = ({ navigation, route }) => {
  const { equipeId, equipeNome } = route.params;
  const [contadores, setContadores] = useState<Record<string, number>>({});
  const [userEmpresaid, setUserEmpresaid] = useState<number | undefined>(undefined);
  const isFocused = useIsFocused(); // Hook para verificar se a tela está em foco

  const diasDaSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // 🔹 Define `fetchEmpresaid` com `useCallback`
  const fetchEmpresaid = useCallback(async () => {
    try {
      const empresaid = await AsyncStorage.getItem('empresaid');
      if (!empresaid) {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        navigation.navigate('Login');
        return;
      }
      const empresaidParsed = parseInt(empresaid, 10);
      console.log('[DEBUG] Empresa ID recuperado:', empresaidParsed);
      setUserEmpresaid(empresaidParsed);
    } catch (error) {
      console.error('Erro ao recuperar empresaid:', error);
      Alert.alert('Erro', 'Não foi possível recuperar o empresaid.');
      navigation.navigate('Login');
    }
  }, [navigation]);
  // 🔹 Define `fetchContadores` com `useCallback`
  const fetchContadores = useCallback(async () => {
    if (!userEmpresaid) {
      console.log('[DEBUG] Tentativa de buscar contadores sem empresaid.');
      return;
    }
    try {
      console.log('[DEBUG] Buscando contadores para empresa ID:', userEmpresaid);
      const response = await axios.get(`${Config.API_URL}/contador-clientes`, {
        params: { equipeId, empresaid: userEmpresaid },
      });
      console.log('[DEBUG] Contadores recebidos:', response.data);
      // 🔹 Definição dos tipos corretos para evitar erros de TypeScript
      const novosContadores = response.data.reduce(
        (acc: Record<string, number>, item: { diasemana: string; total: number }) => {
          acc[item.diasemana] = item.total;
          return acc;
        },
        {} as Record<string, number> // 🔹 Tipo inicial definido corretamente
      );
      console.log('[DEBUG] Contadores formatados:', novosContadores);
      setContadores(novosContadores);
    } catch (error) {
      console.error('Erro ao buscar contadores de clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os contadores de clientes.');
    }
  }, [userEmpresaid, equipeId]);
  // 🔹 Atualiza os `useEffect` para usar as funções memorizadas
  useEffect(() => {
    fetchEmpresaid();
  }, [fetchEmpresaid]);
  // 🔹 Executa `fetchContadores` APENAS quando `userEmpresaid` for definido corretamente
  useEffect(() => {
    if (isFocused && userEmpresaid !== undefined) {
      console.log('[DEBUG] Chamando fetchContadores com userEmpresaid:', userEmpresaid);
      fetchContadores();
    }
  }, [isFocused, userEmpresaid, fetchContadores]);

  // Função para determinar se é "somente leitura"
  const isReadOnly = route.params?.userType === 'equipe';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dias da Semana - {equipeNome}</Text>
      {diasDaSemana.map((dia) => (
        <TouchableOpacity
          key={dia}
          style={styles.button}
          onPress={() =>
            navigation.navigate('PiscinasPorDia', {
              equipeId: equipeId,
              equipeNome: equipeNome,
              diaSemana: dia,
              readOnly: isReadOnly, // Passar o contexto para a próxima tela
            })
          }
        >
          <Text style={styles.buttonText}>
            {dia} - {contadores[dia] || 0} clientes
          </Text>
        </TouchableOpacity>
      ))}
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
    // 🔹 Sombra igual à dos botões
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  button: {
    backgroundColor: '#22b4b4ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
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
});

export default DiasDaSemanaScreen;
