import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

// Define os tipos de navegação
type RootStackParamList = {
  EquipeHome: { equipeId: number; equipeNome: string };
  EquipesListaManutencoes: { equipeId: number; equipeNome: string };
};

type Props = StackScreenProps<RootStackParamList, 'EquipeHome'>;

const EquipeHomeScreen = ({ navigation, route }: Props) => {
  const { equipeId, equipeNome } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Equipe de Manutenção</Text>
      <Text style={styles.subtitle}>ID: {equipeId} | Nome: {equipeNome}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate('EquipesListaManutencoes', {
            equipeId,
            equipeNome,
          })
        }
      >
        <Text style={styles.buttonText}>Equipes - Manutenções</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#D3D3D3',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EquipeHomeScreen;




