import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import type { StackNavigationProp } from '@react-navigation/stack';
import Config from 'react-native-config';

type RootStackParamList = {
  AddCliente: undefined; // Tela AddCliente não requer parâmetros
  // Outras telas, se necessário
};

type AddClienteScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddCliente'
>;

type Props = {
  navigation: AddClienteScreenNavigationProp;
};

const AddClienteScreen = ({ navigation }: any) => {
  const [form, setForm] = useState({
    empresaid: 1, // ID da empresa atual (ajuste conforme necessário)
    nome: '',
    morada: '',
    google_maps: '',
    email: '',
    telefone: '',
    info_acesso: '',
    comprimento: '',
    largura: '',
    profundidade_media: '',
    volume: '', // Novo campo
    tanque_compensacao: false,
    cobertura: false,
    bomba_calor: false,
    equipamentos_especiais: false,
    ultima_substituicao: '',
  });

  useEffect(() => {
    const comprimento = parseFloat(form.comprimento) || 0;
    const largura = parseFloat(form.largura) || 0;
    const profundidade_media = parseFloat(form.profundidade_media) || 0;
  
    const volumeCalculado = comprimento * largura * profundidade_media;
  
    if (volumeCalculado.toFixed(2) !== form.volume) {
      setForm((prevForm) => ({
        ...prevForm,
        volume: volumeCalculado.toFixed(2), // Formata o volume com 2 casas decimais
      }));
    }
  }, [form.comprimento, form.largura, form.profundidade_media]);
  

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prevState) => ({ ...prevState, [field]: value }));
  };

  

  const salvarCliente = async () => {
    if (!form.empresaid) {
      Alert.alert('Erro', 'O campo empresaid é obrigatório.');
      return;
    }
  
    try {
      console.log('Enviando dados:', form);
      const response = await axios.post(`${Config.API_URL}/clientes`, form);
      Alert.alert('Sucesso', 'Cliente salvo com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      Alert.alert('Erro', 'Não foi possível salvar o cliente.');
    }
  };
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Adicionar Cliente</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={form.nome}
        onChangeText={(value) => handleChange('nome', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Morada"
        value={form.morada}
        onChangeText={(value) => handleChange('morada', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Google Maps"
        value={form.google_maps}
        onChangeText={(value) => handleChange('google_maps', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(value) => handleChange('email', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Telefone"
        keyboardType="phone-pad"
        value={form.telefone}
        onChangeText={(value) => handleChange('telefone', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Informações de Acesso"
        value={form.info_acesso}
        onChangeText={(value) => handleChange('info_acesso', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Comprimento (m)"
        keyboardType="numeric"
        value={form.comprimento}
        onChangeText={(value) => handleChange('comprimento', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Largura (m)"
        keyboardType="numeric"
        value={form.largura}
        onChangeText={(value) => handleChange('largura', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Profundidade Média (m)"
        keyboardType="numeric"
        value={form.profundidade_media}
        onChangeText={(value) => handleChange('profundidade_media', value)}

        />
      <TextInput
        style={styles.input}
        placeholder="Volume m³(calculado automaticamente)"
        value={form.volume}
        editable={false} // O volume não pode ser editado
      />
      <View style={styles.switchContainer}>
        <Text>Tanque de Compensação</Text>
        <Switch
          value={form.tanque_compensacao}
          onValueChange={(value) => handleChange('tanque_compensacao', value)}
        />
      </View>
      <View style={styles.switchContainer}>
        <Text>Cobertura</Text>
        <Switch
          value={form.cobertura}
          onValueChange={(value) => handleChange('cobertura', value)}
        />
      </View>
      <View style={styles.switchContainer}>
        <Text>Bomba de Calor</Text>
        <Switch
          value={form.bomba_calor}
          onValueChange={(value) => handleChange('bomba_calor', value)}
        />
      </View>
      <View style={styles.switchContainer}>
        <Text>Equipamentos Especiais</Text>
        <Switch
          value={form.equipamentos_especiais}
          onValueChange={(value) =>
            handleChange('equipamentos_especiais', value)
          }
        />
      </View>
      
      <TextInput
  style={styles.input}
  placeholder="Última Substituição (AAAA-MM-DD)"
  value={form.ultima_substituicao}
  onChangeText={(value) => handleChange('ultima_substituicao', value)}
/>
<TouchableOpacity style={styles.button} onPress={salvarCliente}>
  <Text style={styles.buttonText}>Salvar Cliente</Text>
</TouchableOpacity>
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  volumeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  volumeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  volumeValue: {
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#ADD8E6', // Azul claro
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25, // Cantos arredondados
    marginBottom: 15, // Espaçamento entre os botões
    width: '80%', // Largura uniforme
    alignItems: 'center', // Centraliza o texto dentro do botão
    alignSelf: 'center', // Centraliza o botão na tela
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000', // Preto
  },
  

});

export default AddClienteScreen;

