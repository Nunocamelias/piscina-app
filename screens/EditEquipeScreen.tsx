import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Appearance, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Ionicons';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const validatePassword = (password: string) => /^[^\s]{6,}$/.test(password ?? '');

const EditEquipeScreen = ({ route, navigation }: any) => {
  const { equipeId } = route.params;
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nomeequipe: '',
    nome1: '',
    nome2: '',
    matricula: '',
    telefone: '',
    proxima_inspecao: '',
    validade_seguro: '',
    email: '',
    password: '',
  });

  const [userEmpresaid, setUserEmpresaid] = useState<number | null>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [empresaNome, setEmpresaNome] = useState('');

// 🔹 Busca o empresaid do AsyncStorage
useEffect(() => {
  const fetchEmpresaid = async () => {
    try {
      const storedEmpresaid = await AsyncStorage.getItem('empresaid');
      if (!storedEmpresaid) {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        navigation.navigate('Login');
        return;
      }
      setUserEmpresaid(parseInt(storedEmpresaid, 10));
    } catch (error) {
      console.error('Erro ao recuperar empresaid:', error);
      Alert.alert('Erro', 'Não foi possível recuperar o empresaid.');
      navigation.navigate('Login');
    }
  };

  fetchEmpresaid();
}, [navigation]); // ✅ Adiciona `navigation` às dependências



const fetchEquipe = useCallback(async () => {
  if (!userEmpresaid) {
    return; // 🔄 Evita execução desnecessária antes do empresaid estar disponível
  }

  try {
    console.log('[DEBUG] Buscando equipe para ID:', equipeId);

    const equipeResponse = await axios.get(`${Config.API_URL}/equipes/${equipeId}`, {
      params: { empresaid: userEmpresaid },
    });

    console.log('[DEBUG] Dados da equipe recebidos:', equipeResponse.data);

    // 🔹 Busca o usuário associado à equipe (deve retornar um objeto único)
    console.log('[DEBUG] Buscando usuário associado à equipe...');
    const usuarioResponse = await axios.get(`${Config.API_URL}/usuarios`, {
      params: { equipeid: equipeId, empresaid: userEmpresaid },
    });

    console.log('[DEBUG] Dados do usuário recebidos:', usuarioResponse.data);
    setUsuarioId(usuarioResponse.data?.id ?? null);
    
    // 🔹 O endpoint já retorna um objeto, então podemos usar diretamente
    const usuario = usuarioResponse.data || null;

    setForm({
      nomeequipe: equipeResponse.data.nomeequipe,
      nome1: equipeResponse.data.nome1,
      nome2: equipeResponse.data.nome2,
      matricula: equipeResponse.data.matricula,
      telefone: equipeResponse.data.telefone,
      proxima_inspecao: equipeResponse.data.proxima_inspecao,
      validade_seguro: equipeResponse.data.validade_seguro,
      email: usuario?.email || '', // 🔹 Agora o email será preenchido corretamente
      password: '', // 🔹 Mantém o campo da senha vazio por segurança
    });

    setLoading(false); // ✅ Garante que "Carregando..." desapareça apenas uma vez

  } catch (error) {
    console.error('[DEBUG] Erro ao carregar os dados da equipe:', error);
    Alert.alert('Erro', 'Não foi possível carregar os dados da equipe.');
    navigation.goBack();
  }
}, [equipeId, userEmpresaid, navigation]); // ✅ Adiciona `navigation` às dependências

// 🔄 Apenas chama `fetchEquipe` quando `userEmpresaid` estiver disponível
useEffect(() => {
  if (userEmpresaid) {
    fetchEquipe();
  }
}, [userEmpresaid, fetchEquipe]); // ✅ Adiciona `fetchEquipe` às dependências

// 🔹 Busca o nome da empresa do AsyncStorage (sem interferir na lógica principal)
useEffect(() => {
  const fetchEmpresaNome = async () => {
    try {
      const nome = await AsyncStorage.getItem('empresa_nome');
      if (nome) {setEmpresaNome(nome);}
    } catch (error) {
      console.error('Erro ao buscar nome da empresa:', error);
    }
  };

  fetchEmpresaNome();
}, []);

// 🔹 Executa `fetchEquipe` quando `userEmpresaid` estiver carregado
useEffect(() => {
  if (userEmpresaid !== null) {
    fetchEquipe();
  }
}, [userEmpresaid, fetchEquipe]);



  const getColorForDate = (date: string) => {
      if (!date) {return '#FFF';} // Branco por padrão

      const today = moment();
      const targetDate = moment(date);

      const diffDays = targetDate.diff(today, 'days');

      if (diffDays <= 3) {return '#FF6347';} // Vermelho
      if (diffDays <= 15) {return '#FFA500';} // Laranja
      if (diffDays <= 30) {return '#FFD700';} // Amarelo
      return '#FFF'; // Branco (fora do período de alerta)
    };

    const salvarEquipe = async () => {
      if (!userEmpresaid) {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        return;
      }

      try {
        const payloadEquipe = {
          nomeequipe: form.nomeequipe,
          nome1: form.nome1,
          nome2: form.nome2,
          matricula: form.matricula,
          telefone: form.telefone,
          proxima_inspecao: form.proxima_inspecao,
          validade_seguro: form.validade_seguro,
          empresaid: userEmpresaid,
        };

        await axios.put(`${Config.API_URL}/equipes/${equipeId}`, payloadEquipe);

        if (form.password && form.email) {
          if (!validatePassword(form.password)) {
            Alert.alert(
              'Erro',
              'A senha deve ter pelo menos 8 caracteres, incluindo uma letra, um número e um caractere especial.'
            );
            return;
          }

          const usuarioPayload = {
            nome: form.nomeequipe,
            email: form.email,
            senha: form.password,
            tipo_usuario: 'equipe',
            empresaid: userEmpresaid,
            equipeid: equipeId,
          };

          await axios.put(`${Config.API_URL}/usuarios/${usuarioId}`, usuarioPayload);
        }

        Alert.alert('Sucesso', 'Equipe e usuário atualizados com sucesso!');
        navigation.goBack();
      } catch (error) {
        console.error('Erro ao salvar equipe:', error);
        Alert.alert(
          'Erro',
          'Não foi possível atualizar a equipe. Verifique os dados e tente novamente.'
        );
      }
    };




    const apagarEquipe = async () => {
      Alert.alert(
        'Confirmação',
        'Tem certeza de que deseja apagar esta equipe?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Apagar',
            style: 'destructive',
            onPress: async () => {
              try {
                await axios.delete(`${Config.API_URL}/equipes/${equipeId}`);
                await axios.delete(`${Config.API_URL}/usuarios/${equipeId}`);
                Alert.alert('Sucesso', 'Equipe apagada com sucesso!');
                navigation.goBack();
              } catch (error) {
                console.error('Erro ao apagar equipe:', error);
                Alert.alert('Erro', 'Não foi possível apagar a equipe.');
              }
            },
          },
        ]
      );
    };

    const handleChange = (field: string, value: string | boolean) => {
  if (loading) {
    console.warn('⚠️ Tentativa de editar enquanto os dados ainda estão a carregar.');
    return;
  }

  // ✅ Password: remover TODOS os espaços automaticamente
  if (field === 'password' && typeof value === 'string') {
    const semEspacos = value.replace(/\s+/g, '');
    setForm((prev) => ({ ...prev, password: semEspacos }));
    return;
  }

  // ✅ Matrícula: separador inteligente + formato AA-BB-CC
  if (field === 'matricula' && typeof value === 'string') {
    const s = value.toUpperCase();
    const endsWithSep = /[-/.\s]$/.test(s);
    const raw = s.replace(/[^A-Z0-9]/g, '').slice(0, 6);

    let out = '';
    if (raw.length <= 2) out = raw;
    else if (raw.length <= 4) out = `${raw.slice(0, 2)}-${raw.slice(2)}`;
    else out = `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;

    if (endsWithSep && (raw.length === 2 || raw.length === 4) && !out.endsWith('-')) out += '-';

    setForm((prev) => ({ ...prev, matricula: out.slice(0, 8) }));
    return;
  }

  // ✅ Datas (se tiveres no form): separador inteligente AAAA-MM-DD
  if ((field === 'proxima_inspecao' || field === 'validade_seguro') && typeof value === 'string') {
    const s = value.trim();
    const endsWithSep = /[-/.\s]$/.test(s);
    const digits = s.replace(/\D/g, '').slice(0, 8);

    let out = '';
    if (digits.length <= 4) out = digits;
    else if (digits.length <= 6) out = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    else out = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;

    if (endsWithSep && (digits.length === 4 || digits.length === 6) && !out.endsWith('-')) out += '-';

    setForm((prev) => ({ ...prev, [field]: out.slice(0, 10) }));
    return;
  }

  // ✅ Default
  setForm((prev) => ({ ...prev, [field]: value }));
};

  const salvarSenha = async () => {
    console.log('[DEBUG] Iniciando salvarSenha para usuarioId:', usuarioId);

    if (!usuarioId) {
      Alert.alert('Erro', 'ID do usuário não encontrado.');
      return;
    }

    if (!validatePassword(form.password)) {
      Alert.alert(
        'Senha Inválida',
        'A senha deve conter pelo menos 8 caracteres, incluindo letras, números e um caractere especial.'
      );
      return;
    }

    try {
      const payload = {
        nome: form.nomeequipe, // Deve estar preenchido
        email: form.email,     // Deve ser válido
        senha: form.password,  // Deve ser válida
        tipo_usuario: 'equipe',
        equipeid: equipeId,    // Certifique-se de que não é null
        empresaid: userEmpresaid, // Certifique-se de que não é null
      };

      await axios.put(`${Config.API_URL}/usuarios/${usuarioId}`, payload);

      Alert.alert('Sucesso', 'Senha salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar a senha:', error);
      Alert.alert('Erro', 'Não foi possível salvar a senha.');
    }
  };

  return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

      <Text style={styles.title}>Detalhes da Equipa</Text>
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Nome da Equipe"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        value={form.nomeequipe}
        editable={isEditable}
        onChangeText={(value) => handleChange('nomeequipe', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Nome 1"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        value={form.nome1}
        editable={isEditable}
        onChangeText={(value) => handleChange('nome1', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Nome 2"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        value={form.nome2}
        editable={isEditable}
        onChangeText={(value) => handleChange('nome2', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Matrícula"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        value={form.matricula}
        editable={isEditable}
        onChangeText={(value) => handleChange('matricula', value)}
        maxLength={8} // Garante que o campo tenha no máximo 8 caracteres
        autoCapitalize="characters" // Força letras maiúsculas no teclado
        keyboardType="default" // Permite letras e números
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Telefone"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        keyboardType="phone-pad"
        value={form.telefone}
        editable={isEditable}
        onChangeText={(value) => handleChange('telefone', value)}
      />
     <TextInput
        style={[styles.input,{ backgroundColor: getColorForDate(form.proxima_inspecao) }]}
        placeholder="Data da Próxima Inspeção (AAAA-MM-DD)"
        value={form.proxima_inspecao}
        editable={isEditable}
        onChangeText={(value) => handleChange('proxima_inspecao', value)}
      />
     <TextInput
        style={[styles.input,{ backgroundColor: getColorForDate(form.validade_seguro) }]}
        placeholder="Validade do Seguro (AAAA-MM-DD)"
        value={form.validade_seguro}
        editable={isEditable}
        onChangeText={(value) => handleChange('validade_seguro', value)}
      />
     <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Email"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        keyboardType="email-address"
        value={form.email}
        editable={isEditable}
        onChangeText={(value) => handleChange('email', value)}
      />
     <View style={[styles.passwordContainer, !isEditable && styles.readOnly]}>
  <TextInput
    style={styles.passwordInput}
    placeholder="Senha"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    secureTextEntry={!senhaVisivel}
    value={form.password}
    editable={isEditable}
    onChangeText={(value) => { if (isEditable) handleChange('password', value); }}
  />

  <TouchableOpacity
    onPress={() => setSenhaVisivel((v) => !v)}
    style={styles.eyeButton}
    disabled={!isEditable}
  >
    <Icon name={senhaVisivel ? 'eye' : 'eye-off'} size={24} color="#000" />
  </TouchableOpacity>
</View>

     <TouchableOpacity
        style={styles.generateButton}
        onPress={() => {if (!validatePassword(form.password)) {
      Alert.alert(
        'Senha Fraca',
        'A senha deve ter pelo menos 6 caracteres e não pode conter espaços.'
      );
    } else {
      salvarSenha(); // Chama a função para salvar a senha
    }
  }}
>
  <Text style={styles.generateButtonText}>Salvar Senha</Text>
</TouchableOpacity>




      <View style={styles.buttonContainer}>
  <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
    <Text style={styles.buttonText}>Voltar</Text>
  </TouchableOpacity>
  {isEditable ? (
  <TouchableOpacity style={styles.button} onPress={salvarEquipe}>
    <Text style={styles.buttonText}>Salvar</Text>
  </TouchableOpacity>
  ) : (
  <TouchableOpacity style={styles.button} onPress={() => setIsEditable(true)}>
    <Text style={styles.buttonText}>Editar Equipa</Text>
  </TouchableOpacity>
  )}
  <TouchableOpacity style={styles.button} onPress={apagarEquipe}>
    <Text style={styles.buttonText}>Apagar Equipa</Text>
  </TouchableOpacity>
      </View>
        <View style={styles.footer}>
          <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
          <Text style={styles.subTitle}>powered by GESPOOL</Text>
       </View>
    </ScrollView>
   </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
      flexGrow: 1,
      paddingBottom: 70,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: 80, // 🔹 adiciona espaço visível no fim
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      // 🔹 Sombra igual à dos botões
      textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 4,
    },
    input: {
      backgroundColor: '#FFF',
      padding: 10,
      borderRadius: 5,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#CCC',
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4.65,
      elevation: 10, // ← dá profundidade real no Android
    },
    readOnly: {
      backgroundColor: '#EEE',
    },
    volume: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 15,
      color: '#333',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly', // Distribui os botões uniformemente
      marginTop: 20,
      flexWrap: 'wrap', // Permite que os botões sejam quebrados para a próxima linha, se necessário
    },
    button: {
      backgroundColor: '#22b4b4ff', // Azul claro para os botões
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 5, // Espaçamento ao redor de cada botão
      flex: 1, // Faz com que os botões tenham tamanhos proporcionais
      maxWidth: '30%', // Limita a largura máxima de cada botão
      borderWidth: 0, // Adiciona moldura
      borderColor: '#777777', // Cor da moldura preta
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4.65,
      elevation: 10, // ← dá profundidade real no Android
    },
    buttonText: {
      color: '#000', // Preto para o texto
      fontWeight: 'bold',
      fontSize: 16,
    },
    saveButton: {
      backgroundColor: '#22b4b4ff',
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 15,
      width: '100%',
      alignSelf: 'center',
    },
    saveButtonText: {
      color: '#FFF',
      fontWeight: 'bold',
    },
    generateButton: {
      backgroundColor: '#22b4b4ff', // Azul claro
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      width: '100%', // Faz o botão ocupar toda a largura disponível
      marginBottom: 10, // Espaço entre outros elementos
      borderWidth: 0, // Adiciona moldura
      borderColor: '#777777', // Cor da moldura preta
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4.65,
      elevation: 10, // ← dá profundidade real no Android
    },
    generateButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
    },
    footer: {
      alignItems: 'center',
      marginTop: 40, // 🔹 separação do último botão
      marginBottom: 30, // 🔹 espaço extra no fim
    },
    empresaNome: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#000',
    },
    subTitle: {
      fontSize: 12,
      fontStyle: 'italic',
      color: '#444',
      marginTop: 2,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 10,
      paddingHorizontal: 10,
      marginBottom: 15,
      backgroundColor: '#fff',
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 12,
      color: '#000',
    },
    eyeButton: {
      padding: 8,
    },
  });

export default EditEquipeScreen;
