import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity, Appearance } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = async () => {
    try {
      console.log('Iniciando login com:', { email, senha });

      const response = await axios.post(`${Config.API_URL}/login`, { email, senha });
      const { token, user } = response.data;

      if (!user.empresaid) {
        throw new Error('Empresaid não encontrado no servidor.');
      }

      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('empresaid', user.empresaid.toString());

      const userType = user.tipo_usuario;
      const equipeId = user.equipeId;

      if (userType === 'admin') {
        navigation.navigate('Home');
      } else if (userType === 'equipe') {
        if (!equipeId) {
          Alert.alert('Erro', 'ID da equipe não encontrado.');
          return;
        }
        navigation.navigate('EquipeHome', {
          equipeId: user.equipeId,
          equipeNome: user.nome,
        });
      } else {
        Alert.alert('Erro', 'Tipo de usuário desconhecido.');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        Alert.alert('Erro', error.response?.data?.error || 'Credenciais inválidas.');
      } else {
        Alert.alert('Erro', 'Algo deu errado. Tente novamente.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={isDarkMode ? styles.titleDark : styles.titleLight}>GES-POOL</Text>
      <TextInput
        style={isDarkMode ? styles.inputDark : styles.inputLight}
        placeholder="Email"
        placeholderTextColor={isDarkMode ? '#BBBBBB' : '#666666'}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={isDarkMode ? styles.inputDark : styles.inputLight}
        placeholder="Senha"
        placeholderTextColor={isDarkMode ? '#BBBBBB' : '#666666'}
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('RegisterCompany')}>
        <Text style={isDarkMode ? styles.registerTextDark : styles.registerTextLight}>
          Novo Registo de Empresa
        </Text>
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
  titleLight: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
  },
  titleDark: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  labelLight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000', // Preto em modo claro
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginTop: 10,
  },
  labelDark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
    opacity: 1,
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginTop: 10,
  },
  inputLight: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 10,
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: '#FFF',
    color: '#000',
    width: '80%',
    fontSize: 16,
    textAlign: 'center',
  },
  inputDark: {
    borderWidth: 1.2,
    borderColor: '#000',
    padding: 10,
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: '#333',
    color: '#FFF',
    width: '80%',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#ADD8E6',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1.2, // Moldura preta
    borderColor: '#000', // Cor da moldura preta
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  registerTextLight: {
    fontSize: 14,
    color: '#444444',
    textDecorationLine: 'underline',
    marginTop: 15,
  },
  registerTextDark: {
    fontSize: 14,
    color: '#333',
    textDecorationLine: 'underline',
    marginTop: 15,
  },
});

export default LoginScreen;
