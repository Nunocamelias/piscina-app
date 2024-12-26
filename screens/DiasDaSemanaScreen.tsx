import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import { useIsFocused } from '@react-navigation/native'; // Importa o hook

type Props = {
  navigation: any;
  route: any;
};

const DiasDaSemanaScreen: React.FC<Props> = ({ navigation, route }) => {
  const { equipeId, equipeNome } = route.params;
  const [contadores, setContadores] = useState<Record<string, number>>({});
  const isFocused = useIsFocused(); // Hook para verificar se a tela está em foco

  const diasDaSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const fetchContadores = async () => {
    try {
      const response = await axios.get(`${Config.API_URL}/contador-clientes`, {
        params: { equipeId },
      });
      setContadores(response.data);
    } catch (error) {
      console.error('Erro ao buscar contadores de clientes:', error);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchContadores(); // Atualiza os contadores sempre que a tela fica em foco
    }
  }, [isFocused]);

  // Função para determinar se é "somente leitura"
  const isReadOnly = route.params?.userType === 'equipe';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dias da Semana - {equipeNome}</Text>
      {diasDaSemana.map((dia) => {
        return (
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
        );
      })}
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





