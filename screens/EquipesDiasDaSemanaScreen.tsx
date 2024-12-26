import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const EquipesDiasDaSemanaScreen = ({ navigation, route }: any) => {
  const { equipeId, equipeNome } = route.params;

  const diasDaSemana = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dias da Semana - {equipeNome}</Text>
      {diasDaSemana.map((dia) => (
        <TouchableOpacity
          key={dia}
          style={styles.button}
          onPress={() =>
            navigation.navigate('EquipesPiscinasPorDia', {
              equipeId,
              equipeNome,
              diaSemana: dia, // Passa o nome do dia correspondente
            })
          }
        >
          <Text style={styles.buttonText}>{dia}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default EquipesDiasDaSemanaScreen;
