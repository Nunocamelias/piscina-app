import React, { useEffect, useState } from 'react';
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

  const fetchEmpresaid = async () => {
    try {
      const empresaid = await AsyncStorage.getItem('empresaid');
      if (!empresaid) {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        navigation.navigate('Login');
        return;
      }
      setUserEmpresaid(parseInt(empresaid, 10));
    } catch (error) {
      console.error('Erro ao recuperar empresaid:', error);
      Alert.alert('Erro', 'Não foi possível recuperar o empresaid.');
      navigation.navigate('Login');
    }
  };

  const fetchContadores = async () => {
    if (!userEmpresaid) {
      console.log('[DEBUG] Tentativa de buscar contadores sem empresaid.');
      return;
    }

    try {
      const response = await axios.get(`${Config.API_URL}/contador-clientes`, {
        params: { equipeId, empresaid: userEmpresaid },
      });
      setContadores(response.data);
    } catch (error) {
      console.error('Erro ao buscar contadores de clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os contadores de clientes.');
    }
  };

  useEffect(() => {
    fetchEmpresaid();
  }, []);

  useEffect(() => {
    if (isFocused && userEmpresaid !== undefined) {
      fetchContadores();
    }
  }, [isFocused, userEmpresaid]);

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
  },
  button: {
    backgroundColor: '#ADD8E6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DiasDaSemanaScreen;
