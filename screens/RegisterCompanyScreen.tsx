import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Appearance } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Icon } from 'react-native-paper';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const RegisterCompanyScreen = () => {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmSenhaVisivel, setConfirmSenhaVisivel] = useState(false);

  const navigation = useNavigation<NavigationProp<any>>(); // Solução genérica para navegação

  const isValidEmail = (emailInput: string): boolean => {
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;
    return emailRegex.test(emailInput);
  };

  const isValidPassword = (passwordInput: string): boolean => {
    return /^[A-Za-z0-9!@#$%^&*()_+={}[\]:;"'<>,.?/-]+$/.test(passwordInput);
  };

  const handleRegister = async () => {
    if (isLoading) {
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (!companyName || !email || !password || !phone || !address) {
      Alert.alert('Erro', 'Todos os campos são obrigatórios.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Por favor, insira um email válido.');
      return;
    }

    if (!isValidPassword(password)) {
      Alert.alert('Erro', 'A senha contém caracteres inválidos.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${Config.API_URL}/register`, {
        nome_empresa: companyName,
        email,
        senha: password,
        telefone: phone,
        endereco: address,
      });

      Alert.alert('Sucesso', 'Registo realizado com sucesso!');
      navigation.navigate('Login');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert('Erro', error.response.data.error || 'Ocorreu um erro ao registar.');
      } else {
        console.error('Erro inesperado:', error);
        Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={isDarkMode ? styles.titleDark : styles.titleLight}>Registar Empresa</Text>
      <TextInput
        style={isDarkMode ? styles.inputDark : styles.inputLight}
        placeholder="Nome da Empresa"
        placeholderTextColor={isDarkMode ? '#BBBBBB' : '#666666'}
        value={companyName}
        onChangeText={setCompanyName}
      />
      <TextInput
        style={isDarkMode ? styles.inputDark : styles.inputLight}
        placeholder="Telefone"
        placeholderTextColor={isDarkMode ? '#BBBBBB' : '#666666'}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={isDarkMode ? styles.inputDark : styles.inputLight}
        placeholder="Endereço"
        placeholderTextColor={isDarkMode ? '#BBBBBB' : '#666666'}
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={isDarkMode ? styles.inputDark : styles.inputLight}
        placeholder="Email"
        placeholderTextColor={isDarkMode ? '#BBBBBB' : '#666666'}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={(text) => setEmail(text.toLowerCase().replace(/[^a-z0-9@._-]/g, ''))}
      />

      {/* Campo de Senha */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="         Senha"
          placeholderTextColor="#BBBBBB"
          secureTextEntry={!senhaVisivel}
          value={password}
          onChangeText={(text) => setPassword(text.replace(/[^A-Za-z0-9!@#$%^&*()_+={}[\]:;"'<>,.?/-]/g, ''))}
        />
        <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)} style={styles.eyeButton}>
          <Icon source={senhaVisivel ? 'eye' : 'eye-off'} size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Campo de Confirmação de Senha */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirmar Senha"
          placeholderTextColor="#BBBBBB"
          secureTextEntry={!confirmSenhaVisivel}
          value={confirmPassword}
          onChangeText={(text) => setConfirmPassword(text.replace(/[^A-Za-z0-9!@#$%^&*()_+={}[\]:;"'<>,.?/-]/g, ''))}
        />
        <TouchableOpacity onPress={() => setConfirmSenhaVisivel(!confirmSenhaVisivel)} style={styles.eyeButton}>
          <Icon source={confirmSenhaVisivel ? 'eye' : 'eye-off'} size={24} color="black" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
        <Text style={styles.buttonText}>{isLoading ? 'Aguarde...' : 'Registar'}</Text>
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
  inputLight: {
    borderWidth: 1,
    borderColor: '#ccc',
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
    paddingVertical: 11,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    height: 45,
    borderWidth: 1.2,
    marginBottom: 15,
    borderColor: '#000',
    borderRadius: 25,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingHorizontal: 0,
    justifyContent: 'space-between',
  },
  passwordInput: {
    flex: 1,
    height: 45,
    color: '#FFF',
    fontSize: 16,
    backgroundColor: '#333',
    borderRadius: 25,
    paddingHorizontal: 15, // 🔹 Mantém espaço interno nos dois lados
    paddingLeft: 80, // 🔹 Move o texto um pouco para a direita (ajusta conforme necessário)
    paddingRight: 40, // 🔹 Mantém um pequeno espaço à direita
    textAlign: 'left', // 🔹 Mantém o alinhamento como "left" para respeitar os paddings
  },
  eyeButton: {
    padding: 5,
  },
});

export default RegisterCompanyScreen;