import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const AddEquipeScreen = ({ navigation }: any) => {
  const [form, setForm] = useState({
    nomeequipe: '',
    nome1: '',
    nome2: '',
    matricula: '',
    telefone: '',
    proximaInspecao: '',
    validadeSeguro: '', // Novo campo
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

  const salvarEquipe = async () => {
    if (!userEmpresaid) {
      Alert.alert('Erro', 'Empresaid não definido. Faça login novamente.');
      return;
    }

    try {
      const payload = { ...form, empresaid: userEmpresaid };
      console.log('Enviando dados ao backend:', payload);
      const response = await axios.post(`${Config.API_URL}/equipes`, payload);
      Alert.alert('Sucesso', 'Equipe adicionada com sucesso!');
      navigation.goBack(); // Volta para a lista de equipes
    } catch (error) {
      console.error('Erro ao salvar equipe:', error);
      Alert.alert('Erro', 'Não foi possível salvar a equipe.');
    }
  };

  const getColorForDate = (date: string) => {
    if (!date) return '#FFF'; // Branco por padrão

    const today = moment();
    const targetDate = moment(date);

    const diffDays = targetDate.diff(today, 'days');

    if (diffDays <= 3) return '#FF6347'; // Vermelho
    if (diffDays <= 15) return '#FFA500'; // Laranja
    if (diffDays <= 30) return '#FFD700'; // Amarelo
    return '#FFF'; // Branco (fora do período de alerta)
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Adicionar Equipe</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome da Equipe"
        value={form.nomeequipe}
        onChangeText={(value) => handleChange('nomeequipe', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Nome 1"
        value={form.nome1}
        onChangeText={(value) => handleChange('nome1', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Nome 2"
        value={form.nome2}
        onChangeText={(value) => handleChange('nome2', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Matrícula do Veículo"
        value={form.matricula}
        onChangeText={(value) => handleChange('matricula', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Número de Telefone"
        keyboardType="phone-pad"
        value={form.telefone}
        onChangeText={(value) => handleChange('telefone', value)}
      />
      <TextInput
        style={[
          styles.input,
          { backgroundColor: getColorForDate(form.proximaInspecao) }, // Aplica cor com base na lógica
        ]}
        placeholder="Data da Próxima Inspeção (AAAA-MM-DD)"
        value={form.proximaInspecao}
        onChangeText={(value) => handleChange('proximaInspecao', value)}
      />
      <TextInput
        style={[
          styles.input,
          { backgroundColor: getColorForDate(form.validadeSeguro) }, // Aplica cor com base na lógica
        ]}
        placeholder="Validade do Seguro (AAAA-MM-DD)"
        value={form.validadeSeguro}
        onChangeText={(value) => handleChange('validadeSeguro', value)}
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
    backgroundColor: '#D3D3D3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  input: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  button: {
    backgroundColor: '#ADD8E6',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default AddEquipeScreen;
