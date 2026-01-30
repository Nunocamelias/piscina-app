import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity, Appearance, ActivityIndicator, Pressable, Image } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import Icon from 'react-native-vector-icons/Ionicons';
import DeviceInfo from 'react-native-device-info';
import * as Keychain from 'react-native-keychain';

const WATERMARK = require('../assets/images/logo-watermark.png'); 
// ajusta o caminho conforme a tua estrutura


const isDarkMode = Appearance.getColorScheme() === 'dark';
const appVersion = DeviceInfo.getVersion();      // ex: "0.9.1"

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false); // Estado para alternar visibilidade da senha
  const [isLoading, setIsLoading] = useState(false);
  const [lembrarEmail, setLembrarEmail] = useState(true);
  const [guardarSenha, setGuardarSenha] = useState(false);

  useEffect(() => {
  const carregarCredenciais = async () => {
    try {
      // 1) Email guardado (UX)
      const lastEmail = await AsyncStorage.getItem('lastEmail');
      if (lastEmail) setEmail(lastEmail);

      // 2) Preferências
      const prefGuardar = await AsyncStorage.getItem('guardarSenha');
      const guardar = prefGuardar === '1';
      setGuardarSenha(guardar);

      // 3) Password segura (Keychain)
      if (guardar) {
        const creds = await Keychain.getGenericPassword({ service: 'gespool_login' });
        if (creds) {
          // creds.username pode ser o email que guardámos, mas tu já tens o email separado
          setSenha(creds.password || '');
        }
      }
    } catch (e) {
      console.log('⚠️ Falha a carregar credenciais:', e);
    }
  };

  carregarCredenciais();
}, []);

  const handleLogin = async () => {
  if (isLoading) return;          // ✅ evita duplo clique
  setIsLoading(true);             // ✅ liga loading logo aqui

  try {
    const emailLimpo = email.trim().toLowerCase();
    console.log('Iniciando login com:', { email: emailLimpo, senha });

    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/.test(emailLimpo)) {
      Alert.alert('Erro', 'Insira um email válido.');
      return;
    }

    const response = await axios.post(
      `${Config.API_URL}/login`,
      { email: emailLimpo, senha },
      { timeout: 12000 } // ✅ 12s
    );

    const { token, user } = response.data;
    console.log('✅ LOGIN user recebido:', user);
    console.log('✅ LOGIN user.id:', user?.id, 'typeof:', typeof user?.id);

    if (!user?.empresaid) {
      throw new Error('Empresaid não encontrado no servidor.');
    }

    // ✅ Guardar email (recomendado)
    if (lembrarEmail) {
      await AsyncStorage.setItem('lastEmail', emailLimpo);
    } else {
      await AsyncStorage.removeItem('lastEmail');
    }

    // ✅ Guardar preferência
    await AsyncStorage.setItem('guardarSenha', guardarSenha ? '1' : '0');

    // ✅ Guardar senha em Keychain (NUNCA em AsyncStorage)
    if (guardarSenha) {
      await Keychain.setGenericPassword(emailLimpo, senha, {
        service: 'gespool_login',
      });
    } else {
      await Keychain.resetGenericPassword({ service: 'gespool_login' });
    }

    // Guardar info base
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('empresaid', String(user.empresaid));
    await AsyncStorage.setItem('tipo_usuario', user.tipo_usuario || '');
    await AsyncStorage.setItem('userId', String(user.id));
    await AsyncStorage.setItem('userNome', user.nome || '');

    console.log('🧪 STORAGE (logo após setItem):', {
      empresaid: await AsyncStorage.getItem('empresaid'),
      tipo_usuario: await AsyncStorage.getItem('tipo_usuario'),
      userId: await AsyncStorage.getItem('userId'),
      userNome: await AsyncStorage.getItem('userNome'),
    });

    const userType = user.tipo_usuario;
    const equipeId = user.equipeId;

    // 🔁 Roteamento por tipo de utilizador
    if (userType === 'admin') {
      navigation.navigate('Home');
      return;
    }

    if (userType === 'equipa_manutencao' || userType === 'equipe') {
      if (!equipeId) {
        Alert.alert('Erro', 'ID da equipe não encontrado para este utilizador.');
        return;
      }

      navigation.navigate('EquipeHome', {
        equipeId: equipeId,
        equipeNome: user.nome,
      });
      return;
    }

    if (userType === 'equipa_tecnica') {
      if (!equipeId) {
        Alert.alert('Erro', 'ID da equipa técnica não encontrado para este utilizador.');
        return;
      }

      navigation.navigate('EquipeTecHome', {
        equipeId: equipeId,
        equipeNome: user.nome,
      });
      return;
    }

    if (userType === 'orcamentacao') {
      navigation.navigate('OrcamentacaoHome', {
        userId: user.id,
        userNome: user.nome,
      });
      return;
    }

    if (userType === 'contabilidade') {
      navigation.navigate('ContabilidadeHome', {
        userId: user.id,
        userNome: user.nome,
      });
      return;
    }

    Alert.alert('Erro', `Tipo de utilizador desconhecido: ${userType || 'indefinido'}`);
  } catch (error: any) {
    console.log('ERRO NO LOGIN:', error);

    if (axios.isAxiosError(error)) {
      const code = error.code; // ex: 'ECONNABORTED'
      const msgServer = error.response?.data?.error;

      // ✅ TIMEOUT
      if (code === 'ECONNABORTED') {
        Alert.alert(
          'Sem ligação',
          'Não foi possível ligar ao servidor (timeout). Verifique a internet e tente novamente.'
        );
        return;
      }

      // ✅ SEM RESPOSTA (servidor off / sem net)
      if (!error.response) {
        Alert.alert(
          'Sem ligação',
          'Não foi possível ligar ao servidor. Verifique a internet e tente novamente.'
        );
        return;
      }

      // ✅ ERRO do servidor (401 etc)
      Alert.alert('Erro', msgServer || 'Credenciais inválidas.');
      return;
    }

    Alert.alert('Erro', 'Algo deu errado. Tente novamente.');
  } finally {
    setIsLoading(false); // ✅ ISTO resolve a cobrinha presa
  }
};


  return (
    <View style={styles.container}>

       {/* ✅ Marca de água (fica atrás de tudo) */}
    <Image
      source={WATERMARK}
      resizeMode="contain"
      style={styles.watermark}
    />
    <View style={{ position: 'relative', marginBottom: 20 }}>
  <Text style={styles.titleShadow}>GESPOOL</Text>
  <Text style={styles.titleLight}>GESPOOL</Text>
</View>
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
{/* ✅ Opções de Login (perto da senha) */}
<View style={styles.optionsRow}>
  <Pressable
    onPress={() => setLembrarEmail((v) => !v)}
    style={styles.optionItem}
    hitSlop={10}
  >
    <Text style={styles.checkbox}>{lembrarEmail ? '☑' : '☐'}</Text>
    <Text style={styles.optionText}>Lembrar email</Text>
  </Pressable>

  <View style={{ width: 18 }} />

  <Pressable
    onPress={() => setGuardarSenha((v) => !v)}
    style={styles.optionItem}
    hitSlop={10}
  >
    <Text style={styles.checkbox}>{guardarSenha ? '☑' : '☐'}</Text>
    <Text style={styles.optionText}>Guardar senha</Text>
  </Pressable>
</View>

{/* ✅ Esqueci-me da palavra-passe */}
<TouchableOpacity
  style={styles.forgotLink}
  onPress={() => Alert.alert('Recuperar acesso', 'Por agora, contacte a administração.')}
>
  <Text style={styles.forgotText}>Esqueci-me da palavra-passe</Text>
</TouchableOpacity>

      <TouchableOpacity
  style={[styles.button, isLoading && { opacity: 0.7 }]}
  onPress={handleLogin}
  disabled={isLoading}
>
  <Text style={styles.buttonText}>
    {isLoading ? 'A entrar...' : 'Entrar'}
  </Text>
</TouchableOpacity>



      <TouchableOpacity onPress={() => navigation.navigate('RegisterCompany')}>
        <Text style={isDarkMode ? styles.registerTextDark : styles.registerTextLight}>
          Novo Registo de Empresa
        </Text>
      </TouchableOpacity>
      <Text style={styles.versionText}>
        V{appVersion}
        </Text>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#D3D3D3' : '#D3D3D3',
    paddingHorizontal: 20,
    paddingTop: 140,
  },
  titleShadow: {
    position: 'absolute',
    top: 3,
    left: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    opacity: 0.15,
  },
  titleLight: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 0,
    color: '#000',
    opacity: 0.60,
     // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10,
  },
  titleDark: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 0,
    color: '#333',
    opacity: 0.80,
     // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10,
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
    borderWidth: 0,
    borderColor: '#000',
    padding: 10,
    height: 50,
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: '#333',
    color: '#BBBBBB',
    width: '80%',
    fontSize: 16,
    textAlign: 'center',
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  inputDark: {
    borderWidth: 0,
    borderColor: '#000',
    padding: 10,
    height: 50,
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: '#333',
    color: '#BBBBBB',
    width: '80%',
    fontSize: 16,
    textAlign: 'center',
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  button: {
    backgroundColor: '#22b4b4ff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 20,
    marginTop: 15,
    width: '80%',
    alignItems: 'center',
    height: 50,
    // 🔹 Remove o contorno preto
    borderWidth: 0,
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
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
    height: 50, // 🔹 Controla a altura do campo de senha
    borderWidth: 0,
    marginBottom: 0,
    borderColor: '#000',
    borderRadius: 25,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingHorizontal: 0,
    justifyContent: 'space-between',
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },

  passwordInput: {
    flex: 1,
    height: 50,
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
  versionText: {
    position: 'absolute',
    bottom: 50,          // 👈 aqui controlas a altura
    alignSelf: 'center',
    fontSize: 12,
    color: '#666',
    opacity: 0.8,
},
optionsRow: {
  marginTop: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

optionItem: {
  flexDirection: 'row',
  alignItems: 'center',
},

checkbox: {
  fontSize: 16,
  marginRight: 6,
},

optionText: {
  fontSize: 13,
  color: '#333',
},

forgotLink: {
  marginTop: 8,
  alignSelf: 'center',
},

forgotText: {
  fontSize: 13,
  color: '#333',
  textDecorationLine: 'underline',
},

buttonDisabled: {
  opacity: 0.6,
},
watermark: {
  position: 'absolute',
  alignSelf: 'center',
  top: 40,            // ajusta (90–130 costuma ficar bem)
  width: 280,         // ajusta
  height: 280,        // ajusta
  opacity: 0.08,      // 0.06–0.12 (marca d’água discreta)
},


});

export default LoginScreen;
