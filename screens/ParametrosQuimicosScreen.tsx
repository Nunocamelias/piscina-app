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

  // Função para buscar o empresaid do AsyncStorage
  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        console.log('[DEBUG] Tentando carregar o empresaid do AsyncStorage...');
        const empresaid = await AsyncStorage.getItem('empresaid');

        if (empresaid) {
          console.log('[DEBUG] Empresaid encontrado:', empresaid);
          setUserEmpresaid(parseInt(empresaid, 10));
        } else {
          console.log('[DEBUG] Empresaid não encontrado. Mostrando alerta.');
          Alert.alert('Erro', 'Empresaid não encontrado. Por favor, faça login novamente.');
          setUserEmpresaid(null); // Define como null caso não seja encontrado
        }
      } catch (error) {
        console.error('[DEBUG] Erro ao carregar empresaid:', error);
        Alert.alert('Erro', 'Não foi possível carregar o empresaid.');
        setUserEmpresaid(null); // Define como null em caso de erro
      }
    };

    fetchEmpresaid();
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

         {/* 1ª linha: Nome do parâmetro com o array */}
<View style={[styles.pickerContainer, { backgroundColor: '#FFFFFF' }]}>
  <Picker
    selectedValue={parametroSelecionado?.parametro}
    onValueChange={(itemValue) =>
      setParametroSelecionado({ ...parametroSelecionado!, parametro: itemValue })
    }
    style={[
      styles.picker,
      { backgroundColor: '#FFFFFF', color: '#000000' } // força texto preto e fundo branco
    ]}
    dropdownIconColor={'#000000'}
    mode="dropdown" // 🔹 garante o estilo dropdown (não dialog)
  >
    <Picker.Item label="Escolha um Parâmetro" value="" color="#333333" />
    {PARAMETROS_VALIDOS.map((parametro) => (
      <Picker.Item key={parametro} label={parametro} value={parametro} color="#000000" />
    ))}
  </Picker>
</View>



          {/* 2ª linha: Intervalo ideal */}
          <Text style={styles.titleText}>Intervalo Ideal:</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Mín"
              keyboardType="decimal-pad"
              value={parametroSelecionado?.valor_minimo || ''}
              onChangeText={(text) => {
                const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
                setParametroSelecionado({ ...parametroSelecionado!, valor_minimo: formattedText });
              }}
              placeholderTextColor="#888"
            />
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Máx"
              keyboardType="decimal-pad"
              value={parametroSelecionado?.valor_maximo || ''}
              onChangeText={(text) => {
                const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
                setParametroSelecionado({ ...parametroSelecionado!, valor_maximo: formattedText });
              }}
              placeholderTextColor="#888"
            />
          </View>

          {/* 3ª linha: Valor Alvo */}
          <Text style={styles.titleText}>Valor Alvo:</Text>
          <TextInput
            style={styles.medioInput}
            placeholder="Alvo"
            keyboardType="decimal-pad"
            value={parametroSelecionado?.valor_alvo || ''}
            onChangeText={(text) => {
              const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
              setParametroSelecionado({ ...parametroSelecionado!, valor_alvo: formattedText });
            }}
            placeholderTextColor="#888"
          />

          {/* 4ª linha: Produto para aumentar */}
          <Text style={styles.titleText}>Produto para Aumentar:</Text>
          <TextInput
            style={styles.input}
            placeholder="Produto"
            placeholderTextColor="#888"
            value={parametroSelecionado?.produto_aumentar}
            onChangeText={(text) =>
              setParametroSelecionado({
                ...parametroSelecionado!,
                produto_aumentar: text,
              })
            }
          />

            {/* 5ª linha: Dosagem para aumentar */}
            <Text style={styles.titleText}>Dosagem para Aumentar:</Text>
            <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Kg"
              keyboardType="decimal-pad" // Teclado para números com decimais
              value={parametroSelecionado?.dosagem_aumentar || ''} // Trabalha diretamente como string
              onChangeText={(text) => {
              const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'); // Permite apenas números e um ponto
              setParametroSelecionado({
              ...parametroSelecionado!,
              dosagem_aumentar: formattedText, // Atualiza como string
            });
           }}
           placeholderTextColor="#888"
          />
            <Text>para incrementar</Text>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder=""
              keyboardType="decimal-pad" // Teclado para números com decimais
              value={parametroSelecionado?.incremento_aumentar || ''} // Trabalha diretamente como string
              onChangeText={(text) => {
              const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'); // Permite apenas números e um ponto
              setParametroSelecionado({
              ...parametroSelecionado!,
              incremento_aumentar: formattedText, // Atualiza como string
            });
           }}
           placeholderTextColor="#888"
          />
            <Text>em</Text>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="m³"
              keyboardType="decimal-pad" // Teclado para números com decimais
              value={parametroSelecionado?.volume_calculo || ''} // Trabalha diretamente como string
              onChangeText={(text) => {
              const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'); // Permite apenas números e um ponto
              setParametroSelecionado({
              ...parametroSelecionado!,
              volume_calculo: formattedText, // Atualiza como string
            });
           }}
           placeholderTextColor="#888"
          />
            </View>

            {/* 6ª linha: Produto para diminuir */}
            <Text style={styles.titleText}>Produto para Diminuir:</Text>
            <TextInput
              style={styles.input}
              placeholder="Produto"
              placeholderTextColor="#888"
              value={parametroSelecionado?.produto_diminuir}
              onChangeText={(text) =>
                setParametroSelecionado({
                  ...parametroSelecionado!,
                  produto_diminuir: text,
                })
              }
            />

            {/* 7ª linha: Dosagem para diminuir */}
          <Text style={styles.titleText}>Dosagem para Diminuir:</Text>
          <View style={styles.row}>
          <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Kg"
              keyboardType="decimal-pad" // Teclado para números com decimais
              value={parametroSelecionado?.dosagem_diminuir || ''} // Trabalha diretamente como string
              onChangeText={(text) => {
              const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'); // Permite apenas números e um ponto
              setParametroSelecionado({
              ...parametroSelecionado!,
              dosagem_diminuir: formattedText, // Atualiza como string
            });
           }}
           placeholderTextColor="#888"
          />
              <Text>para reduzir</Text>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder=""
                keyboardType="decimal-pad" // Teclado para números com decimais
                value={parametroSelecionado?.incremento_diminuir || ''} // Trabalha diretamente como string
                onChangeText={(text) => {
                const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'); // Permite apenas números e um ponto
                setParametroSelecionado({
                ...parametroSelecionado!,
                incremento_diminuir: formattedText, // Atualiza como string
             });
            }}
           placeholderTextColor="#888"
          />
            <Text>em</Text>
            <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="m³"
                keyboardType="decimal-pad" // Teclado para números com decimais
                value={parametroSelecionado?.volume_calculo || ''} // Trabalha diretamente como string
                onChangeText={(text) => {
                const formattedText = text.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'); // Permite apenas números e um ponto
                setParametroSelecionado({
                ...parametroSelecionado!,
                volume_calculo: formattedText, // Atualiza como string
              });
             }}
           placeholderTextColor="#888"
          />
            </View>


            {/* Botões para Salvar e Cancelar */}
          <TouchableOpacity style={styles.saveButton} onPress={salvarParametro}>
            <Text style={styles.buttonText}>Salvar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
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
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        width: '100%',
        marginVertical: 5,
        backgroundColor: 'white',
        marginBottom: 20,
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
      elevation: 2,
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
      backgroundColor: '#4CAF50',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 4,
    },
    deleteButton: {
      backgroundColor: '#F44336',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 4,
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
    footer: {
      marginTop: 20,
      marginBottom: 30, // 🔹 Garante que o botão tenha espaço no final da lista
      alignItems: 'center',
    },
    addButton: {
      backgroundColor: '#ADD8E6', // Azul claro
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 25, // Cantos arredondados
      width: '90%', // Mantém a largura fixa
      alignItems: 'center', // Centraliza o texto dentro do botão
      borderWidth: 1.2, // Moldura preta ao botão
      borderColor: '#000',
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
    backgroundColor: '#ADD8E6',
    paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 25, // Cantos arredondados
      width: '100%', // Mantém a largura fixa
      alignItems: 'center', // Centraliza o texto dentro do botão
      borderWidth: 1.2, // Moldura preta ao botão
      borderColor: '#000',
  },
    cancelButton: {
      backgroundColor: '#FFB3B3',
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 25, // Cantos arredondados
      width: '100%', // Mantém a largura fixa
      alignItems: 'center', // Centraliza o texto dentro do botão
      borderWidth: 1.2, // Moldura preta ao botão
      borderColor: '#000',
      marginTop: 10,
    },
    pickerContainer: {
      width: '100%',
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 20,
      backgroundColor: isDarkMode ? '#FFFFFF' : '#FFFFFF',
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
      marginBottom: 5, // 🔹 Aumenta o espaço entre o título e o input
    },
    listPadding: {
      paddingBottom: 120, // Garante espaço extra na parte inferior da lista
    },
  });
export default ParametrosQuimicosScreen;