import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, Modal, StyleSheet, Switch, Appearance, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Importando o Picker para o dropdown
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAvoidingView, Platform } from 'react-native';

const isDarkMode = Appearance.getColorScheme() === 'dark';

// Lista fixa de parâmetros
const PARAMETROS_VALIDOS = [
  'pH',
  'Cloro Livre em ppm',
  'Cloro Total em ppm',       // ✅ novo
  'Cloro Combinado em ppm',   // ✅ novo (mesmo que não seja editável na folha)
  'Cloro ORP em mV',
  'Alcalinidade',
  'Dureza',
  'Ácido Cianúrico',
  'Sal em Kg/m³',
  'Oxigênio',
];


type Parametro = {
  id: number;
  parametro: string;
  valor_minimo: string | null;
  valor_maximo: string | null;
  valor_alvo: string | null;
  produto_aumentar: string;
  produto_diminuir: string;
  dosagem_aumentar: string | null;
  dosagem_diminuir: string | null;
  incremento_aumentar: string | null;
  incremento_diminuir: string | null;
  volume_calculo: string | null;
  ativo: boolean;
};

const ParametrosQuimicosScreen: React.FC = () => {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [parametroSelecionado, setParametroSelecionado] = useState<Parametro | null>(null);
  const [userEmpresaid, setUserEmpresaid] = useState<number | null>(null);
  const [empresaNome, setEmpresaNome] = useState('');

  // Função para buscar o empresaid do AsyncStorage
  useEffect(() => {
  const fetchEmpresaData = async () => {
    try {
      console.log('[DEBUG] Tentando carregar empresaid e nome da empresa do AsyncStorage...');

      const empresaid = await AsyncStorage.getItem('empresaid');
      const nomeEmpresa = await AsyncStorage.getItem('empresa_nome');

      if (empresaid) {
        console.log('[DEBUG] Empresaid encontrado:', empresaid);
        setUserEmpresaid(parseInt(empresaid, 10));
      } else {
        console.log('[DEBUG] Empresaid não encontrado. Mostrando alerta.');
        Alert.alert('Erro', 'Empresaid não encontrado. Por favor, faça login novamente.');
        setUserEmpresaid(null);
      }

      if (nomeEmpresa) {
        console.log('[DEBUG] Nome da empresa carregado:', nomeEmpresa);
        setEmpresaNome(nomeEmpresa);
      } else {
        console.log('[DEBUG] Nome da empresa não encontrado no cache.');
      }

    } catch (error) {
      console.error('[DEBUG] Erro ao carregar dados da empresa:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da empresa.');
      setUserEmpresaid(null);
    }
  };

  fetchEmpresaData();
}, []);


  // Função para buscar os parâmetros químicos
  const fetchParametros = useCallback(async () => {
    try {
      const response = await axios.get(`${Config.API_URL}/parametros-quimicos`, {
        params: { empresaid: userEmpresaid },
      });
      setParametros(response.data);
    } catch (error) {
      console.error('Erro ao buscar parâmetros químicos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os parâmetros.');
    }
  }, [userEmpresaid]); // ✅ Memoiza a função para evitar loops infinitos

  useEffect(() => {
    if (userEmpresaid) {
      fetchParametros();
    }
  }, [userEmpresaid, fetchParametros]); // ✅ Agora o React não dispara o efeito infinitamente




  // Função para salvar ou atualizar um parâmetro
  const salvarParametro = async () => {
    try {
      if (!parametroSelecionado) {return;}

      const parametroComEmpresaid = {
        ...parametroSelecionado,
        valor_minimo: parametroSelecionado.valor_minimo || null,
        valor_maximo: parametroSelecionado.valor_maximo || null,
        valor_alvo: parametroSelecionado.valor_alvo || null,
        produto_aumentar: parametroSelecionado.produto_aumentar || null,
        produto_diminuir: parametroSelecionado.produto_diminuir || null,
        dosagem_aumentar: parametroSelecionado.dosagem_aumentar || null,
        dosagem_diminuir: parametroSelecionado.dosagem_diminuir || null,
        incremento_aumentar: parametroSelecionado.incremento_aumentar || null,
        incremento_diminuir: parametroSelecionado.incremento_diminuir || null,
        volume_calculo: parametroSelecionado.volume_calculo || null,
        empresaid: userEmpresaid,
      };

      if (parametroSelecionado.id) {
        // Atualiza o parâmetro existente
        await axios.put(
          `${Config.API_URL}/parametros-quimicos/${parametroSelecionado.id}`,
          parametroComEmpresaid
        );
      } else {
        // Cria um novo parâmetro
        await axios.post(`${Config.API_URL}/parametros-quimicos`, parametroComEmpresaid);
      }

      Alert.alert('Sucesso', 'Parâmetro salvo com sucesso!');
      fetchParametros(); // Atualiza a lista de parâmetros após salvar
      setModalVisible(false);
    } catch (error) {
      console.error('Erro ao salvar parâmetro:', error);
      Alert.alert('Erro', 'Não foi possível salvar o parâmetro.');
    }
  };


  // Função para abrir o modal de edição/adicionar
  const abrirModal = (parametro?: Parametro) => {
    setParametroSelecionado(parametro || {
      id: 0,
      parametro: '',
      valor_minimo: null, // Define como null por padrão
      valor_maximo: null, // Define como null por padrão
      valor_alvo: null, // Define como null por padrão
      produto_aumentar: '',
      produto_diminuir: '',
      dosagem_aumentar: null, // Define como null por padrão
      dosagem_diminuir: null, // Define como null por padrão
      incremento_aumentar: null, // Define como null por padrão
      incremento_diminuir: null, // Define como null por padrão
      volume_calculo: null, // Define como null por padrão
      ativo: true,
    });
    setModalVisible(true);
  };

  // Função para apagar um parâmetro
  const apagarParametro = async (id: number) => {
    if (!userEmpresaid) {
      Alert.alert('Erro', 'Empresaid não disponível. Certifique-se de que fez login corretamente.');
      return;
    }

    try {
      await axios.delete(`${Config.API_URL}/parametros-quimicos/${id}`, {
        params: { empresaid: userEmpresaid },
      });

      Alert.alert('Sucesso', 'Parâmetro apagado com sucesso!');
      fetchParametros(); // Atualiza os dados após apagar
    } catch (error) {
      console.error('Erro ao apagar parâmetro:', error);
      Alert.alert('Erro', 'Não foi possível apagar o parâmetro.');
    }
  };

const formatDosagemFrase = (
  p?: Parametro | null,
  modo?: 'aumentar' | 'diminuir',
  unidade?: string
) => {
  if (!p) return '';

  const u = unidade || 'unidades';

  if (modo === 'aumentar') {
    const { dosagem_aumentar, incremento_aumentar, volume_calculo } = p;
    if (!dosagem_aumentar || !incremento_aumentar || !volume_calculo) return '';
    return `Adicionar ${dosagem_aumentar} kg/lt para aumentar ${incremento_aumentar} ${u} em ${volume_calculo} m³ de água.`;
  }

  // diminuir
  const { dosagem_diminuir, incremento_diminuir, volume_calculo } = p;
  if (!dosagem_diminuir || !incremento_diminuir || !volume_calculo) return '';
  return `Adicionar ${dosagem_diminuir} kg/lt para reduzir ${incremento_diminuir} ${u} em ${volume_calculo} m³ de água.`;
};

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flexContainer}
    >
      <View style={styles.container}>
        <FlatList
          data={parametros}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: item.ativo ? '#CCFFCC' : '#B0B0B0' }]}>
              <Text style={styles.cardTitle}>{item.parametro}</Text>
              <Text>Intervalo: {item.valor_minimo} - {item.valor_maximo}</Text>
              <Text>Valor Alvo: {item.valor_alvo}</Text>
              <Text>Produto para Aumentar: {item.produto_aumentar}</Text>
              <Text>Produto para Diminuir: {item.produto_diminuir}</Text>

              {/* Botão Ativar/Desativar com Switch */}
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>
                  {item.ativo ? 'Ativo' : 'Desativado'}
                </Text>
                <Switch
                  value={item.ativo}
                  onValueChange={async (value) => {
                    try {
                      // Atualiza o estado no backend
                      await axios.put(`${Config.API_URL}/parametros-quimicos/${item.id}`, {
                        ...item,
                        ativo: value, // Atualiza o campo 'ativo'
                      });

                      // Atualiza o estado localmente após sucesso
                      setParametros((prev) =>
                        prev.map((parametro) =>
                          parametro.id === item.id
                            ? { ...parametro, ativo: value }
                            : parametro
                        )
                      );

                      Alert.alert(
                        'Sucesso',
                        `Parâmetro ${value ? 'ativado' : 'desativado'} com sucesso!`
                      );
                    } catch (error) {
                      console.error('Erro ao alternar ativo:', error);
                      Alert.alert('Erro', 'Não foi possível alterar o estado do parâmetro.');
                    }
                  }}
                />
              </View>

              {/* Botões Editar e Apagar */}
<View style={styles.buttonRow}>
  <TouchableOpacity style={styles.editButton} onPress={() => abrirModal(item)}>
    <Text style={styles.buttonText}>Editar</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.deleteButton} onPress={() => apagarParametro(item.id)}>
    <Text style={styles.buttonText}>Apagar</Text>
  </TouchableOpacity>
</View>
</View>
)}
ListEmptyComponent={<Text style={styles.emptyText}>Nenhum parâmetro encontrado.</Text>}

// 🔹 Adiciona espaço extra para evitar que o botão seja cortado
contentContainerStyle={styles.listPadding}
ListFooterComponent={
  <View style={styles.footer}>
    <TouchableOpacity style={styles.addButton} onPress={() => abrirModal()}>
      <Text style={styles.addButtonText}>Adicionar Parâmetro</Text>
    </TouchableOpacity>
     <View style={styles.footer}>
      <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
      <Text style={styles.subTitle}>powered by GESPOOL</Text>
    </View>
  </View>
}
/>
  {modalVisible && (
  <Modal visible={modalVisible} animationType="slide">
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modalContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          {/* 🔹 Botão de voltar no canto superior esquerdo */}
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.innerContainer}>
          <Text style={styles.modalTitle}>Parâmetro Químico</Text>

        {/* 1) Picker do parâmetro */}
<View style={[styles.pickerContainer, { backgroundColor: '#FFFFFF' }]}>
  <Picker
    selectedValue={parametroSelecionado?.parametro}
    onValueChange={(itemValue) =>
      setParametroSelecionado({ ...parametroSelecionado!, parametro: itemValue })
    }
    style={[styles.picker, { backgroundColor: '#FFFFFF', color: '#000000' }]}
    dropdownIconColor={'#000000'}
    mode="dropdown"
  >
    <Picker.Item
      label="Escolha um Parâmetro"
      value=""
      color="#000000"
    />
    {PARAMETROS_VALIDOS.map((parametro) => (
      <Picker.Item
        key={parametro}
        label={parametro}
        value={parametro}
        color={isDarkMode ? '#FFFFFF' : '#000000'}
      />
    ))}
  </Picker>
</View>

{/* 2) Intervalo Ideal (Min / Alvo / Máx na mesma “caixa”) */}
<Text style={styles.titleText}>Intervalo Ideal</Text>

<View style={styles.dosagemCard}>
  <View style={styles.dosagemRow}>
    {/* Min */}
    <View style={styles.dosagemField}>
      <Text style={styles.dosagemMiniLabel}>Min</Text>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="0"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.valor_minimo || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({ ...parametroSelecionado!, valor_minimo: formattedText });
        }}
        placeholderTextColor="#888"
      />
    </View>

    {/* Valor alvo (label em baixo do input) */}
    <View style={styles.dosagemField}>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="Alvo"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.valor_alvo || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({ ...parametroSelecionado!, valor_alvo: formattedText });
        }}
        placeholderTextColor="#888"
      />
      <Text style={styles.dosagemMiniLabel}>Valor Alvo</Text>
    </View>

    {/* Máx */}
    <View style={styles.dosagemField}>
      <Text style={styles.dosagemMiniLabel}>Máx</Text>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="0"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.valor_maximo || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({ ...parametroSelecionado!, valor_maximo: formattedText });
        }}
        placeholderTextColor="#888"
      />
    </View>
  </View>
</View>

<View style={styles.divider} />

{/* 4) Produto Aumentar */}

<Text style={styles.titleText}>Produto para Aumentar</Text>
<TextInput
  style={styles.input}
  placeholder="Produto"
  placeholderTextColor="#888"
  value={parametroSelecionado?.produto_aumentar}
  onChangeText={(text) =>
    setParametroSelecionado({ ...parametroSelecionado!, produto_aumentar: text })
  }
/>

{/* 5) Dosagem Aumentar */}
<Text style={styles.titleText}>Dosagem para Aumentar</Text>

<View style={styles.dosagemCard}>
  <View style={styles.dosagemRow}>
    {/* Kg */}
    <View style={styles.dosagemField}>
      <Text style={styles.dosagemMiniLabel}>Kg</Text>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="1.5"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.dosagem_aumentar || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({
            ...parametroSelecionado!,
            dosagem_aumentar: formattedText,
          });
        }}
        placeholderTextColor="#888"
      />
    </View>

    {/* para aumentar (em 2 linhas para poupar espaço) */}
    <Text style={styles.dosagemMiddleText}>{'para\n aumentar'}</Text>

    {/* Unid/ppm */}
    <View style={styles.dosagemField}>
      <Text style={styles.dosagemMiniLabel}>Unid/ppm</Text>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="0.2"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.incremento_aumentar || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({
            ...parametroSelecionado!,
            incremento_aumentar: formattedText,
          });
        }}
        placeholderTextColor="#888"
      />
    </View>

    {/* em */}
    <Text style={[styles.dosagemMiddleText, { marginTop: 22 }]}>{'em'}</Text>

    {/* m³ */}
    <View style={styles.dosagemField}>
      <Text style={styles.dosagemMiniLabel}>m³</Text>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="100"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.volume_calculo || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({
            ...parametroSelecionado!,
            volume_calculo: formattedText,
          });
        }}
        placeholderTextColor="#888"
      />
    </View>
  </View>

  {/* ✅ Frase “tipo rótulo CTX” (sem unidadeDoParametro) */}
  <Text style={styles.dosagemPreview}>
    {formatDosagemFrase(parametroSelecionado, 'aumentar')}
  </Text>
</View>

<View style={styles.divider} />

{/* 6) Produto Diminuir */}
<Text style={styles.titleText}>Produto para Diminuir</Text>
<TextInput
  style={styles.input}
  placeholder="Produto"
  placeholderTextColor="#888"
  value={parametroSelecionado?.produto_diminuir}
  onChangeText={(text) =>
    setParametroSelecionado({ ...parametroSelecionado!, produto_diminuir: text })
  }
/>

{/* 7) Dosagem Diminuir */}
<Text style={styles.titleText}>Dosagem para Diminuir</Text>

<View style={styles.dosagemCard}>
  <View style={styles.dosagemRow}>
    {/* Kg */}
    <View style={styles.dosagemField}>
      <Text style={styles.dosagemMiniLabel}>Kg</Text>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="1.5"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.dosagem_diminuir || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({
            ...parametroSelecionado!,
            dosagem_diminuir: formattedText,
          });
        }}
        placeholderTextColor="#888"
      />
    </View>

    {/* para reduzir (em 2 linhas para poupar espaço) */}
    <Text style={styles.dosagemMiddleText}>{'para\n reduzir'}</Text>

    {/* Unid/ppm */}
    <View style={styles.dosagemField}>
      <Text style={styles.dosagemMiniLabel}>Unid/ppm</Text>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="0.2"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.incremento_diminuir || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({
            ...parametroSelecionado!,
            incremento_diminuir: formattedText,
          });
        }}
        placeholderTextColor="#888"
      />
    </View>

    {/* em */}
    <Text style={[styles.dosagemMiddleText, { marginTop: 22 }]}>{'em'}</Text>

    {/* m³ */}
    <View style={styles.dosagemField}>
      <Text style={styles.dosagemMiniLabel}>m³</Text>
      <TextInput
        style={styles.dosagemMiniInput}
        placeholder="100"
        keyboardType="decimal-pad"
        value={parametroSelecionado?.volume_calculo || ''}
        onChangeText={(text) => {
          const formattedText = text
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');
          setParametroSelecionado({
            ...parametroSelecionado!,
            volume_calculo: formattedText,
          });
        }}
        placeholderTextColor="#888"
      />
    </View>
  </View>

  {/* ✅ Frase “tipo rótulo CTX” */}
  <Text style={styles.dosagemPreview}>
    {formatDosagemFrase(parametroSelecionado, 'diminuir')}
  </Text>
</View>


{/* Botões */}
<TouchableOpacity style={styles.saveButton} onPress={salvarParametro}>
  <Text style={styles.buttonText}>Salvar</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
  <Text style={styles.buttonText}>Cancelar</Text>
</TouchableOpacity>

        </View>
         {/* 🔹 Nome da empresa e powered by no rodapé */}
            <View style={styles.footer}>
              <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
              <Text style={styles.subTitle}>powered by GESPOOL</Text>
            </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>
)}
    </View>
    </KeyboardAvoidingView>
  );

};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    },
    flexContainer: {
      flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 0,
     },
     buttonRow: {
        flexDirection: 'row', // Alinha os botões lado a lado
        justifyContent: 'space-between', // Adiciona espaço entre os botões
        marginTop: 16, // Espaço acima dos botões
      },
      input: {
        width: '98%',
        backgroundColor: '#FFF',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        fontSize: 16,
        color: '#000',
        // sombra leve
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 8,
        },

      medioInput: {
        width: 80, // 🔹 Maior que o smallInput, mas menor que o input normal
        height: 50, // 🔹 Levemente maior para melhor legibilidade
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10, // 🔹 Ajusta o espaçamento interno
        textAlign: 'center', // 🔹 Centraliza o texto dentro do campo
        marginHorizontal: 15, // 🔹 Espaçamento igual nos dois lados
        backgroundColor: 'white',
        marginBottom: 20,
     },
      smallInput: {
        width: 60, // Ajuste a largura conforme necessário
        height: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 8,
        textAlign: 'center',
        marginHorizontal: 10, // 🔹 Adiciona margem de 10px à esquerda e à direita
        marginVertical: 0,
        backgroundColor: 'white',
        marginBottom: 20,
    },
    card: {
      padding: 10,
      marginVertical: 8,
      marginHorizontal: 16,
      backgroundColor: isDarkMode ? '#FFF' : '#000',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 10,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#333',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      marginBottom: 10,
    },
    switchText: {
      fontSize: 16,
      color: '#555',
      marginRight: 8,
    },
    editButton: {
      backgroundColor: '#22b4b4ff',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 18,
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 2,
      shadowRadius: 4.65,
      elevation: 8, 
    },
    deleteButton: {
      backgroundColor: '#FFB3B3',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 18,
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 2,
      shadowRadius: 4.65,
      elevation: 8, 
    },
    buttonText: {
      color: '#000',
      fontSize: 16,
      fontWeight: 'bold',
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: '#777',
    },
    addButton: {
      backgroundColor: '#22b4b4ff',
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 25,
      marginBottom: 15,
      width: '60%',
      alignItems: 'center',
      // 🔹 Remove o contorno preto
      borderWidth: 0,
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4.65,
      elevation: 10, // ← dá profundidade real no Android
    },
    addButtonText: {
      color: '#000',
      fontSize: 16,
      fontWeight: 'bold',
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingBottom: 50, // 🔹 Evita que o teclado cubra os campos
    },
    innerContainer: {
      width: '100%',
      alignItems: 'center',
    },
    toggleButton: {
      padding: 10,
      borderRadius: 8,
      marginTop: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonActive: {
      backgroundColor: '#32CD32', // Verde para ativo
    },
    buttonInactive: {
      backgroundColor: '#FF6347', // Vermelho para desativado
    },
    modalContainer: {
      flex: 1,
      backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    saveButton: {
      backgroundColor: '#22b4b4ff', // Azul claro
      paddingVertical: 12,
      paddingHorizontal: 40,
      borderRadius: 25, // Cantos arredondados
      marginTop: 20,
      marginBottom: 10, // Espaçamento abaixo
      width: '80%', // Botão maior
      alignItems: 'center', // Centraliza o texto dentro do botão
      alignSelf: 'center', // Centraliza o botão no ecrã
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4.65,
      elevation: 10, // ← dá profundidade real no Android
    },
    cancelButton: {
      backgroundColor: '#FFB3B3', // Vermelho tomate para indicar erro
      padding: 15,
      paddingVertical: 12,
      paddingHorizontal: 40,
      borderRadius: 25,
      marginBottom: 15,
      width: '80%',
      alignItems: 'center',
      alignSelf: 'center',
      marginTop: 10,
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4.65,
      elevation: 10, // ← dá profundidade real no Android
    },
    pickerContainer: {
      width: '98%',
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 20,
      backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
      // 🔹 Sombra 3D leve e elegante
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4.65,
      elevation: 10,
    },
    picker: {
      backgroundColor: '#333', // 🔹 Cor do texto dentro do Picker
      width: '100%',
      height: 50,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-start', // 🔹 Alinha o botão à esquerda
      width: '100%',
      paddingTop: 20,
      paddingBottom: 10,
    },
    backButton: {
      paddingHorizontal: 15,
      paddingVertical: 10,
    },
    backButtonText: {
      fontSize: 16,
      color: '#000',
      fontWeight: 'bold',
    },
    titleText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
      marginTop: 10,
      marginBottom: 5, // 🔹 Aumenta o espaço entre o título e o input
    },
    listPadding: {
      paddingBottom: 120, // Garante espaço extra na parte inferior da lista
    },
    footer: {
      marginTop: 20,
      marginBottom: 30, // 🔹 Garante que o botão tenha espaço no final da lista
      alignItems: 'center',
    },
    empresaNome: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#000',
      marginTop: 20,
    },
    subTitle: {
      fontSize: 12,
      fontStyle: 'italic',
      color: '#444',
      marginTop: 2,
    },
    fieldBlock: {
      flex: 1,
      alignItems: 'center',
    },

    fieldLabel: {
      fontSize: 12,
      color: '#444',
      marginBottom: 4,
      fontWeight: '600',
    },

    divider: {
      height: 1,
      width: '100%',
      backgroundColor: '#bbb',
      marginVertical: 12,
      opacity: 0.8,
    },

    dosagemLabel: {
      fontSize: 11,
      color: '#444',
      marginBottom: 4,
      fontWeight: '600',
    },

    dosagemInput: {
      width: 70,
      height: 42,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 10,
      paddingHorizontal: 8,
      textAlign: 'center',
      backgroundColor: '#fff',
    },

    dosagemInlineText: {
      fontSize: 13,
      color: '#333',
      marginHorizontal: 6,
      fontWeight: '600',
    },

    dosagemCard: {
      width: '98%',
      backgroundColor: '#e9e9e9',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      marginTop: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 8,
    },

    dosagemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },

    dosagemField: {
      alignItems: 'center',
    },

    dosagemMiniLabel: {
      fontSize: 11,
      color: '#444',
      marginBottom: 4,
      fontWeight: '600',
    },

    dosagemMiniInput: {
      width: 62, // 🔹 mais pequeno para caber tudo numa linha
      height: 42,
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#cfcfcf',
      textAlign: 'center',
      fontSize: 14,
      paddingVertical: 6,
    },

    dosagemMiddleText: {
      fontSize: 12,
      color: '#333',
      fontWeight: '600',
      marginTop: 16,
      textAlign: 'center',
      lineHeight: 14,
    },

    dosagemPreview: {
      marginTop: 8,
      textAlign: 'center',
      fontSize: 12,
      color: '#111',
     fontWeight: '600',
},
  });
export default ParametrosQuimicosScreen;
