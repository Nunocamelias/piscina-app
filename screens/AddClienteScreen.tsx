import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, Appearance } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import type { StackNavigationProp } from '@react-navigation/stack';

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
  empresaid: number | null;
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

const isDarkMode = Appearance.getColorScheme() === 'dark';

const AddClienteScreen = ({ navigation }: Props) => {
  const [form, setForm] = useState<FormState>({
    empresaid: null, // Inicialmente nulo até buscar do AsyncStorage
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

  // Recupera o empresaid do AsyncStorage
  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (empresaid) {
          setForm((prevForm) => ({
            ...prevForm,
            empresaid: parseInt(empresaid, 10),
          }));
        } else {
          Alert.alert(
            'Erro',
            'Empresaid não encontrado. Faça login novamente.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Redireciona para o login com o tipo correto
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' as keyof RootStackParamList }],
                  });
                },
              },
            ]
          );
        }
      } catch (error) {
        console.error('Erro ao recuperar empresaid:', error);
        Alert.alert('Erro', 'Não foi possível recuperar o empresaid.');
      }
    };

    fetchEmpresaid();
  }, [navigation]);

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

  const isAnySwitchOn =
  form.tanque_compensacao ||
  form.cobertura ||
  form.bomba_calor ||
  form.equipamentos_especiais;

  return (
    <ScrollView contentContainerStyle={styles.container}>
  <Text style={styles.title}>Adicionar Cliente</Text>

  <TextInput
    style={styles.input}
    placeholder="Nome"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    value={form.nome}
    onChangeText={(value) => handleChange('nome', value)}
  />
  <TextInput
    style={styles.input}
    placeholder="Morada"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    value={form.morada}
    onChangeText={(value) => handleChange('morada', value)}
  />

  <View style={styles.row}>
    <TextInput
      style={[styles.input, styles.localidade]}
      placeholder="Localidade"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      value={form.localidade}
      onChangeText={(value) => handleChange('localidade', value)}
    />
    <TextInput
      style={[styles.input, styles.codigoPostal]}
      placeholder="Código Postal"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      keyboardType="numeric"
      value={form.codigo_postal}
      onChangeText={(value) => handleChange('codigo_postal', value)}
    />
  </View>

  <TextInput
    style={styles.input}
    placeholder="Google Maps (link ou etiqueta)"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    value={form.google_maps}
    onChangeText={(value) => handleChange('google_maps', value)}
  />
  <TextInput
    style={styles.input}
    placeholder="Email"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    keyboardType="email-address"
    value={form.email}
    onChangeText={(value) => handleChange('email', value)}
  />
  <TextInput
    style={styles.input}
    placeholder="Telefone"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    keyboardType="phone-pad"
    value={form.telefone}
    onChangeText={(value) => handleChange('telefone', value)}
  />
  <TextInput
    style={styles.input}
    placeholder="Informações de Acesso"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    value={form.info_acesso}
    onChangeText={(value) => handleChange('info_acesso', value)}
  />
  <View style={styles.row}>
  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, styles.halfWidth]}
      placeholder="Comprimento"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      keyboardType="numeric"
      value={form.comprimento}
      onChangeText={(value) => handleChange('comprimento', value)}
    />
    <Text style={styles.unitText}>m</Text>
  </View>
  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, styles.halfWidth]}
      placeholder="Largura"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      keyboardType="numeric"
      value={form.largura}
      onChangeText={(value) => handleChange('largura', value)}
    />
    <Text style={styles.unitText}>m</Text>
  </View>
</View>

<View style={styles.row}>
  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, styles.halfWidth]}
      placeholder="Prof. Média"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      keyboardType="numeric"
      value={form.profundidade_media}
      onChangeText={(value) => handleChange('profundidade_media', value)}
    />
    <Text style={styles.unitText}>m</Text>
  </View>

  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, styles.halfWidth]}
      placeholder="Volume"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      value={form.volume}
      editable={false} // O volume é calculado automaticamente
    />
    <Text style={styles.unitText}>m³</Text>
  </View>
</View>
  <TextInput
    style={styles.input}
    placeholder="Última Substituição (AAAA-MM-DD)"
    placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
    value={form.ultima_substituicao}
    onChangeText={(value) => handleChange('ultima_substituicao', value)}
  />

<View style={styles.switchContainer}>
  <Text style={isDarkMode ? styles.switchLabelDark : styles.switchLabelLight}>Tanque de Compensação</Text>
  <Switch
    value={form.tanque_compensacao}
    onValueChange={(value) => handleChange('tanque_compensacao', value)}
    trackColor={{ false: '#444', true: '#32CD32' }} // Verde escuro quando ativado
    thumbColor={form.tanque_compensacao ? '#FFF' : '#777'} // Branco no ativo, cinza quando inativo
  />
</View>

<View style={styles.switchContainer}>
  <Text style={isDarkMode ? styles.switchLabelDark : styles.switchLabelLight}>Cobertura</Text>
  <Switch
    value={form.cobertura}
    onValueChange={(value) => handleChange('cobertura', value)}
    trackColor={{ false: '#444', true: '#32CD32' }}
    thumbColor={form.cobertura ? '#FFF' : '#777'}
  />
</View>

<View style={styles.switchContainer}>
  <Text style={isDarkMode ? styles.switchLabelDark : styles.switchLabelLight}>Bomba de Calor</Text>
  <Switch
    value={form.bomba_calor}
    onValueChange={(value) => handleChange('bomba_calor', value)}
    trackColor={{ false: '#444', true: '#32CD32' }}
    thumbColor={form.bomba_calor ? '#FFF' : '#777'}
  />
</View>

<View style={styles.switchContainer}>
  <Text style={isDarkMode ? styles.switchLabelDark : styles.switchLabelLight}>Equipamentos Especiais</Text>
  <Switch
    value={form.equipamentos_especiais}
    onValueChange={(value) => handleChange('equipamentos_especiais', value)}
    trackColor={{ false: '#444', true: '#32CD32' }}
    thumbColor={form.equipamentos_especiais ? '#FFF' : '#777'}
  />
</View>

<Text style={isDarkMode ? styles.labelDark : styles.labelLight}>
  Periodicidade da Manutenção
</Text>

<View style={styles.pickerContainer}>
  <Picker
    selectedValue={form.periodicidade}
    onValueChange={(value) => handleChange('periodicidade', value)}
    style={styles.picker}
    dropdownIconColor={isDarkMode ? '#FFF' : '#000'} // 🔥 Garante que a seta seja visível
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
  <Text style={isDarkMode ? styles.labelDark : styles.labelLight}>Condicionantes de Dias</Text>
  {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map((dia: string) => (
    <View key={dia} style={styles.checkboxItem}>
      <Switch
        value={form.condicionantes.includes(dia)} // Switch está desligado se o dia não estiver nas condicionantes
        onValueChange={() => toggleCondicionante(dia)}
        trackColor={{ false: '#767577', true: '#32CD32' }} // Mais escuro no modo dark
        thumbColor={form.condicionantes.includes(dia) ? '#FFF' : '#000'} // Contraste melhorado
      />
      <Text style={isDarkMode ? styles.checkboxLabelDark : styles.checkboxLabelLight}>{dia}</Text>
    </View>
  ))}
</View>

<View style={styles.row}>
  <Text style={styles.label}>Valor mensal da manutenção</Text>
  <View style={styles.inputWithUnit}>
    <TextInput
      style={styles.input}
      placeholder="0.00"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      keyboardType="numeric"
      value={form.valor_manutencao?.toString() || ''}
      onChangeText={(value) => handleChange('valor_manutencao', value)}
    />
    <Text style={styles.unitText}>€</Text>
  </View>
</View>

      <TouchableOpacity
  style={[styles.button]}
  onPress={salvarCliente}
>
  <Text style={styles.buttonText}>Salvar Cliente</Text>
</TouchableOpacity>
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
    color: isDarkMode ? '#333' : '#000', // Mantém a cor preta para legibilidade
  },
  input: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 0,
    borderColor: '#000', // Moldura preta para destaque
    color: '#000', // Texto sempre escuro
  },
  labelLight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000', // Preto no modo claro
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginTop: 10,
  },
  labelDark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF', // Branco no modo escuro para maior contraste
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
    color: isDarkMode ? '#000' : '#333', // Melhor contraste no modo escuro
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
    color: isDarkMode ? '#000' : '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: '#000', // Bordas escuras para destacar
    borderRadius: 10,
    backgroundColor: isDarkMode ? '#FFF' : '#DDD', // Cinza médio no escuro
  },
  switchLabelLight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333', // Cinza escuro para melhor visibilidade
  },
  switchLabelDark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111', // Preto mais forte no modo escuro
  },
  buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly', // Distribui os botões uniformemente
      marginTop: 20,
      flexWrap: 'wrap', // Permite que os botões sejam quebrados para a próxima linha, se necessário
  },
  pickerContainer: {
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#000' : '#555', // 🔥 Preto no dark mode, cinza no claro
      borderRadius: 5,
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#333' : '#FFF', // 🔥 Fundo mais escuro no dark mode
  },
  picker: {
      color: isDarkMode ? '#FFF' : '#000', // 🔥 Texto branco no dark mode, preto no claro
      height: 50,
      width: '100%',
  },
  pickerItem: {
      fontSize: 16,
      color: isDarkMode ? '#FFF' : '#000', // 🔥 Cor do texto dentro do dropdown
  },
  button: {
      backgroundColor: '#ADD8E6', // Azul claro padrão
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 25,
      marginBottom: 15,
      width: '80%',
      alignItems: 'center',
      alignSelf: 'center',
      borderWidth: 1.5, // Adiciona moldura
      borderColor: '#000', // Cor da moldura preta
  },
  buttonActive: {
      backgroundColor: '#32CD32', // Verde quando ativado
  },
  buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
  },
  checkboxLabel: {
      marginLeft: 10,
      fontSize: 16,
      color: isDarkMode ? '#000' : '#333',
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
  inputLight: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    color: '#000',
  },
  inputDark: {
    backgroundColor: '#FFF',
    borderWidth: 1.5, // Moldura preta no dark mode
    borderColor: '#000',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    color: '#000', // Texto preto no dark mode para melhorar visibilidade
  },
  checkboxLabelLight: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  checkboxLabelDark: {
    marginLeft: 10,
    fontSize: 16,
    color: '#222', // Mais escuro no dark mode
  },
  unitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? '#000' : '#000',
    marginLeft: 5,
    alignSelf: 'center', // Alinha verticalmente com o campo de input
    top: '50%', // Posiciona o elemento no meio do campo
    transform: [{ translateY: -32 }], // Ajuste fino para melhor alinhamento vertical
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: '#555',
    borderRadius: 5,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingHorizontal: 5,
    width: '63%', // Mantém alinhado
  },
});

export default AddClienteScreen;

