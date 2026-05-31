import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Appearance, FlatList, Alert, ActivityIndicator, Modal, TextInput, TouchableOpacity, } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const isDarkMode = Appearance.getColorScheme() === 'dark';

type ContaCliente = {
  cliente_id: number;
  nome: string;
  morada: string;
  valor_manutencao: string | number | null;
  pagamento_id: number | null;
  mes_referencia: string | null;
  valor_extra: string | number | null;
  valor_pago: string | number | null;
  estado: string | null;
  observacoes: string | null;
  data_pagamento: string | null;
  saldo_mes: string | number | null;
  saldo_anterior: string | number | null;
  saldo_total: string | number | null;
};

const ContaCorrenteClientesScreen = () => {
  const [clientes, setClientes] = useState<ContaCliente[]>([]);
  const [mesReferencia, setMesReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresaid, setEmpresaid] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ContaCliente | null>(null);
  const [valorPagoInput, setValorPagoInput] = useState('');
  const [valorExtraInput, setValorExtraInput] = useState('');
  const [observacoesInput, setObservacoesInput] = useState('');
  const [pesquisa, setPesquisa] = useState('');

  const carregarContaCorrente = useCallback(async (empresaIdAtual: number) => {
    setLoading(true);

    try {
      const response = await axios.get(`${Config.API_URL}/conta-corrente-clientes`, {
        params: { empresaid: empresaIdAtual },
      });

      setMesReferencia(response.data.mes_referencia);
      setClientes(response.data.clientes || []);
    } catch (error) {
      console.error('Erro ao carregar conta corrente:', error);
      Alert.alert('Erro', 'Não foi possível carregar a conta corrente dos clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const iniciar = async () => {
      const empresaIdStorage = await AsyncStorage.getItem('empresaid');

      if (!empresaIdStorage) {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        return;
      }

      const empresaIdNum = Number(empresaIdStorage);
      setEmpresaid(empresaIdNum);
      carregarContaCorrente(empresaIdNum);
    };

    iniciar();
  }, [carregarContaCorrente]);

  const formatEuro = (valor: string | number | null) => {
    const n = Number(valor || 0);
    return `${n.toFixed(2)} €`;
  };

  const abrirModalPagamento = (cliente: ContaCliente) => {
  setClienteSelecionado(cliente);
  setValorPagoInput(String(cliente.saldo_mes || cliente.valor_manutencao || ''));
  setValorExtraInput(String(cliente.valor_extra || '0'));
  setObservacoesInput(cliente.observacoes || '');
  setModalVisible(true);
  };

  const guardarPagamento = async () => {
  if (!clienteSelecionado || !empresaid || !mesReferencia) {
    Alert.alert('Erro', 'Dados incompletos para registar pagamento.');
    return;
  }

  try {
    const valorPago = Number(valorPagoInput.replace(',', '.')) || 0;
    const valorExtra = Number(valorExtraInput.replace(',', '.')) || 0;

    const response = await axios.post(`${Config.API_URL}/conta-corrente-clientes/pagamento`, {
      cliente_id: clienteSelecionado.cliente_id,
      empresaid,
      mes_referencia: mesReferencia,
      valor_manutencao: Number(clienteSelecionado.valor_manutencao || 0),
      valor_extra: valorExtra,
      valor_pago: valorPago,
      observacoes: observacoesInput,
    });

    if (response.status === 200) {
      Alert.alert('Sucesso', response.data.message || 'Pagamento registado.');
      setModalVisible(false);
      setClienteSelecionado(null);
      carregarContaCorrente(empresaid);
    }
  } catch (error) {
    console.error('Erro ao guardar pagamento:', error);
    Alert.alert('Erro', 'Não foi possível registar o pagamento.');
  }
};

  const clientesFiltrados = clientes.filter((cliente) =>
  cliente.nome.toLowerCase().includes(pesquisa.toLowerCase().trim())
);

  const formatSaldoTotal = (valor: string | number | null) => {
  const n = Number(valor || 0);

  if (n < 0) {
    return `Crédito: ${Math.abs(n).toFixed(2)} €`;
  }

  return `Saldo total: ${n.toFixed(2)} €`;
};


  const renderItem = ({ item }: { item: ContaCliente }) => {
    const estado = item.estado || 'pendente';

    return (
      <View style={styles.card}>
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.morada}>{item.morada}</Text>

        <Text style={styles.mesReferencia}>
  Referente a: {mesReferencia || '-'}
</Text>

        <View style={styles.linha}>
          <Text style={styles.label}>Mensalidade:</Text>
          <Text style={styles.valor}>{formatEuro(item.valor_manutencao)}</Text>
        </View>

        <View style={styles.linha}>
          <Text style={styles.label}>Extras:</Text>
          <Text style={styles.valor}>{formatEuro(item.valor_extra)}</Text>
        </View>

        <View style={styles.linha}>
          <Text style={styles.label}>Pago:</Text>
          <Text style={styles.valor}>{formatEuro(item.valor_pago)}</Text>
        </View>

        <View style={styles.linha}>
          <Text style={styles.label}>Saldo anterior:</Text>
          <Text style={styles.valor}>{formatEuro(item.saldo_anterior)}</Text>
        </View>

        {Number(item.saldo_total || 0) >= 0 ? (
  <>
    <View style={styles.linha}>
      <Text style={styles.label}>Saldo do mês:</Text>
      <Text style={styles.valor}>{formatEuro(item.saldo_mes)}</Text>
    </View>

    <View style={styles.linha}>
      <Text style={styles.label}>Saldo total:</Text>
      <Text style={styles.saldo}>{formatEuro(item.saldo_total)}</Text>
    </View>
  </>
) : (
  <View style={styles.linha}>
    <Text style={styles.label}>Crédito disponível:</Text>
    <Text style={styles.saldo}>
      {Math.abs(Number(item.saldo_total || 0)).toFixed(2)} €
    </Text>
  </View>
)}

        <Text style={styles.estado}>Estado: {estado}</Text>
        {item.observacoes ? (
        <Text style={styles.observacoes}>Obs: {item.observacoes}</Text>
        ) : null}
        <TouchableOpacity
           style={styles.pagamentoButton}
           onPress={() => abrirModalPagamento(item)}>

        <Text style={styles.pagamentoButtonText}>Registar / Editar Pagamento</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conta Corrente de Clientes</Text>
      <Text style={styles.subTitle}>
  Mensalidades referentes a: {mesReferencia || '-'}
</Text>
      <TextInput
  style={styles.searchInput}
  placeholder="Pesquisar cliente..."
  placeholderTextColor="#666"
  value={pesquisa}
  onChangeText={setPesquisa}
/>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={clientesFiltrados}
          keyExtractor={(item) => item.cliente_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum cliente encontrado.</Text>
          }
        />
      )}
      <Modal
  visible={modalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        Registar Pagamento
      </Text>

      <Text style={styles.modalCliente}>
        {clienteSelecionado?.nome}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Valor pago"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={valorPagoInput}
        onChangeText={setValorPagoInput}
      />

      <TextInput
        style={styles.input}
        placeholder="Valor extra"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={valorExtraInput}
        onChangeText={setValorExtraInput}
      />

      <TextInput
        style={[styles.input, styles.inputObservacoes]}
        placeholder="Observações"
        placeholderTextColor="#666"
        value={observacoesInput}
        onChangeText={setObservacoesInput}
        multiline
      />

      <TouchableOpacity style={styles.modalSaveButton} onPress={guardarPagamento}>
        <Text style={styles.modalButtonText}>Guardar Pagamento</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modalCancelButton}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.modalButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#D3D3D3' : '#D3D3D3',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 18,
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#22b4b4ff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    width: '92%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 8,
  },
  nome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  morada: {
    fontSize: 13,
    color: '#111',
    marginBottom: 12,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  valor: {
    fontSize: 15,
    color: '#000',
  },
  saldo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  estado: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyText: {
    textAlign: 'center',
    color: '#000',
    marginTop: 40,
  },
  pagamentoButton: {
  backgroundColor: '#CCFFCC',
  marginTop: 12,
  paddingVertical: 10,
  borderRadius: 20,
  alignItems: 'center',

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.20,
  shadowRadius: 3,
  elevation: 4,
  },
  pagamentoButtonText: {
  color: '#000',
  fontSize: 15,
  fontWeight: 'bold',
  },
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},

modalContent: {
  width: '100%',
  backgroundColor: '#D3D3D3',
  borderRadius: 22,
  padding: 20,
  alignItems: 'center',
},

modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#000',
  marginBottom: 8,
},

modalCliente: {
  fontSize: 16,
  fontWeight: '600',
  color: '#000',
  marginBottom: 18,
  textAlign: 'center',
},

input: {
  width: '100%',
  backgroundColor: '#fff',
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 10,
  marginBottom: 12,
  color: '#000',
  fontSize: 15,
},

inputObservacoes: {
  minHeight: 80,
  textAlignVertical: 'top',
},

modalSaveButton: {
  backgroundColor: '#CCFFCC',
  width: '100%',
  paddingVertical: 12,
  borderRadius: 20,
  alignItems: 'center',
  marginTop: 8,
},

modalCancelButton: {
  backgroundColor: '#FFB3B3',
  width: '100%',
  paddingVertical: 12,
  borderRadius: 20,
  alignItems: 'center',
  marginTop: 10,
},

modalButtonText: {
  color: '#000',
  fontSize: 15,
  fontWeight: 'bold',
},
searchInput: {
  backgroundColor: '#fff',
  width: '92%',
  alignSelf: 'center',
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 10,
  marginBottom: 16,
  color: '#000',
  fontSize: 15,
},
observacoes: {
  marginTop: 6,
  fontSize: 13,
  color: '#000',
  fontStyle: 'italic',
},
mesReferencia: {
  fontSize: 13,
  color: '#000',
  fontWeight: '600',
  marginBottom: 10,
},

});

export default ContaCorrenteClientesScreen;