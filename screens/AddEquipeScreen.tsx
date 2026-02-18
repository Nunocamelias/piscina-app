import React, { useState, useEffect } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, View, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { Appearance } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // ⬅️ NOVO
import Icon from 'react-native-vector-icons/Ionicons';

const isDarkMode = Appearance.getColorScheme() === 'dark';
type TipoUsuario = 'admin' | 'equipa_manutencao' | 'equipa_tecnica' | 'orcamentacao' | 'contabilidade';


const AddEquipeScreen = ({ navigation }: any) => {
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
  const [empresaNome, setEmpresaNome] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('equipa_manutencao');
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  useEffect(() => {
  const fetchEmpresaid = async () => {
    try {
      const empresaid = await AsyncStorage.getItem('empresaid');
      if (empresaid) {
        setUserEmpresaid(parseInt(empresaid, 10));
      } else {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        navigation.navigate('Login');
        return; // evita continuar se não houver empresaid
      }

      // 🔹 Busca o nome da empresa (sem interferir na lógica original)
      const nome = await AsyncStorage.getItem('empresa_nome');
      if (nome) {
        setEmpresaNome(nome);
      }
    } catch (error) {
      console.error('Erro ao recuperar empresaid ou nome:', error);
      Alert.alert('Erro', 'Não foi possível recuperar os dados da empresa.');
      navigation.navigate('Login');
    }
  };

  fetchEmpresaid();
}, [navigation]);


  type FormFields = keyof typeof form;

const formatDateInput = (input: string) => {
  const s = (input ?? '').trim();

  // Se o utilizador acabou de escrever um separador ( -, /, ., espaço ),
  // vamos respeitar isso e mostrar o hífen quando fizer sentido.
  const endsWithSep = /[-/.\s]$/.test(s);

  // Mantém só os dígitos para construir a data
  const digits = s.replace(/\D/g, '').slice(0, 8); // YYYYMMDD

  let out = '';
  if (digits.length <= 4) {
    out = digits;
  } else if (digits.length <= 6) {
    out = `${digits.slice(0, 4)}-${digits.slice(4)}`;
  } else {
    out = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  // ✅ Se o utilizador escreveu um separador depois do ano (YYYY) ou do mês (YYYYMM),
  // mostra já o hífen, mesmo sem ter escrito o próximo número.
  if (endsWithSep && (digits.length === 4 || digits.length === 6) && !out.endsWith('-')) {
    out += '-';
  }

  return out.slice(0, 10); // YYYY-MM-DD
};

const formatMatriculaInput = (input: string) => {
  const s = (input ?? '').toUpperCase();

  // Se acabou de escrever um separador, vamos respeitar e mostrar hífen quando fizer sentido
  const endsWithSep = /[-/.\s]$/.test(s);

  // Só letras/números
  const raw = s.replace(/[^A-Z0-9]/g, '').slice(0, 6); // AABBCC (6 chars)

  let out = '';
  if (raw.length <= 2) out = raw;
  else if (raw.length <= 4) out = `${raw.slice(0, 2)}-${raw.slice(2)}`;
  else out = `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;

  // ✅ Se escreveu separador após 2 ou 4 chars, força o hífen já
  if (endsWithSep && (raw.length === 2 || raw.length === 4) && !out.endsWith('-')) {
    out += '-';
  }

  return out.slice(0, 8); // "AA-BB-CC" = 8
};

const handleChange = (field: FormFields, value: string) => {

  // ✅ 1) Password – remover TODOS os espaços automaticamente
  if (field === 'password') {
    const semEspacos = (value ?? '').replace(/\s+/g, '');
    if (semEspacos !== form.password) {
      setForm((prev) => ({ ...prev, password: semEspacos }));
    }
    return;
  }

  // ✅ 2) Matrícula
  if (field === 'matricula') {
    const formatted = formatMatriculaInput(value);
    if (formatted !== form.matricula) {
      setForm((prev) => ({ ...prev, matricula: formatted }));
    }
    return;
  }

  // ✅ 3) Datas
  if (field === 'proxima_inspecao' || field === 'validade_seguro') {
    const formatted = formatDateInput(value);
    if (formatted !== form[field]) {
      setForm((prev) => ({ ...prev, [field]: formatted }));
    }
    return;
  }

  // ✅ 4) Restantes campos
  if (value !== form[field]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }
};


  // Função para validar a senha
  const validatePassword = (password: string) => (password ?? '').length >= 6;



  const salvarEquipe = async () => {

  // 1️⃣ Password válida?
  if (!validatePassword(form.password)) {
    Alert.alert(
      'Erro',
      'A senha deve ter pelo menos 6 caracteres.'
    );
    return;
  }

  // 2️⃣ Validar nome
  if (!form.nomeequipe.trim()) {
    Alert.alert('Erro', 'Insira o nome.');
    return;
  }

  // 3️⃣ Criar email limpo
  const emailLimpo = form.email.trim().toLowerCase();

  // 4️⃣ Validar email (AQUI!)
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/.test(emailLimpo)) {
    Alert.alert('Erro', 'Insira um email válido.');
    return;
  }

  // 5️⃣ Validar empresaid
  if (!userEmpresaid || isNaN(Number(userEmpresaid))) {
    Alert.alert('Erro', 'O ID da empresa não foi encontrado. Por favor, faça login novamente.');
    return;
  }

  try {
    // 👉 Caso 1: Equipa de manutenção / equipa técnica
    if (tipoUsuario === 'equipa_manutencao' || tipoUsuario === 'equipa_tecnica') {
      const payloadEquipe = {
        nomeequipe: form.nomeequipe,
        nome1: form.nome1,
        nome2: form.nome2,
        matricula: form.matricula,
        telefone: form.telefone,
        proxima_inspecao: form.proxima_inspecao,
        validade_seguro: form.validade_seguro,
        empresaid: Number(userEmpresaid),
      };

      console.debug(' Payload enviado para /equipes: 🔍', payloadEquipe);
      const responseEquipe = await axios.post(`${Config.API_URL}/equipes`, payloadEquipe);
      console.debug(' Resposta do backend para /equipes: ✅', responseEquipe.data);

      const equipeId = responseEquipe.data.equipe?.id;
      if (!equipeId) {
        console.error(' ERRO: Não foi retornado um ID de equipe. ❌');
        Alert.alert('Erro', 'Erro ao criar equipe. ID não foi gerado.');
        return;
      }

      const payloadUsuario = {
        nome: form.nomeequipe,
        email: form.email,
        senha: form.password,
        equipeid: equipeId,
        empresaid: Number(userEmpresaid),
        tipo_usuario: tipoUsuario, // ⬅️ MUITO IMPORTANTE
      };

      console.debug(' Payload enviado para /usuarios: 🔍', payloadUsuario);
      const responseUsuario = await axios.post(`${Config.API_URL}/usuarios`, payloadUsuario);
      console.debug(' Resposta do backend para /usuarios: ✅', responseUsuario.data);

      Alert.alert('Sucesso', 'Equipa e credenciais adicionadas com sucesso!');
      navigation.goBack();
      return;
    }

    // 👉 Caso 2: Admin / Orçamentação / Contabilidade (NÃO cria equipa)
    const payloadUsuario = {
      nome: form.nomeequipe,         // aqui é o nome do utilizador
      email: form.email,
      senha: form.password,
      equipeid: null,               // sem equipa associada
      empresaid: Number(userEmpresaid),
      tipo_usuario: tipoUsuario,    // 'admin', 'orcamentacao', 'contabilidade', etc.
    };

    console.debug(' Payload enviado para /usuarios (sem equipe): 🔍', payloadUsuario);
    const responseUsuario = await axios.post(`${Config.API_URL}/usuarios`, payloadUsuario);
    console.debug(' Resposta do backend para /usuarios: ✅', responseUsuario.data);

    Alert.alert('Sucesso', 'Utilizador criado com sucesso!');
    navigation.goBack();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Erro do backend:', error.response?.data);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar dados.');
    } else {
      console.error('Erro inesperado:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado.');
    }
  }
};

  const isValidDate = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const [y, m, d] = date.split('-').map(Number);
  if (m < 1 || m > 12) return false;

  const maxDay = new Date(y, m, 0).getDate(); // último dia do mês
  return d >= 1 && d <= maxDay;
};


   const getColorForDate = (date: string | null): string => {
    // Ignorar valores nulos ou incompletos
    if (!date || date.length !== 10) {return '#FFF';} // Branco por padrão

    const targetDate = moment(date, 'YYYY-MM-DD', true);
    if (!targetDate.isValid()) {
      return '#FFF'; // Branco para datas inválidas
    }

    const today = moment();
    const diffDays = targetDate.diff(today, 'days');

    if (diffDays <= 3) {return '#FF6347';} // Vermelho
    if (diffDays <= 15) {return '#FFA500';} // Laranja
    if (diffDays <= 30) {return '#FFD700';} // Amarelo
    return '#CCFFCC'; // Verde (fora do período de alerta)
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

    <Text style={styles.title}>Adicionar Utilizador / Equipa</Text>

    {/* Picker do tipo de utilizador */}
    <View style={[styles.input, { paddingHorizontal: 0, paddingVertical: 0 }]}>
      <Picker
        selectedValue={tipoUsuario}
        onValueChange={(value) => setTipoUsuario(value as TipoUsuario)}
      >
        <Picker.Item label="Equipa de manutenção" value="equipa_manutencao" />
        <Picker.Item label="Equipa técnica" value="equipa_tecnica" />
        <Picker.Item label="Administração" value="admin" />
        <Picker.Item label="Orçamentação" value="orcamentacao" />
        <Picker.Item label="Contabilidade" value="contabilidade" />
      </Picker>
    </View>

    {/* Nome (serve para equipa ou utilizador) */}
    <TextInput
      style={styles.input}
      placeholder={
        tipoUsuario === 'equipa_manutencao' || tipoUsuario === 'equipa_tecnica'
          ? 'Nome da Equipa'
          : 'Nome do Utilizador'
      }
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      value={form.nomeequipe}
      onChangeText={(value) => handleChange('nomeequipe', value)}
    />

    {/* Campos só para equipas (nomes, matrícula, datas, etc.) */}
    {(tipoUsuario === 'equipa_manutencao' || tipoUsuario === 'equipa_tecnica') && (
      <>
        <TextInput
          style={styles.input}
          placeholder="Nome 1"
          placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
          value={form.nome1}
          onChangeText={(value) => handleChange('nome1', value)}
        />

        <TextInput
          style={styles.input}
          placeholder="Nome 2"
          placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
          value={form.nome2}
          onChangeText={(value) => handleChange('nome2', value)}
        />

        <TextInput
          style={styles.input}
          placeholder="Matrícula do Veículo"
          placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
          value={form.matricula}
          onChangeText={(value) => handleChange('matricula', value)}
          maxLength={8}
          autoCapitalize="characters"
          keyboardType="default"
        />

        <TextInput
          style={styles.input}
          placeholder="Número de Telefone"
          keyboardType="phone-pad"
          placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
          value={form.telefone}
          onChangeText={(value) => handleChange('telefone', value)}
        />

        <TextInput
          style={[styles.input, { backgroundColor: getColorForDate(form.proxima_inspecao) }]}
          placeholder="Data da Próxima Inspeção (AAAA-MM-DD)"
          placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
          value={form.proxima_inspecao}
          onChangeText={(value) => handleChange('proxima_inspecao', value)}
          onEndEditing={() => {
            if (
              form.proxima_inspecao &&
              form.proxima_inspecao.length === 10 &&
              !isValidDate(form.proxima_inspecao)
            ) {
              console.warn('A Data fornecida é inválida:', form.proxima_inspecao);
            }
          }}
        />

        <TextInput
          style={[styles.input, { backgroundColor: getColorForDate(form.validade_seguro) }]}
          placeholder="Seguro Válido até (AAAA-MM-DD)"
          placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
          value={form.validade_seguro}
          onChangeText={(value) => handleChange('validade_seguro', value)}
          onEndEditing={() => {
            if (
              form.validade_seguro &&
              form.validade_seguro.length === 10 &&
              !isValidDate(form.validade_seguro)
            ) {
              console.warn('A Data fornecida é inválida:', form.validade_seguro);
            }
          }}
        />
      </>
    )}

    {/* Email – comum a todos os tipos */}
    <TextInput
      style={styles.input}
      placeholder="E-mail"
      keyboardType="email-address"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      value={form.email}
      onChangeText={(value) => handleChange('email', value)}
    />

    {/* Password – comum a todos os tipos */}
    <View style={styles.passwordContainer}>
  <TextInput
    style={styles.passwordInput}
    placeholder="Senha - Mínimo 6 caracteres"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    secureTextEntry={!senhaVisivel}
    value={form.password}
    onChangeText={(value) => handleChange('password', value)}
  />

  <TouchableOpacity
    onPress={() => setSenhaVisivel((v) => !v)}
    style={styles.eyeButton}
  >
    <Icon name={senhaVisivel ? 'eye' : 'eye-off'} size={24} color="#000" />
  </TouchableOpacity>
</View>


    <TouchableOpacity style={styles.button} onPress={salvarEquipe}>
      <Text style={styles.buttonText}>
        {tipoUsuario === 'equipa_manutencao' || tipoUsuario === 'equipa_tecnica'
          ? 'Salvar Equipa'
          : 'Salvar Utilizador'}
      </Text>
    </TouchableOpacity>

    {/* Rodapé com nome da empresa */}
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
    flexGrow: 1,
    padding: 20,
    paddingBottom: 70,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: isDarkMode ? '#333' : '#000',
    // 🔹 Sombra igual à dos botões
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  input: {
    backgroundColor: isDarkMode ? '#FFF' : '#FFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CCC',
    color: isDarkMode ? '#000' : '#000',
    // 🔹 Sombra 3D leve e elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10, // ← dá profundidade real no Android
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#000',
  },
  button: {
    backgroundColor: '#22b4b4ff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
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
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
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
  eyeButton: {
    padding: 8,
  },
});

export default AddEquipeScreen;
