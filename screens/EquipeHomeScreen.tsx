import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Appearance } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

const isDarkMode = Appearance.getColorScheme() === 'dark';

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
        <Text style={styles.buttonText}>Manutenções - Semanal</Text>
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
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000', // Preto
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555', // Cinza médio para contraste
  },
  button: {
    backgroundColor: '#ADD8E6', // Azul claro esbatido
    padding: 12,
    borderRadius: 25, // Cantos arredondados para manter consistência
    marginBottom: 10,
    width: '80%',
    alignItems: 'center',
    borderWidth: 2, // Linha de contorno suave
    borderColor: '#909090', // Cinza escuro para contraste
  },
  buttonText: {
    color: '#000', // Preto para texto
    fontWeight: '600',
    fontSize: 16,
  },
});

export default EquipeHomeScreen;