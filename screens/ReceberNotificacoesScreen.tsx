import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, Animated } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const ReceberNotificacoesScreen: React.FC = () => {
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [userEmpresaid, setUserEmpresaid] = useState<number | null>(null);

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
    if (!userEmpresaid) return; // Garante que userEmpresaid está definido
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
        <TouchableOpacity
         onPress={() => setExpandedId(isExpanded ? null : item.id)}
         style={[styles.card, getBorderColorStyle()]}
        >
        <Text style={styles.cardTitle}>Cliente: {item.cliente_nome}</Text>
        <Text style={styles.cardMessage}>{item.mensagem}</Text>
  
        {isExpanded && (
          <View style={styles.cardDetails}>
            <Text style={styles.detail}>Assunto: {item.assunto}</Text>
            <Text style={styles.detail}>Status: {item.status}</Text>
            <Text style={styles.detail}>Criado em: {item.data_criacao}</Text>
            {item.data_resolucao && <Text style={styles.detail}>Resolvido em: {item.data_resolucao}</Text>}
  
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
                  style={[styles.actionButton, { backgroundColor: '#FFB3B3' }]}
                  onPress={() => apagarNotificacao(item.id)}
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
});

export default ReceberNotificacoesScreen;


