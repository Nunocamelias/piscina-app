import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, Image, Modal } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const ReceberNotificacoesScreen: React.FC = () => {
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [userEmpresaid, setUserEmpresaid] = useState<number | null>(null);
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);

  // Fetch empresaid do AsyncStorage
  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (empresaid) {
          setUserEmpresaid(parseInt(empresaid, 10));
        } else {
          Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        }
      } catch (error) {
        console.error('Erro ao buscar empresaid:', error);
        Alert.alert('Erro', 'Não foi possível carregar o empresaid.');
      }
    };

    fetchEmpresaid();
  }, []);

  // Fetch notificações
  const fetchNotificacoes = async () => {
    try {
      const empresaid = await AsyncStorage.getItem('empresaid');
      if (!empresaid) {
        Alert.alert('Erro', 'Empresaid não encontrado.');
        return;
      }
      const response = await axios.get(`${Config.API_URL}/notificacoes`, {
        params: { empresaid },
      });
      setNotificacoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as notificações.');
    }
  };

  useEffect(() => {
    if (!userEmpresaid) {return;} // Garante que userEmpresaid está definido
    fetchNotificacoes();
  }, [userEmpresaid]);

  // Atualizar status da notificação
  const atualizarStatus = async (id: number, novoStatus: string) => {
    try {
      const empresaid = await AsyncStorage.getItem('empresaid');
      if (!empresaid) {
        Alert.alert('Erro', 'Empresaid não encontrado. Faça login novamente.');
        return;
      }

      console.log(`[DEBUG] Atualizando status da notificação ${id} para ${novoStatus}`);
      await axios.put(`${Config.API_URL}/notificacoes/${id}/status`, {
        status: novoStatus,
        empresaid: parseInt(empresaid, 10),
      });

      Alert.alert('Sucesso', 'Status atualizado com sucesso!');
      fetchNotificacoes(); // Atualiza a lista de notificações após a mudança
    } catch (error) {
      console.error('[DEBUG] Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  };

  const apagarNotificacao = async (id: number) => {
    Alert.alert(
      'Confirmação',
      'Tem certeza de que deseja apagar esta notificação?',
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
                return;
              }

              console.log(`[DEBUG] Apagando notificação ${id}`);
              await axios.delete(`${Config.API_URL}/notificacoes/${id}`, {
                params: { empresaid: parseInt(empresaid, 10) },
              });

              Alert.alert('Sucesso', 'Notificação apagada com sucesso!');
              fetchNotificacoes(); // Atualiza a lista de notificações
            } catch (error) {
              console.error('[DEBUG] Erro ao apagar notificação:', error);
              Alert.alert('Erro', 'Não foi possível apagar a notificação.');
            }
          },
        },
      ]
    );
  };



  // Renderizar cada cartão
  const renderCard = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id;

    const getBorderColorStyle = () => {
      switch (item.status) {
        case 'pendente':
          return styles.borderPendente;
        case 'em resolução':
          return styles.borderResolucao;
        case 'resolvido':
          return styles.borderResolvido;
        default:
          return {};
      }
    };

    return (
      <View style={[styles.card, getBorderColorStyle()]}>
        <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)}>
          <Text style={styles.cardTitle}>Cliente: {item.cliente_nome}</Text>
        </TouchableOpacity>
        <Text style={styles.cardMessage}>{item.mensagem}</Text>

        {isExpanded && (
          <View style={styles.cardDetails}>
            <Text style={styles.detail}>Assunto: {item.assunto}</Text>
            <Text style={styles.detail}>Status: {item.status}</Text>
            <Text style={styles.detail}>Criado em: {item.data_criacao}</Text>
            {item.data_resolucao && <Text style={styles.detail}>Resolvido em: {item.data_resolucao}</Text>}

            {item.anexos && item.anexos.length > 0 && (
              <View style={styles.anexoContainer}>
                <Text style={styles.anexoTitle}>Anexos:</Text>
                {item.anexos.map((anexo: string, index: number) => (
                  <TouchableOpacity key={index} onPress={() => setImagemSelecionada(anexo)} activeOpacity={1}>
                    <Image source={{ uri: anexo }} style={styles.anexoImagem} onError={() => console.log('Erro ao carregar imagem:', anexo)} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Modal atualizado para expandir a imagem ao ecrã inteiro */}
        <Modal visible={!!imagemSelecionada} transparent={false} onRequestClose={() => setImagemSelecionada(null)}>
          <View style={styles.fullScreenModalContainer}>
            <TouchableOpacity onPress={() => setImagemSelecionada(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
            {imagemSelecionada && (
              <Image source={{ uri: imagemSelecionada }} style={styles.fullScreenImage} resizeMode="contain" />
            )}
          </View>
        </Modal>

        <View style={styles.actionsContainer}>
          {item.status === 'pendente' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                Alert.alert(
                  'Confirmação',
                  'Tem certeza de que deseja marcar como "Assunto em Resolução"?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Sim',
                      onPress: () => atualizarStatus(item.id, 'em resolução'),
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
                  'Tem certeza de que deseja marcar como "Resolvido"?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Sim',
                      onPress: () => atualizarStatus(item.id, 'resolvido'),
                    },
                  ]
                )
              }
            >
              <Text style={styles.actionText}>Resolvido</Text>
            </TouchableOpacity>
          )}

           {item.status === 'resolvido' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.botaoApagar]}
              onPress={() => apagarNotificacao(item.id)}
            >
              <Text style={styles.actionText}>Apagar Notificação</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );


  };

  return (
    <FlatList
      data={notificacoes}
      keyExtractor={(item, index) => `${item.id}-${index}`} // Combina ID e índice como chave única
      renderItem={renderCard}
      contentContainerStyle={styles.container}
   />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#D3D3D3',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardMessage: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  cardDetails: {
    marginTop: 8,
  },
  detail: {
    fontSize: 14,
    marginBottom: 4,
    color: '#777',
  },
  anexoText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#ADD8E6', // Botões mantêm azul padrão
    borderRadius: 8,
    padding: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Novas cores esbatidas
  borderPendente: {
    borderColor: '#FFB3B3', // Vermelho esbatido
    borderWidth: 6,
  },
  borderResolucao: {
    borderColor: '#FFF5CC', // Amarelo esbatido
    borderWidth: 6,
  },
  borderResolvido: {
    borderColor: '#CCFFCC', // Verde esbatido
    borderWidth: 6,
  },
  anexoContainer: {
    marginTop: 8,
  },
  anexoTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  anexoImagem: {
    width: 100,
    height: 100,
    marginVertical: 4,
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
  },
  modalCloseText: {
    fontWeight: 'bold',
  },
  imagemExpandida: {
    width: 300,
    height: 300,
    borderRadius: 8,
  },
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  botaoApagar: {
    backgroundColor: '#FFB3B3',
  },
});

export default ReceberNotificacoesScreen;


