import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, Appearance } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const EditClienteScreen = ({ route, navigation }: any) => {
  const { clienteId } = route.params;
  const [form, setForm] = useState<any>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch cliente data
  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid'); // Recupera o empresaid
        if (!empresaid) {
          Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
          navigation.navigate('Login'); // Redireciona para o login se empresaid não for encontrado
          return;
        }

        const response = await axios.get(`${Config.API_URL}/clientes/${clienteId}`, {
          params: { empresaid: parseInt(empresaid, 10) }, // Inclui empresaid como parâmetro
        });
        setForm(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes do cliente.');
        navigation.goBack(); // Volta para a tela anterior em caso de erro
      }
    };

    fetchCliente();
  }, [clienteId, navigation]); // Adicione `navigation` às dependências para evitar avisos


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
      // Recupera o empresaid do AsyncStorage
      const empresaid = await AsyncStorage.getItem('empresaid');
      if (!empresaid) {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        navigation.navigate('Login'); // Redireciona para a tela de login
        return;
      }

      // Inclui o empresaid no formulário antes de enviar
      const updatedForm = { ...form, empresaid: parseInt(empresaid, 10) };

      // Faz a requisição para atualizar o cliente
      const response = await axios.put(`${Config.API_URL}/clientes/${clienteId}`, updatedForm);

      Alert.alert('Sucesso', 'Cliente atualizado com sucesso!');
      navigation.goBack(); // Retorna para a lista de clientes
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Erro ao atualizar cliente (Axios):', error.response?.data || error.message);
        Alert.alert('Erro', error.response?.data?.error || 'Não foi possível atualizar o cliente.');
      } else {
        console.error('Erro desconhecido ao atualizar cliente:', error);
        Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
      }
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
              const empresaid = await AsyncStorage.getItem('empresaid');
              if (!empresaid) {
                Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
                navigation.navigate('Login');
                return;
              }

              console.log('Apagando cliente com empresaid:', empresaid);

              await axios.delete(`${Config.API_URL}/clientes/${clienteId}`, {
                params: { empresaid: parseInt(empresaid, 10) }, // Envia o empresaid no query string
              });
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

  const isAnySwitchOn =
  form.tanque_compensacao ||
  form.cobertura ||
  form.bomba_calor ||
  form.equipamentos_especiais;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Detalhes do Cliente</Text>

<TextInput
  style={[
    isDarkMode ? styles.inputDark : styles.inputLight,
    !isEditable && styles.readOnly,
  ]}
  placeholder="Nome"
  placeholderTextColor={isDarkMode ? '#BBB' : '#666'} // 🔥 Garante visibilidade no modo escuro
  value={form.nome}
  editable={isEditable}
  onChangeText={(value) => handleChange('nome', value)}
/>

<TextInput
  style={[
    isDarkMode ? styles.inputDark : styles.inputLight,
    !isEditable && styles.readOnly,
  ]}
  placeholder="Morada"
  placeholderTextColor={isDarkMode ? '#BBB' : '#666'}
  value={form.morada}
  editable={isEditable}
  onChangeText={(value) => handleChange('morada', value)}
/>

<View style={styles.row}>
  <TextInput
    style={[
      isDarkMode ? styles.inputDark : styles.inputLight,
      styles.localidadeInput,
      !isEditable && styles.readOnly,
    ]}
    placeholder="Localidade"
    placeholderTextColor={isDarkMode ? '#BBB' : '#666'}
    value={form.localidade}
    editable={isEditable}
    onChangeText={(value) => handleChange('localidade', value)}
  />

  <TextInput
    style={[
      isDarkMode ? styles.inputDark : styles.inputLight,
      styles.codigoPostalInput,
      !isEditable && styles.readOnly,
    ]}
    placeholder="Código Postal (0000-000)"
    placeholderTextColor={isDarkMode ? '#BBB' : '#666'}
    keyboardType="numeric"
    value={form.codigo_postal}
    editable={isEditable}
    onChangeText={(value) => handleChange('codigo_postal', value)}
  />
</View>

<TextInput
  style={[
    isDarkMode ? styles.inputDark : styles.inputLight,
    !isEditable && styles.readOnly,
  ]}
  placeholder="Google Maps"
  placeholderTextColor={isDarkMode ? '#BBB' : '#666'}
  value={form.google_maps}
  editable={isEditable}
  onChangeText={(value) => handleChange('google_maps', value)}
/>

<TextInput
  style={[
    isDarkMode ? styles.inputDark : styles.inputLight,
    !isEditable && styles.readOnly,
  ]}
  placeholder="Email"
  placeholderTextColor={isDarkMode ? '#BBB' : '#666'}
  value={form.email}
  editable={isEditable}
  onChangeText={(value) => handleChange('email', value)}
/>

<TextInput
  style={[
    isDarkMode ? styles.inputDark : styles.inputLight,
    !isEditable && styles.readOnly,
  ]}
  placeholder="Telefone"
  placeholderTextColor={isDarkMode ? '#BBB' : '#666'}
  keyboardType="phone-pad"
  value={form.telefone}
  editable={isEditable}
  onChangeText={(value) => handleChange('telefone', value)}
/>

<TextInput
  style={[
    isDarkMode ? styles.inputDark : styles.inputLight,
    !isEditable && styles.readOnly,
  ]}
  placeholder="Informações de Acesso"
  placeholderTextColor={isDarkMode ? '#BBB' : '#666'}
  value={form.info_acesso}
  editable={isEditable}
  onChangeText={(value) => handleChange('info_acesso', value)}
/>

<View style={styles.row}>
  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, styles.halfInput, !isEditable && styles.readOnly]}
      placeholder="Comprimento"
      keyboardType="numeric"
      value={form.comprimento}
      editable={isEditable}
      onChangeText={(value) => handleChange('comprimento', value)}
    />
    <Text style={styles.unitText}>m</Text>
  </View>

  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, styles.halfInput, !isEditable && styles.readOnly]}
      placeholder="Largura"
      keyboardType="numeric"
      value={form.largura}
      editable={isEditable}
      onChangeText={(value) => handleChange('largura', value)}
    />
    <Text style={styles.unitText}>m </Text>
  </View>
</View>

<View style={styles.row}>
  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, styles.halfInput, !isEditable && styles.readOnly]}
      placeholder="Profundidade Média"
      keyboardType="numeric"
      value={form.profundidade_media}
      editable={isEditable}
      onChangeText={(value) => handleChange('profundidade_media', value)}
    />
    <Text style={styles.unitText}>m</Text>
  </View>

  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, styles.halfInput, !isEditable && styles.readOnly]}
      placeholder="Volume"
      value={form.volume}
      editable={false} // O volume é calculado automaticamente
    />
    <Text style={styles.unitText}>m³</Text>
  </View>
</View>

<TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Última Substituição (AAAA-MM-DD)"
        value={form.ultima_substituicao}
        editable={isEditable}
        onChangeText={(value) => handleChange('ultima_substituicao', value)}
      />

<View style={styles.switchContainer}>
  <Text style={isDarkMode ? styles.switchLabelDark : styles.switchLabelLight}>Tanque de Compensação</Text>
  <Switch
    value={form.tanque_compensacao}
    onValueChange={(value) => handleChange('tanque_compensacao', value)}
    disabled={!isEditable}
    trackColor={{ false: '#444', true: '#32CD32' }}
    thumbColor={form.tanque_compensacao ? '#FFF' : '#777'}
  />
</View>

<View style={styles.switchContainer}>
  <Text style={isDarkMode ? styles.switchLabelDark : styles.switchLabelLight}>Cobertura</Text>
  <Switch
    value={form.cobertura}
    onValueChange={(value) => handleChange('cobertura', value)}
    disabled={!isEditable}
    trackColor={{ false: '#444', true: '#32CD32' }}
    thumbColor={form.cobertura ? '#FFF' : '#777'}
  />
</View>

<View style={styles.switchContainer}>
  <Text style={isDarkMode ? styles.switchLabelDark : styles.switchLabelLight}>Bomba de Calor</Text>
  <Switch
    value={form.bomba_calor}
    onValueChange={(value) => handleChange('bomba_calor', value)}
    disabled={!isEditable}
    trackColor={{ false: '#444', true: '#32CD32' }}
    thumbColor={form.bomba_calor ? '#FFF' : '#777'}
  />
</View>

<View style={styles.switchContainer}>
  <Text style={isDarkMode ? styles.switchLabelDark : styles.switchLabelLight}>Equipamentos Especiais</Text>
  <Switch
    value={form.equipamentos_especiais}
    onValueChange={(value) => handleChange('equipamentos_especiais', value)}
    disabled={!isEditable}
    trackColor={{ false: '#444', true: '#32CD32' }}
    thumbColor={form.equipamentos_especiais ? '#FFF' : '#777'}
  />
</View>

      {/* Novo Campo: Periodicidade */}
      <Text style={isDarkMode ? styles.labelDark : styles.labelLight}>
  Periodicidade da Manutenção
</Text>

<View style={styles.pickerContainer}>
  <Picker
    selectedValue={form.periodicidade}
    onValueChange={(value) => handleChange('periodicidade', value)}
    enabled={isEditable}
    style={styles.picker}
    dropdownIconColor={isDarkMode ? '#FFF' : '#000'}
  >
    <Picker.Item label="1 vez por semana" value="1" />
    <Picker.Item label="2 vezes por semana" value="2" />
    <Picker.Item label="3 vezes por semana" value="3" />
    <Picker.Item label="4 vezes por semana" value="4" />
    <Picker.Item label="5 vezes por semana" value="5" />
    <Picker.Item label="6 vezes por semana" value="6" />
    <Picker.Item label="Semana sim, semana não" value="quinzenal" />
  </Picker>
</View>

      {/* Novo Campo: Condicionantes */}
      <Text style={isDarkMode ? styles.labelDark : styles.labelLight}>Condicionantes de Dias</Text>
<View style={styles.checkboxContainer}>
  {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map((dia: string) => (
    <View key={dia} style={styles.checkboxItem}>
      <Switch
        value={form.condicionantes.includes(dia)}
        onValueChange={() => {
          const updated = form.condicionantes.includes(dia)
            ? form.condicionantes.filter((item: string) => item !== dia)
            : [...form.condicionantes, dia];
          handleChange('condicionantes', updated);
        }}
        disabled={!isEditable}
        trackColor={{ false: '#767577', true: '#32CD32' }}
        thumbColor={form.condicionantes.includes(dia) ? '#FFF' : '#000'}
      />
      <Text style={isDarkMode ? styles.checkboxLabelDark : styles.checkboxLabelLight}>{dia}</Text>
    </View>
  ))}
</View>
<View style={styles.row}>
  <Text style={styles.label}>Valor mensal da manutenção</Text>
  <View style={styles.inputWithUnit}>
    <TextInput
      style={[styles.input, !isEditable && styles.readOnly]}
      placeholder="0.00"
      placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
      keyboardType="numeric"
      value={form.valor_manutencao?.toString() || ''}
      editable={isEditable}
      onChangeText={(value) => handleChange('valor_manutencao', value)}
    />
    <Text style={styles.unitText}>€</Text>
  </View>
</View>


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
      backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
      flexGrow: 1,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '48%',
      backgroundColor: '#FFF',
      borderWidth: 1.5,
      borderColor: '#000',
      borderRadius: 5,
      paddingHorizontal: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: isDarkMode ? '#000' : '#000', // Sempre preto para contraste
    },
    input: {
      backgroundColor: '#FFF',
      padding: 10,
      borderRadius: 5,
      marginBottom: 15,
      borderWidth: 0, // Borda mais visível
      borderColor: '#000', // Preto para melhor contraste
      color: '#000', // Texto preto
    },
    inputLight: {
      backgroundColor: '#FFF',
      borderWidth: 0,
      borderColor: '#CCC',
      padding: 10,
      borderRadius: 5,
      marginBottom: 15,
      color: '#000', // 🔥 Texto preto no modo claro
    },
    inputDark: {
      backgroundColor: '#FFF',
      padding: 10,
      borderRadius: 5,
      marginBottom: 15,
      borderWidth: 0,
      borderColor: '#000',
      color: '#000',
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      marginVertical: 10,
    },
    labelLight: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#000',
      alignSelf: 'flex-start',
      marginLeft: '10%',
      marginTop: 10,
    },
    labelDark: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#222222',
      opacity: 1,
      alignSelf: 'flex-start',
      marginLeft: '10%',
      marginTop: 10,
    },
    inputWithUnit: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 0,
      borderColor: '#555',
      borderRadius: 5,
      backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
      paddingHorizontal: 5,
      width: '40%', // Mantém alinhado
    },
    unitText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? '#000' : '#000',
      marginLeft: 5,
      top: '50%', // Posiciona o elemento no meio do campo
      transform: [{ translateY: -32 }], // Ajuste fino para melhor alinhamento vertical
    },
    checkboxLabelLight: {
      fontSize: 16,
      color: '#000', // Preto no modo claro
    },

    checkboxLabelDark: {
      fontSize: 16,
      color: '#FFF', // Branco no modo escuro para melhor contraste
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
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 0,
    },
    halfInput: {
      flex: 1, // Cada campo ocupa metade da largura
      marginRight: 10, // Espaço entre os campos
    },
    localidadeInput: {
      flex: 2, // Ocupa 2/3 da linha
      marginRight: 10, // Espaço entre os campos
    },
    codigoPostalInput: {
      flex: 1, // Ocupa 1/3 da linha
    },
    pickerContainer: {
      borderWidth: 1.5,
      borderColor: '#000',
      borderRadius: 5,
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#333' : '#FFF',
    },
    picker: {
      color: isDarkMode ? '#FFF' : '#000',
      height: 50,
      width: '100%',
    },
    pickerItem: {
      fontSize: 16,
      color: '#000',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    switchLabelLight: {
      fontSize: 16,
      color: '#000', // Preto no modo claro
      fontWeight: 'bold',
    },

    switchLabelDark: {
      fontSize: 16,
      color: '#222222', // Cinza escuro no modo escuro
      fontWeight: 'bold',
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
    smallInput: {
      flex: 1,
      padding: 10,
      fontSize: 16,
      color: '#000',
    },
    unit: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#000',
      marginLeft: 5,
    },
  });


export default EditClienteScreen;


