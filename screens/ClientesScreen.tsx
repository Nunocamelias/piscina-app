import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ClientesScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Área de Cliente</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('AddCliente')}>
        <Text style={styles.buttonText}>Adicionar Cliente</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ListaClientes')}>
        <Text style={styles.buttonText}>Lista de Clientes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B0B0B0', // Fundo cinza claro
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333', // Preto
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
    color: '#000', // Preto
  },
});

export default ClientesScreen;