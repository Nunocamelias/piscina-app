import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const ReceberNotificacoesScreen = () => {
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [empresaid, setEmpresaid] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [responsaveis, setResponsaveis] = useState<{ [id: number]: string }>({});
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);
  const [mostrarModalImagem, setMostrarModalImagem] = useState(false);



  useEffect(() => {
    const fetchEmpresaid = async () => {
      const id = await AsyncStorage.getItem('empresaid');
      if (id) setEmpresaid(parseInt(id, 10));
      else Alert.alert('Erro', 'Empresaid não encontrado.');
    };
    fetchEmpresaid();
  }, []);

  useEffect(() => {
    const fetchNotificacoes = async () => {
      if (!empresaid) return;
      try {
        const res = await axios.get(`${Config.API_URL}/notificacoes`, {
          params: { empresaid },
        });
        setNotificacoes(res.data);
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        Alert.alert('Erro', 'Não foi possível carregar as notificações.');
      }
    };
    fetchNotificacoes();
  }, [empresaid]);

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id;

    const getStatusStyle = () => {
      switch (item.status) {
        case 'pendente':
          return styles.cardPendente;
        case 'em resolução':
          return styles.cardResolucao;
        case 'resolvido':
          return styles.cardResolvido;
        default:
          return styles.cardDefault;
      }
    };

    const salvarResponsavel = async (id: number) => {
        const nome = responsaveis[id];
        if (!nome) {
          Alert.alert('Atenção', 'Por favor, insira o nome do responsável.');
          return;
        }
      
        try {
          await axios.put(`${Config.API_URL}/notificacoes/${id}/update`, {
            atribuido_a: nome,
            empresaid,
          });
      
          setNotificacoes((prev) =>
            prev.map((notificacao) =>
              notificacao.id === id
                ? { ...notificacao, atribuido_a: nome }
                : notificacao
            )
          );
      
          Alert.alert('Sucesso', 'Responsável atualizado com sucesso!');
        } catch (error) {
          console.error('Erro ao salvar responsável:', error);
          Alert.alert('Erro', 'Falha ao atualizar o responsável.');
        }
      };

      const atualizarNotificacao = async (
        id: number,
        novoStatus?: string,
        novoResponsavel?: string
      ) => {
        try {
          await axios.put(`${Config.API_URL}/notificacoes/${id}/update`, {
            status: novoStatus,
            atribuido_a: novoResponsavel,
            empresaid,
          });
      
          setNotificacoes((prev) =>
            prev.map((n) =>
              n.id === id
                ? { ...n, status: novoStatus, atribuido_a: novoResponsavel }
                : n
            )
          );
        } catch (error) {
          Alert.alert('Erro', 'Não foi possível atualizar a notificação.');
        }
      };
      
      const apagarNotificacao = async (id: number) => {
        try {
          await axios.delete(`${Config.API_URL}/notificacoes/${id}`, {
            params: { empresaid },
          });
      
          setNotificacoes((prev) => prev.filter((n) => n.id !== id));
          Alert.alert('Sucesso', 'Notificação apagada com sucesso!');
        } catch (error) {
          Alert.alert('Erro', 'Erro ao apagar notificação.');
        }
      };
      
      

      return (
        <TouchableOpacity
          onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
          style={[styles.card, getStatusStyle()]}
        >
          <Text style={styles.cliente}>{item.cliente_nome}</Text>
          <Text style={styles.mensagem}>{item.mensagem}</Text>
          <Text style={styles.status}>Status: {item.status}</Text>
      
          {isExpanded && (
            <View style={styles.expandedContent}>
              <Text style={styles.detail}>
                📍 Morada: {item.cliente_morada || 'N/D'}
              </Text>
              <Text style={styles.detail}>
                🗓 Criado em: {new Date(item.data_criacao).toLocaleString()}
              </Text>
              {item.data_resolucao && (
                <Text style={styles.detail}>
                  ✅ Resolvido em: {new Date(item.data_resolucao).toLocaleString()}
                </Text>
              )}
      
              {item.anexos && item.anexos.length > 0 && (
                <View style={styles.anexoContainer}>
                  <Text style={styles.anexoLabel}>📎 Anexos:</Text>
                  <View style={styles.anexoRow}>
                    {item.anexos.map((uri: string, idx: number) => (
                      <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setImagemSelecionada(uri);
                        setMostrarModalImagem(true);
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.anexoThumb}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    
                    ))}
                  </View>
                </View>
              )}
      
              {/* Campo de responsável funcional */}
              <View style={styles.responsavelContainer}>
                <Text style={styles.detail}>👤 Responsável:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                    placeholder="Nome do responsável"
                    placeholderTextColor="#888"
                    value={responsaveis[item.id] || item.atribuido_a || ''}
                    onChangeText={(text) =>
                      setResponsaveis((prev) => ({ ...prev, [item.id]: text }))
                    }
                  />
                  <TouchableOpacity onPress={() => salvarResponsavel(item.id)}>
                    <Text style={{ color: 'blue', fontWeight: 'bold' }}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
      
              {/* Mostra o nome salvo, se existir */}
              {item.atribuido_a && (
                <Text style={styles.detail}>
                  ✅ Responsável atual: {item.atribuido_a}
                </Text>
              )}

{/* Botões de ação conforme status */}
<View style={styles.actionsContainer}>
  {item.status === 'pendente' && (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={() =>
        Alert.alert(
          'Confirmação',
          'Deseja marcar esta notificação como "Em Resolução"?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Sim',
              onPress: () =>
                atualizarNotificacao(item.id, 'em resolução', item.atribuido_a),
            },
          ]
        )
      }
    >
      <Text style={styles.actionText}>Assunto em Resolução</Text>
    </TouchableOpacity>
  )}

  {item.status === 'em resolução' && (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={() =>
        Alert.alert(
          'Confirmação',
          'Deseja marcar esta notificação como "Resolvido"?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Sim',
              onPress: () =>
                atualizarNotificacao(item.id, 'resolvido', item.atribuido_a),
            },
          ]
        )
      }
    >
      <Text style={styles.actionText}>Marcar como Resolvido</Text>
    </TouchableOpacity>
  )}

  {item.status === 'resolvido' && (
    <TouchableOpacity
      style={[styles.actionButton, styles.deleteButton]}
      onPress={() =>
        Alert.alert(
          'Confirmação',
          'Tem a certeza que deseja apagar esta notificação?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Apagar',
              style: 'destructive',
              onPress: () => apagarNotificacao(item.id),
            },
          ]
        )
      }
    >
      <Text style={styles.actionText}>Apagar Notificação</Text>
    </TouchableOpacity>
  )}
</View>


            </View>
          )}
        </TouchableOpacity>
      );
      
  };

  return (
    <>
      <FlatList
        data={notificacoes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
      />
  
      {/* Modal da imagem em ecrã completo */}
      {imagemSelecionada && (
        <Modal
          visible={mostrarModalImagem}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMostrarModalImagem(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setMostrarModalImagem(false)}
            >
              <Text style={styles.modalCloseText}>✖ Fechar</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: imagemSelecionada }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </>
  );
  
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#D3D3D3',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardPendente: { borderLeftWidth: 6, borderLeftColor: '#FFB3B3' },
  cardResolucao: { borderLeftWidth: 6, borderLeftColor: '#FFF5CC' },
  cardResolvido: { borderLeftWidth: 6, borderLeftColor: '#CCFFCC' },
  cardDefault: { borderLeftWidth: 6, borderLeftColor: '#AAA' },
  cliente: { fontWeight: 'bold', fontSize: 16 },
  mensagem: { marginTop: 4, fontSize: 14, color: '#333' },
  status: { marginTop: 6, fontStyle: 'italic', color: '#666' },
  expandedContent: { marginTop: 12 },
  detail: { fontSize: 14, color: '#444', marginBottom: 4 },
  anexoContainer: { marginTop: 10 },
  anexoLabel: { fontWeight: 'bold', marginBottom: 4 },
  anexoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  anexoThumb: { width: 60, height: 60, borderRadius: 5, marginRight: 6 },
  responsavelContainer: { marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    fontSize: 14,
    color: '#000',
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: '#ADD8E6',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  actionText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#FFB3B3',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalCloseText: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 16,
  },
  
  
});

export default ReceberNotificacoesScreen;

