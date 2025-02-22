import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Appearance } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const validatePassword = (password: string) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

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

  useEffect(() => {
    const fetchEmpresaid = async () => {
      const storedEmpresaid = await AsyncStorage.getItem('empresaid');
      if (storedEmpresaid) {
        setUserEmpresaid(parseInt(storedEmpresaid, 10));
      } else {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        navigation.navigate('Login');
      }
    };

    fetchEmpresaid();
  }, []);

  useEffect(() => {
    const fetchDados = async () => {
      await fetchEquipe();
    };
    fetchDados();
  }, [equipeId]);


  // Fetch equipe data

  const fetchEquipe = async () => {
    console.log('[DEBUG] Iniciando fetchEquipe para equipeId:', equipeId);

    try {
      const empresaid = await AsyncStorage.getItem('empresaid');
      if (!empresaid) {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        navigation.navigate('Login');
        return;
      }

      console.log('[DEBUG] Empresaid carregado do AsyncStorage:', empresaid);

      // 🔹 Busca os dados da equipe
      const equipeResponse = await axios.get(`${Config.API_URL}/equipes/${equipeId}`, {
        params: { empresaid: parseInt(empresaid, 10) },
      });

      console.log('[DEBUG] Status da resposta da equipe:', equipeResponse.status);
      console.log('[DEBUG] Dados da equipe recebidos:', equipeResponse.data);

      // ✅ Armazena os dados da equipe antes de continuar
      setForm({
        nomeequipe: equipeResponse.data.nomeequipe,
        nome1: equipeResponse.data.nome1,
        nome2: equipeResponse.data.nome2,
        matricula: equipeResponse.data.matricula,
        telefone: equipeResponse.data.telefone,
        proxima_inspecao: equipeResponse.data.proxima_inspecao,
        validade_seguro: equipeResponse.data.validade_seguro,
        email: '',
        password: '',
      });

      // 🔹 Agora busca o usuário associado à equipe
      console.log('[DEBUG] Fazendo requisição para buscar usuário associado à equipe...');
      const usuarioResponse = await axios.get(`${Config.API_URL}/usuarios`, {
        params: { equipeid: equipeId, empresaid: parseInt(empresaid, 10) },
      });

      console.log('[DEBUG] Status da resposta do usuário:', usuarioResponse.status);
      console.log('[DEBUG] Dados do usuário recebidos:', usuarioResponse.data);

      if (!usuarioResponse.data || usuarioResponse.data.length === 0) {
        console.error('[DEBUG] Nenhum usuário encontrado para esta equipe.');
        Alert.alert('Erro', 'Nenhum usuário associado à equipe encontrado.');
        return;
      }

      setForm((prevForm) => ({
        ...prevForm,
        email: usuarioResponse.data.email || '',
      }));

      setUsuarioId(usuarioResponse.data.id);
    } catch (error) {
      console.error('[DEBUG] Erro ao carregar os dados da equipe ou usuário:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da equipe.');
      navigation.goBack();
    } finally {
      setLoading(false); // ✅ Garante que "Carregando..." desapareça
    }

  };



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
    setForm({ ...form, [field]: value });
  };

  if (loading || !form) {
    return (
      <View style={styles.container}>
        <Text>Carregando...</Text>
      </View>
    );
  }

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Detalhes da Equipe</Text>
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
     <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Senha"
        placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
        secureTextEntry
        value={form.password}
        editable={isEditable}
        onChangeText={(value) => {if (isEditable) {handleChange('password', value);}}}
      />
     <TouchableOpacity
        style={styles.generateButton}
        onPress={() => {if (!validatePassword(form.password)) {
      Alert.alert(
        'Senha Fraca',
        'A senha deve conter pelo menos 8 caracteres, incluindo letras, números e um caractere especial.'
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
      <Text style={styles.buttonText}>Editar Equipe</Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity style={styles.button} onPress={apagarEquipe}>
    <Text style={styles.buttonText}>Apagar Equipe</Text>
  </TouchableOpacity>
</View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
      flexGrow: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      backgroundColor: '#FFF',
      padding: 10,
      borderRadius: 5,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#CCC',
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
        backgroundColor: '#ADD8E6', // Azul claro para os botões
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 5, // Espaçamento ao redor de cada botão
        flex: 1, // Faz com que os botões tenham tamanhos proporcionais
        maxWidth: '30%', // Limita a largura máxima de cada botão
        borderWidth: 1.5, // Adiciona moldura
        borderColor: '#000', // Cor da moldura preta
      },
      buttonText: {
        color: '#000', // Preto para o texto
        fontWeight: 'bold',
        fontSize: 16,
      },
      saveButton: {
        backgroundColor: '#ADD8E6',
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
        backgroundColor: '#ADD8E6', // Azul claro
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%', // Faz o botão ocupar toda a largura disponível
        marginBottom: 10, // Espaço entre outros elementos
        borderWidth: 1.5, // Adiciona moldura
        borderColor: '#000', // Cor da moldura preta
    },
    generateButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
    },

  });

export default EditEquipeScreen;
