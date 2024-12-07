import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';

const EditClienteScreen = ({ route, navigation }: any) => {
  const { clienteId } = route.params;
  const [form, setForm] = useState<any>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch cliente data
  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const response = await axios.get(`http://10.0.2.2:5000/clientes/${clienteId}`);
        setForm(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes do cliente.');
        navigation.goBack();
      }
    };

    fetchCliente();
  }, [clienteId]);

  // Atualiza o volume ao alterar os campos
  useEffect(() => {
    if (form) {
      const comprimento = parseFloat(form.comprimento) || 0;
      const largura = parseFloat(form.largura) || 0;
      const profundidade = parseFloat(form.profundidade_media) || 0;

      const volumeCalculado = (comprimento * largura * profundidade).toFixed(2); // 2 casas decimais
      setForm((prevForm: any) => ({ ...prevForm, volume: volumeCalculado }));
    }
  }, [form?.comprimento, form?.largura, form?.profundidade_media]);

  const salvarCliente = async () => {
    try {
      await axios.put(`http://10.0.2.2:5000/clientes/${clienteId}`, form);
      Alert.alert('Sucesso', 'Cliente atualizado com sucesso!');
      navigation.goBack(); // Retorna para a lista de clientes
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o cliente.');
    }
  };

  const apagarCliente = async () => {
    Alert.alert(
      'Confirmação',
      'Tem certeza de que deseja apagar este cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`http://10.0.2.2:5000/clientes/${clienteId}`);
              Alert.alert('Sucesso', 'Cliente apagado com sucesso!');
              navigation.goBack(); // Retorna para a lista de clientes
            } catch (error) {
              console.error('Erro ao apagar cliente:', error);
              Alert.alert('Erro', 'Não foi possível apagar o cliente.');
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
      <Text style={styles.title}>Detalhes do Cliente</Text>
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Nome"
        value={form.nome}
        editable={isEditable}
        onChangeText={(value) => handleChange('nome', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Morada"
        value={form.morada}
        editable={isEditable}
        onChangeText={(value) => handleChange('morada', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Google Maps"
        value={form.google_maps}
        editable={isEditable}
        onChangeText={(value) => handleChange('google_maps', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Email"
        value={form.email}
        editable={isEditable}
        onChangeText={(value) => handleChange('email', value)}
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
        placeholder="Informações de Acesso"
        value={form.info_acesso}
        editable={isEditable}
        onChangeText={(value) => handleChange('info_acesso', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Comprimento (m)"
        keyboardType="numeric"
        value={form.comprimento}
        editable={isEditable}
        onChangeText={(value) => handleChange('comprimento', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Largura (m)"
        keyboardType="numeric"
        value={form.largura}
        editable={isEditable}
        onChangeText={(value) => handleChange('largura', value)}
      />
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Profundidade Média (m)"
        keyboardType="numeric"
        value={form.profundidade_media}
        editable={isEditable}
        onChangeText={(value) => handleChange('profundidade_media', value)}
      />
      <TextInput
      style={[styles.input, styles.readOnly]} // Sempre não editável
      placeholder="Volume (m³ - calculado automaticamente)"
      value={form.volume} // Volume calculado automaticamente
      editable={false}
    />
    <View style={styles.switchContainer}>
      <Text>Tanque de Compensação</Text>
      <Switch
        value={form.tanque_compensacao}
        onValueChange={(value) => handleChange('tanque_compensacao', value)}
        disabled={!isEditable}
      />
      </View>
      <View style={styles.switchContainer}>
        <Text>Cobertura</Text>
        <Switch
          value={form.cobertura}
          onValueChange={(value) => handleChange('cobertura', value)}
          disabled={!isEditable}
        />
      </View>
      <View style={styles.switchContainer}>
        <Text>Bomba de Calor</Text>
        <Switch
          value={form.bomba_calor}
          onValueChange={(value) => handleChange('bomba_calor', value)}
          disabled={!isEditable}
        />
      </View>
      <View style={styles.switchContainer}>
        <Text>Equipamentos Especiais</Text>
        <Switch
          value={form.equipamentos_especiais}
          onValueChange={(value) => handleChange('equipamentos_especiais', value)}
          disabled={!isEditable}
        />
      </View>
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Última Substituição (AAAA-MM-DD)"
        value={form.ultima_substituicao}
        editable={isEditable}
        onChangeText={(value) => handleChange('ultima_substituicao', value)}
      />
      <View style={styles.buttonContainer}>
  <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
    <Text style={styles.buttonText}>Voltar</Text>
  </TouchableOpacity>
  {isEditable ? (
    <TouchableOpacity style={styles.button} onPress={salvarCliente}>
      <Text style={styles.buttonText}>Salvar</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity style={styles.button} onPress={() => setIsEditable(true)}>
      <Text style={styles.buttonText}>Editar Cliente</Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity style={styles.button} onPress={apagarCliente}>
    <Text style={styles.buttonText}>Apagar Cliente</Text>
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
  

export default EditClienteScreen;


