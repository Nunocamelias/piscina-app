import React, { useState, useEffect } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { Appearance } from 'react-native';

const isDarkMode = Appearance.getColorScheme() === 'dark';


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

  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (empresaid) {
          setUserEmpresaid(parseInt(empresaid, 10));
        } else {
          Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
          navigation.navigate('Login');
        }
      } catch (error) {
        console.error('Erro ao recuperar empresaid:', error);
        Alert.alert('Erro', 'Não foi possível recuperar o empresaid.');
        navigation.navigate('Login');
      }
    };

    fetchEmpresaid();
  }, [navigation]);

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  // Função para validar a senha
  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const salvarEquipe = async () => {
    if (!validatePassword(form.password)) {
      Alert.alert(
        'Erro',
        'A senha deve ter pelo menos 8 caracteres, incluindo uma letra, um número e um caractere especial.'
      );
      return;
    }

    // Valida o empresaid antes de prosseguir
    if (!userEmpresaid || isNaN(Number(userEmpresaid))) {
      console.error('Empresaid inválido ou ausente:', userEmpresaid);
      Alert.alert('Erro', 'O ID da empresa não foi encontrado. Por favor, faça login novamente.');
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
        empresaid: Number(userEmpresaid), // Converte para número, se necessário
      };

      console.debug('🔍 Payload enviado para /equipes:', payloadEquipe);

      const responseEquipe = await axios.post(`${Config.API_URL}/equipes`, payloadEquipe);
      console.debug('✅ Resposta do backend para /equipes:', responseEquipe.data);

      const equipeId = responseEquipe.data.equipe?.id; // 🚨 Verifica se realmente retorna um ID

      if (!equipeId) {
        console.error('❌ ERRO: Não foi retornado um ID de equipe.');
        Alert.alert('Erro', 'Erro ao criar equipe. ID não foi gerado.');
        return;
      }

      const payloadUsuario = {
        nome: form.nomeequipe,
        email: form.email,
        senha: form.password,
        equipeid: equipeId,
        empresaid: Number(userEmpresaid),
      };

      console.debug('🔍 Payload enviado para /usuarios:', payloadUsuario);

      const responseUsuario = await axios.post(`${Config.API_URL}/usuarios`, payloadUsuario);
      console.debug('✅ Resposta do backend para /usuarios:', responseUsuario.data);

      Alert.alert('Sucesso', 'Equipe e credenciais adicionadas com sucesso!');
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
    // Ignorar se a string estiver incompleta
    if (!date || date.length !== 10) {
      return false; // Considere como inválida sem emitir avisos
    }

    // Verificar se a data é válida
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Adicionar Equipe</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome da Equipe"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        value={form.nomeequipe}
        onChangeText={(value) => handleChange('nomeequipe', value)}
      />
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
        placeholderTextColor="#888"
        value={form.proxima_inspecao}
        onChangeText={(value) => handleChange('proxima_inspecao', value)}
        onEndEditing={() => {
        if (form.proxima_inspecao && form.proxima_inspecao.length === 10 && !isValidDate(form.proxima_inspecao)) {
        console.warn('A Data fornecida é inválida:', form.proxima_inspecao);
         }
       }}
      />
      <TextInput
         style={[styles.input, { backgroundColor: getColorForDate(form.validade_seguro) }]}
         placeholder="Seguro Válido até (AAAA-MM-DD)"
         placeholderTextColor="#888"
         value={form.validade_seguro}
         onChangeText={(value) => handleChange('validade_seguro', value)}
         onEndEditing={() => {
         if (form.validade_seguro && form.validade_seguro.length === 10 && !isValidDate(form.validade_seguro)) {
         console.warn('A Data fornecida é inválida:', form.validade_seguro);
         }
       }}
      />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        keyboardType="email-address"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        value={form.email}
        onChangeText={(value) => handleChange('email', value)}
      />
      <TextInput
  style={[styles.input, styles.passwordInput]} // 🔥 Aplica um novo estilo específico para senhas
  placeholder="Senha"
  secureTextEntry={true}
  placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
  value={form.password}
  onChangeText={(value) => handleChange('password', value)}
/>


      <TouchableOpacity style={styles.button} onPress={salvarEquipe}>
        <Text style={styles.buttonText}>Salvar Equipe</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: isDarkMode ? '#333' : '#000',
  },
  input: {
    backgroundColor: isDarkMode ? '#FFF' : '#FFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CCC',
    color: isDarkMode ? '#000' : '#000',
  },
  passwordInput: {
    letterSpacing: 1.5, // 🔥 Dá um espaçamento maior para parecer mais uniforme
    fontWeight: 'bold', // 🔥 Garante que os caracteres sejam mais visíveis antes de virarem bolinhas
  },
  button: {
    backgroundColor: '#ADD8E6',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1.5, // Adiciona moldura
    borderColor: '#000', // Cor da moldura preta
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default AddEquipeScreen;
