import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';

const EditEquipeScreen = ({ route, navigation }: any) => {
  const { equipeId } = route.params;
  const [form, setForm] = useState<any>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch equipe data
  useEffect(() => {
    const fetchEquipe = async () => {
      try {
        const response = await axios.get(`${Config.API_URL}/equipes/${equipeId}`);
        setForm(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar equipe:', error);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes da equipe.');
        navigation.goBack();
      }
    };

    fetchEquipe();
  }, [equipeId]);

  const salvarEquipe = async () => {
    try {
      await axios.put(`${Config.API_URL}/equipes/${equipeId}`, form);
      Alert.alert('Sucesso', 'Equipe atualizada com sucesso!');
  
      navigation.navigate('ListaEquipes'); // Retorna à lista e dispara o listener de 'focus'.
    } catch (error) {
      console.error('Erro ao atualizar equipe:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a equipe.');
    }
  };
  
  const apagarEquipe = () => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza de que deseja apagar esta equipe?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`http://10.0.2.2:5000/equipes/${equipeId}`);
              Alert.alert("Sucesso", "Equipe apagada com sucesso!");
              navigation.goBack();
            } catch (error) {
              console.error("Erro ao apagar equipe:", error);
              Alert.alert("Erro", "Não foi possível apagar a equipe.");
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Detalhes da Equipe</Text>
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Nome da Equipe"
        value={form.nomeequipe}
        editable={isEditable}
        onChangeText={(value) => handleChange('nomeequipe', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Nome 1"
        value={form.nome1}
        editable={isEditable}
        onChangeText={(value) => handleChange('nome1', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Nome 2"
        value={form.nome2}
        editable={isEditable}
        onChangeText={(value) => handleChange('nome2', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Matrícula"
        value={form.matricula}
        editable={isEditable}
        onChangeText={(value) => handleChange('matricula', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Telefone"
        keyboardType="phone-pad"
        value={form.telefone}
        editable={isEditable}
        onChangeText={(value) => handleChange('telefone', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Próxima Inspeção (AAAA-MM-DD)"
        value={form.proxima_inspecao}
        editable={isEditable}
        onChangeText={(value) => handleChange('proxima_inspecao', value)}
      />
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
      backgroundColor: '#D3D3D3',
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
      },
    buttonText: {
      color: '#000', // Preto para o texto
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

export default EditEquipeScreen;


