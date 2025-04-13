import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity, Appearance } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import Icon from 'react-native-vector-icons/Ionicons';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false); // Estado para alternar visibilidade da senha

  const handleLogin = async () => {
    try {
      console.log('Iniciando login com:', { email, senha });

      // 🔹 Validação do email antes de enviar o login
      if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/.test(email)) {
        Alert.alert('Erro', 'Insira um email válido.');
        return;
      }

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

      {/* 🔹 Input de Email com Validação */}
      <TextInput
        style={isDarkMode ? styles.inputDark : styles.inputLight}
        placeholder="Email"
        placeholderTextColor={isDarkMode ? '#BBBBBB' : '#666666'}
        keyboardType="email-address"
        autoCapitalize="none" // 🔹 Impede letras maiúsculas
        value={email}
        onChangeText={(text) => {
          const formattedEmail = text.toLowerCase().replace(/[^a-z0-9@._-]/g, ''); // 🔹 Remove caracteres inválidos
          setEmail(formattedEmail);
        }}
      />

      {/* 🔹 Input de Senha com Botão "Olho" */}
      <View style={styles.passwordContainer}>
  {/* 🔹 Caixa interna onde fica a senha */}
  <TextInput
    style={styles.passwordInput}
    placeholder="Senha"
    placeholderTextColor="#BBBBBB"
    secureTextEntry={!senhaVisivel}
    value={senha}
    onChangeText={setSenha}
  />

  {/* 🔹 Botão do olho/macaco dentro da caixa */}
  <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)} style={styles.eyeButton}>
  <Icon name={senhaVisivel ? 'eye' : 'eye-off'} size={24} color="#000" />
</TouchableOpacity>
</View>



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
    marginBottom: 20,
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
    padding: 12,
    height: 45,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    height: 45, // 🔹 Controla a altura do campo de senha
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
    paddingLeft: 32, // 🔹 Move o texto um pouco para a direita (ajusta conforme necessário)
    paddingRight: 0, // 🔹 Mantém um pequeno espaço à direita
    textAlign: 'center', // 🔹 Mantém o alinhamento como "left" para respeitar os paddings
  },

    // 🔹 Caixa interna (80% da largura) com fundo escuro e bordas arredondadas
    eyeButton: {
    padding: 5, // 🔹 Aumenta a área de clique
  },
  eyeText: {
    fontSize: 18, // 🔹 Ajusta o tamanho do ícone de olho
  },
});

export default LoginScreen;