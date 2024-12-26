import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = async () => {
    try {
      console.log('Iniciando login com:', { email, senha });
  
      const response = await axios.post(`${Config.API_URL}/login`, { email, senha });
      console.log('Resposta completa do servidor:', response.data);
  
      const { token, user } = response.data;
  
      // Verifique os campos do usuário
      console.log('Usuário desestruturado:', user);
  
      // Salva o token no AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      console.log('Token armazenado com sucesso:', token);
  
      const userType = user.tipo_usuario;
      const equipeId = user.equipeId; // Corrija para "equipeId" com "I" maiúsculo, se necessário
  
      console.log('Tipo de usuário:', userType, 'equipeId:', equipeId);
  
      if (userType === 'admin') {
        console.log('Usuário identificado como admin. Redirecionando para Home.');
        navigation.navigate('Home');
      } else if (userType === 'equipe') {
        if (!equipeId) {
          console.error('equipeId está faltando para o tipo de usuário equipe:', user);
          Alert.alert('Erro', 'ID da equipe não encontrado.');
          return;
        }
        console.log('Usuário identificado como equipe. Redirecionando para EquipeHome.');
        navigation.navigate('EquipeHome', {
          equipeId: user.equipeId,
          equipeNome: user.nome,
        });
      } else {
        console.log('Tipo de usuário desconhecido:', userType);
        Alert.alert('Erro', 'Tipo de usuário desconhecido.');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Erro ao fazer login (Axios):', error.response?.data || error.message);
        Alert.alert('Erro', 'Credenciais inválidas.');
      } else {
        console.error('Erro desconhecido ao fazer login:', error);
        Alert.alert('Erro', 'Algo deu errado. Tente novamente.');
      }
    }
  };
  
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GES-POOL</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D3D3D3',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: '#FFF',
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
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default LoginScreen;



