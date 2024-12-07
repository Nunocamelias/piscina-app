import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import axios from 'axios';

const AddEquipeScreen = ({ navigation }: any) => {
  const [form, setForm] = useState({
    nomeequipe: '',
    nome1: '',
    nome2: '',
    matricula: '',
    telefone: '',
    proximaInspecao: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const salvarEquipe = async () => {
    try {
      const response = await axios.post('http://10.0.2.2:5000/equipes', form); // Ajuste a URL se necessário
      Alert.alert('Sucesso', 'Equipe adicionada com sucesso!');
      navigation.goBack(); // Volta para a lista de equipes
    } catch (error) {
      console.error('Erro ao salvar equipe:', error);
      Alert.alert('Erro', 'Não foi possível salvar a equipe.');
    }
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
        style={styles.input}
        placeholder="Data da Próxima Inspeção (AAAA-MM-DD)"
        value={form.proximaInspecao}
        onChangeText={(value) => handleChange('proximaInspecao', value)}
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
