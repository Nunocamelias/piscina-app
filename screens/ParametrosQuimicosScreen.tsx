import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, Modal, StyleSheet, Switch, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Importando o Picker para o dropdown
import axios from 'axios';
import Config from 'react-native-config';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';


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
  valor_minimo: number;
  valor_maximo: number;
  valor_alvo: number;
  produto_aumentar: string;
  produto_diminuir: string;
  dosagem_aumentar: number;
  dosagem_diminuir: number;
  incremento_aumentar: number;
  incremento_diminuir: number;
  volume_calculo: number;
  ativo: boolean;
};

const ParametrosQuimicosScreen: React.FC = () => {
  const navigation = useNavigation();
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
  const fetchParametros = async () => {
    if (!userEmpresaid) {
      Alert.alert('Erro', 'Empresaid não disponível. Certifique-se de que fez login corretamente.');
      return;
    }
  
    try {
      console.log('[DEBUG] Buscando parâmetros químicos com empresaid:', userEmpresaid);
  
      const response = await axios.get(`${Config.API_URL}/parametros-quimicos`, {
        params: { empresaid: userEmpresaid, ativo: true },
      });
      setParametros(response.data);
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar parâmetros químicos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os parâmetros químicos.');
    }
  };

  useEffect(() => {
    if (userEmpresaid) {
      fetchParametros();
    }
  }, [userEmpresaid]);
  


  // Função para salvar ou atualizar um parâmetro
  const salvarParametro = async () => {
    if (!parametroSelecionado || !parametroSelecionado.parametro) {
      Alert.alert('Erro', 'Selecione um parâmetro válido.');
      return;
    }
  
    if (!userEmpresaid) {
      Alert.alert('Erro', 'Empresaid não disponível. Certifique-se de que fez login corretamente.');
      return;
    }
  
    try {
      // Incluímos o empresaid no corpo do pedido
      const parametroComEmpresaid = { ...parametroSelecionado, empresaid: userEmpresaid };
  
      if (parametroSelecionado.id) {
        await axios.put(
          `${Config.API_URL}/parametros-quimicos/${parametroSelecionado.id}`,
          parametroComEmpresaid
        );
      } else {
        await axios.post(`${Config.API_URL}/parametros-quimicos`, parametroComEmpresaid);
      }
  
      Alert.alert('Sucesso', 'Parâmetro salvo com sucesso!');
      fetchParametros(); // Atualiza os dados após salvar
      setModalVisible(false); // Fecha o modal
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
      valor_minimo: 0,
      valor_maximo: 0,
      valor_alvo: 0,
      produto_aumentar: '',
      produto_diminuir: '',
      dosagem_aumentar: 0,
      dosagem_diminuir: 0,
      incremento_aumentar: 0,
      incremento_diminuir: 0,
      volume_calculo: 0,
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
    <View style={styles.container}>
      <FlatList
  data={parametros}
  keyExtractor={(item) => item.id.toString()}
  renderItem={({ item }) => (
    <View style={styles.card}>
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
/>


  
      <TouchableOpacity style={styles.addButton} onPress={() => abrirModal()}>
        <Text style={styles.addButtonText}>Adicionar Parâmetro</Text>
      </TouchableOpacity>
  
      {/* Modal para edição/adicionar */}
      {modalVisible && (
        <Modal visible={modalVisible} animationType="slide">
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Parâmetro Químico</Text>
  
            {/* 1ª linha: Nome do parâmetro com o array */}
            <Picker
              selectedValue={parametroSelecionado?.parametro}
              onValueChange={(itemValue) =>
                setParametroSelecionado({ ...parametroSelecionado!, parametro: itemValue })
              }
              style={styles.input}
            >
              {PARAMETROS_VALIDOS.map((parametro) => (
                <Picker.Item key={parametro} label={parametro} value={parametro} />
              ))}
            </Picker>
  
            {/* 2ª linha: Intervalo ideal */}
            <Text>Intervalo Ideal:</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="Mínimo"
                keyboardType="numeric"
                value={parametroSelecionado?.valor_minimo.toString()}
                onChangeText={(text) =>
                  setParametroSelecionado({
                    ...parametroSelecionado!,
                    valor_minimo: parseFloat(text) || 0,
                  })
                }
              />
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="Máximo"
                keyboardType="numeric"
                value={parametroSelecionado?.valor_maximo.toString()}
                onChangeText={(text) =>
                  setParametroSelecionado({
                    ...parametroSelecionado!,
                    valor_maximo: parseFloat(text) || 0,
                  })
                }
              />
            </View>
  
            {/* 3ª linha: Valor Alvo */}
            <Text>Valor Alvo:</Text>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Alvo"
              keyboardType="numeric"
              value={parametroSelecionado?.valor_alvo.toString()}
              onChangeText={(text) =>
                setParametroSelecionado({
                  ...parametroSelecionado!,
                  valor_alvo: parseFloat(text) || 0,
                })
              }
            />
  
            {/* 4ª linha: Produto para aumentar */}
            <Text>Produto para Aumentar:</Text>
            <TextInput
              style={styles.input}
              placeholder="Produto"
              value={parametroSelecionado?.produto_aumentar}
              onChangeText={(text) =>
                setParametroSelecionado({
                  ...parametroSelecionado!,
                  produto_aumentar: text,
                })
              }
            />
  
            {/* 5ª linha: Dosagem para aumentar */}
            <Text>Dosagem para Aumentar:</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="Kg"
                keyboardType="numeric"
                value={parametroSelecionado?.dosagem_aumentar.toString()}
                onChangeText={(text) =>
                  setParametroSelecionado({
                    ...parametroSelecionado!,
                    dosagem_aumentar: parseFloat(text) || 0,
                  })
                }
              />
              <Text>para incrementar</Text>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="Incremento"
                keyboardType="numeric"
                value={parametroSelecionado?.incremento_aumentar.toString()}
                onChangeText={(text) =>
                  setParametroSelecionado({
                    ...parametroSelecionado!,
                    incremento_aumentar: parseFloat(text) || 0,
                  })
                }
              />
              <Text>em</Text>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="m³"
                keyboardType="numeric"
                value={parametroSelecionado?.volume_calculo.toString()}
                onChangeText={(text) =>
                  setParametroSelecionado({
                    ...parametroSelecionado!,
                    volume_calculo: parseFloat(text) || 0,
                  })
                }
              />
            </View>
  
            {/* 6ª linha: Produto para diminuir */}
            <Text>Produto para Diminuir:</Text>
            <TextInput
              style={styles.input}
              placeholder="Produto"
              value={parametroSelecionado?.produto_diminuir}
              onChangeText={(text) =>
                setParametroSelecionado({
                  ...parametroSelecionado!,
                  produto_diminuir: text,
                })
              }
            />
  
            {/* 7ª linha: Dosagem para diminuir */}
            <Text>Dosagem para Diminuir:</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="Kg"
                keyboardType="numeric"
                value={parametroSelecionado?.dosagem_diminuir.toString()}
                onChangeText={(text) =>
                  setParametroSelecionado({
                    ...parametroSelecionado!,
                    dosagem_diminuir: parseFloat(text) || 0,
                  })
                }
              />
              <Text>para reduzir</Text>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="Incremento"
                keyboardType="numeric"
                value={parametroSelecionado?.incremento_diminuir.toString()}
                onChangeText={(text) =>
                  setParametroSelecionado({
                    ...parametroSelecionado!,
                    incremento_diminuir: parseFloat(text) || 0,
                  })
                }
              />
              <Text>em</Text>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="m³"
                keyboardType="numeric"
                value={parametroSelecionado?.volume_calculo.toString()}
                onChangeText={(text) =>
                  setParametroSelecionado({
                    ...parametroSelecionado!,
                    volume_calculo: parseFloat(text) || 0,
                  })
                }
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
        </Modal>
      )}
    </View>
  );
  
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f8f8f8',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 8,
     },
     buttonRow: {
        flexDirection: 'row', // Alinha os botões lado a lado
        justifyContent: 'space-between', // Adiciona espaço entre os botões
        marginTop: 16, // Espaço acima dos botões
      },
    smallInput: {
        width: 60, // Ajuste a largura conforme necessário
        height: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 8,
        textAlign: 'center', // Centraliza o texto no input
    },
    card: {
      padding: 10,
      marginVertical: 8,
      marginHorizontal: 16,
      backgroundColor: '#FFFFFF',
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
      color: '#FFF',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: '#777',
    },
    addButton: {
      backgroundColor: '#2196F3',
      padding: 15,
      borderRadius: 5,
      alignItems: 'center',
      marginTop: 20,
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
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    modalContainer: {
      flex: 1,
      padding: 20,
      backgroundColor: '#fff',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    input: {
      backgroundColor: '#f5f5f5',
      borderRadius: 5,
      padding: 10,
      marginBottom: 15,
      borderColor: '#ddd',
      borderWidth: 1,
    },
    saveButton: {
      backgroundColor: '#4CAF50',
      padding: 15,
      borderRadius: 5,
      alignItems: 'center',
      marginTop: 10,
    },
    cancelButton: {
      backgroundColor: '#f44336',
      padding: 15,
      borderRadius: 5,
      alignItems: 'center',
      marginTop: 10,
    },
  });
  

export default ParametrosQuimicosScreen;
