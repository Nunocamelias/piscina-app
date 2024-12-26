import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import type { StackNavigationProp } from '@react-navigation/stack';
import Config from 'react-native-config';

type RootStackParamList = {
  AddCliente: undefined; // Tela AddCliente não requer parâmetros
};

type AddClienteScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddCliente'
>;

type Props = {
  navigation: AddClienteScreenNavigationProp;
};

type FormState = {
  empresaid: number;
  nome: string;
  morada: string;
  localidade: string; // Novo campo
  codigo_postal: string; // Novo campo com formato específico
  google_maps: string;
  email: string;
  telefone: string;
  info_acesso: string;
  comprimento: string;
  largura: string;
  profundidade_media: string;
  volume: string;
  tanque_compensacao: boolean;
  cobertura: boolean;
  bomba_calor: boolean;
  equipamentos_especiais: boolean;
  ultima_substituicao: string;
  valor_manutencao: string;
  periodicidade: string;
  condicionantes: string[];
};

const AddClienteScreen = ({ navigation }: Props) => {
  const [form, setForm] = useState<FormState>({
    empresaid: 1,
    nome: '',
    morada: '',
    localidade: '', // Inicializado vazio
    codigo_postal: '', // Inicializado vazio
    google_maps: '',
    email: '',
    telefone: '',
    info_acesso: '',
    comprimento: '',
    largura: '',
    profundidade_media: '',
    volume: '',
    tanque_compensacao: false,
    cobertura: false,
    bomba_calor: false,
    equipamentos_especiais: false,
    ultima_substituicao: '',
    valor_manutencao: '',
    periodicidade: '1',
    condicionantes: [],
  });
  

  

  // Calcula o volume automaticamente
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

  // Manipula mudanças nos campos do formulário
  const handleChange = (field: keyof typeof form, value: any) => {
    setForm((prevState) => ({ ...prevState, [field]: value }));
  };

  // Alternar dias
  const toggleCondicionante = (dia: string) => {
    setForm((prevState) => {
      const newCondicionantes = prevState.condicionantes.includes(dia)
        ? prevState.condicionantes.filter((d) => d !== dia) // Remove o dia
        : [...prevState.condicionantes, dia]; // Adiciona o dia
      return { ...prevState, condicionantes: newCondicionantes };
    });
  };

  // Valida os campos do formulário
  const validarFormulario = () => {
    const camposObrigatorios: (keyof FormState)[] = [
      'nome',
      'morada',
      'localidade', // Adiciona validação
      'codigo_postal', // Adiciona validação
      'email',
      'telefone',
      'comprimento',
      'largura',
      'profundidade_media',
      'valor_manutencao',
      'periodicidade',
    ];
  
    for (const campo of camposObrigatorios) {
      if (!form[campo]) {
        Alert.alert('Erro', `O campo "${campo}" é obrigatório.`);
        return false;
      }
    }
  
    // Validações adicionais
    if (!/^\d+$/.test(form.telefone)) {
      Alert.alert('Erro', 'O campo "Telefone" deve conter apenas números.');
      return false;
    }

    // Validação de formato do código postal
    if (!/^\d{4}-\d{3}$/.test(form.codigo_postal)) {
      Alert.alert('Erro', 'O código postal deve estar no formato 0000-000.');
      return false;
    }

    // Validação do Google Maps
    if (form.google_maps && !/https?:\/\/|@/.test(form.google_maps)) {
      Alert.alert(
        'Erro',
        'O campo "Google Maps" deve conter um link válido ou etiqueta.'
      );
      return false;
    }
  
    if (isNaN(Number(form.comprimento)) || isNaN(Number(form.largura)) || isNaN(Number(form.profundidade_media))) {
      Alert.alert('Erro', 'Os campos de dimensões devem conter apenas valores numéricos.');
      return false;
    }
  
    if (!form.ultima_substituicao) {
      Alert.alert('Erro', 'O campo "Última Substituição" é obrigatório.');
      return false;
    }
  
    return true;
  };
  

  // Salva o cliente no banco de dados
  const salvarCliente = async () => {
    if (!form.empresaid) {
      Alert.alert('Erro', 'O campo empresaid é obrigatório.');
      return;
    }

    if (!validarFormulario()) {
      return; // Para a execução caso algum campo obrigatório esteja vazio
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
      <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.localidade]}
        placeholder="Localidade"
        value={form.localidade}
        onChangeText={(value) => handleChange('localidade', value)}
      />
      <TextInput
        style={[styles.input, styles.codigoPostal]}
        placeholder="Código Postal"
        keyboardType="numeric"
        value={form.codigo_postal}
        onChangeText={(value) => handleChange('codigo_postal', value)}
      />
    </View>
      <TextInput
        style={styles.input}
        placeholder="Google Maps (link ou etiqueta)"
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
      <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.halfWidth]}
        placeholder="Comprimento (m)"
        keyboardType="numeric"
        value={form.comprimento}
        onChangeText={(value) => handleChange('comprimento', value)}
      />
      <TextInput
        style={[styles.input, styles.halfWidth]}
        placeholder="Largura (m)"
        keyboardType="numeric"
        value={form.largura}
        onChangeText={(value) => handleChange('largura', value)}
      />
      </View>
      <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.halfWidth]}
        placeholder="Prof. Média (m)"
        keyboardType="numeric"
        value={form.profundidade_media}
        onChangeText={(value) => handleChange('profundidade_media', value)}
      />
      <TextInput
        style={[styles.input, styles.halfWidth]}
        placeholder="Volume (m³)"
        value={form.volume}
        editable={false} // O volume é calculado automaticamente e não pode ser editado
      />
      </View>
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
          onValueChange={(value) => handleChange('equipamentos_especiais', value)}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Última Substituição (AAAA-MM-DD)"
        value={form.ultima_substituicao}
        onChangeText={(value) => handleChange('ultima_substituicao', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Valor da Manutenção (€)"
        keyboardType="numeric"
        value={form.valor_manutencao?.toString() || ''} // Garante que seja uma string
        onChangeText={(value) => handleChange('valor_manutencao', value)}
      />
      <Text style={styles.label}>Periodicidade da Manutenção</Text>
      <View style={styles.input}>
        <Picker
          selectedValue={form.periodicidade}
          onValueChange={(value) => handleChange('periodicidade', value)}
          style={styles.picker} // Estilo para melhorar a aparência
        >
          <Picker.Item label="1 vez por semana" value="1" />
          <Picker.Item label="2 vezes por semana" value="2" />
          <Picker.Item label="3 vezes por semana" value="3" />
          <Picker.Item label="4 vezes por semana" value="4" />
          <Picker.Item label="5 vezes por semana" value="5" />
          <Picker.Item label="6 vezes por semana" value="6" />
          <Picker.Item label="Quinzenalmente" value="quinzenal" />
        </Picker>
      </View>
  
      <View style={styles.checkboxContainer}>
        <Text style={styles.label}>Condicionantes de Dias</Text>
        {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map((dia: string) => (
          <View key={dia} style={styles.checkboxItem}>
            <Switch
              value={form.condicionantes.includes(dia)} // Switch está desligado se o dia não estiver nas condicionantes
              onValueChange={() => toggleCondicionante(dia)}
            />
            <Text style={styles.checkboxLabel}>{dia}</Text>
          </View>
        ))}
      </View>


  
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  checkboxContainer: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
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
  picker: {
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#CCC',
      borderRadius: 5,
      height: 53,
      paddingHorizontal: 10,
      justifyContent: 'center',
      marginTop: -10, // Espaço acima do picker
      marginBottom: -10, // Espaço abaixo do picker
    },
  pickerItem: {
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
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333', // Cor do texto
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000', // Preto
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  halfWidth: {
    width: '48%', // Cada campo ocupa cerca de metade da linha, com espaço entre eles
  },
  localidade: {
    flex: 2, // Ocupa 2/3 do espaço
    marginRight: 10, // Espaço entre os campos
  },
  codigoPostal: {
    flex: 1, // Ocupa 1/3 do espaço
  },
});

export default AddClienteScreen;

