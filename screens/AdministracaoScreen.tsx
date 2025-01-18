import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  navigation: any;
};

const AdministracaoScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Área de Administração</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Faturas')}>
        <Text style={styles.buttonText}>Faturas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ParametrosQuimicos')}>
        <Text style={styles.buttonText}>Parâmetros Químicos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ReceberNotificacoes')}>
        <Text style={styles.buttonText}>Notificações</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D3D3D3', // Cinza claro
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000', // Preto
  },
  button: {
    backgroundColor: '#ADD8E6', // Azul claro
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25, // Cantos arredondados
    marginBottom: 15, // Espaçamento entre botões
    width: '80%', // Largura consistente para todos os botões
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000', // Preto
  },
});

export default AdministracaoScreen;


