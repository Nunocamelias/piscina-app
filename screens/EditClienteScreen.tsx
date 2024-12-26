import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Config from 'react-native-config';

const EditClienteScreen = ({ route, navigation }: any) => {
  const { clienteId } = route.params;
  const [form, setForm] = useState<any>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch cliente data
  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const response = await axios.get(`${Config.API_URL}/clientes/${clienteId}`);
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
      await axios.put(`${Config.API_URL}/clientes/${clienteId}`, form);
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
              await axios.delete(`${Config.API_URL}/clientes/${clienteId}`);
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
      <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.localidadeInput, !isEditable && styles.readOnly]}
        placeholder="Localidade"
        value={form.localidade}
        editable={isEditable}
        onChangeText={(value) => handleChange('localidade', value)}
      />
      <TextInput
        style={[styles.input, styles.codigoPostalInput, !isEditable && styles.readOnly]}
        placeholder="Código Postal (0000-000)"
        keyboardType="numeric"
        value={form.codigo_postal}
        editable={isEditable}
        onChangeText={(value) => handleChange('codigo_postal', value)}
  />
</View>
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
      <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.halfInput, !isEditable && styles.readOnly]}
        placeholder="Comprimento (m)"
        keyboardType="numeric"
        value={form.comprimento}
        editable={isEditable}
        onChangeText={(value) => handleChange('comprimento', value)}
      />
      <TextInput
        style={[styles.input, styles.halfInput, !isEditable && styles.readOnly]}
        placeholder="Largura (m)"
        keyboardType="numeric"
        value={form.largura}
        editable={isEditable}
        onChangeText={(value) => handleChange('largura', value)}
      />
      </View>

      <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.halfInput, !isEditable && styles.readOnly]}
        placeholder="Profundidade Média (m)"
        keyboardType="numeric"
        value={form.profundidade_media}
        editable={isEditable}
        onChangeText={(value) => handleChange('profundidade_media', value)}
      />
      <TextInput
        style={[styles.input, styles.halfInput, !isEditable && styles.readOnly]}
        placeholder="Volume m³ (calculado automaticamente)"
        value={form.volume}
        editable={false} // O volume é calculado automaticamente
  />
</View>

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
          onValueChange={(value) =>
            handleChange('equipamentos_especiais', value)
          }
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
      <TextInput
        style={[styles.input, !isEditable && styles.readOnly]}
        placeholder="Valor da Manutenção (€)"
        keyboardType="numeric"
        value={form.valor_manutencao}
        editable={isEditable}
        onChangeText={(value) => handleChange('valor_manutencao', value)}
      />
      {/* Novo Campo: Periodicidade */}
      <Text style={styles.label}>Periodicidade da Manutenção</Text>
<View style={styles.input}>
  <Picker
    selectedValue={form.periodicidade}
    onValueChange={(value) => handleChange('periodicidade', value)}
    enabled={isEditable} // Habilita ou desabilita com base na edição
    style={styles.picker} // Estilo para melhorar a aparência
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
      <Text style={styles.label}>Condicionantes de Dias</Text>
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
    />
    <Text>{dia}</Text>
  </View>
))}

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
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 0, // Espaçamento entre as linhas
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


