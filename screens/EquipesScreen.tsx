import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';


const EquipesScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Área de Equipes</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('AddEquipe')}
      >
        <Text style={styles.buttonText}>Adicionar Equipe</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ListaEquipes')}
      >
        <Text style={styles.buttonText}>Lista de Equipes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B0B0B0',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
  },
  button: {
    backgroundColor: '#ADD8E6', // Azul claro
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25, // Cantos arredondados
    marginBottom: 15, // Espaçamento entre os botões
    width: '80%', // Largura uniforme
    alignItems: 'center',
    borderWidth: 1.2, // 🔹 Adiciona a moldura preta ao botão
    borderColor: '#000',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default EquipesScreen;

