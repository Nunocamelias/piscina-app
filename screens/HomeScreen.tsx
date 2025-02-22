import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Appearance } from 'react-native';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const HomeScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>GES-POOL</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Clientes')}>
        <Text style={styles.buttonText}>Área de Clientes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Equipes')}>
        <Text style={styles.buttonText}>Área de Equipes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ListasManutencoes')}>
        <Text style={styles.buttonText}>Gerir Manutenções</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Administracao')}>
        <Text style={styles.buttonText}>Administração</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333', // Preto para contraste
  },
  button: {
    backgroundColor: '#ADD8E6', // Azul claro para os botões
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25, // Cantos redondos
    marginBottom: 15, // Espaçamento entre os botões
    width: '80%', // Todos os botões com a mesma largura
    alignItems: 'center', // Centraliza o texto dentro do botão
    borderWidth: 1.2, // 🔹 Adiciona a moldura preta ao botão
    borderColor: '#000',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000', // Texto preto
  },
});

export default HomeScreen;




