import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Appearance } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const EquipesDiasDaSemanaScreen = ({ navigation, route }: any) => {
  const { equipeId, equipeNome } = route.params;

  const [contadores, setContadores] = useState<Record<string, { total: number; concluidas: number; naoConcluidas: number }>>({});
  const [progress, setProgress] = useState<Record<string, { verde: number; vermelho: number }>>({});
  const [userEmpresaid, setUserEmpresaid] = useState<number | null>(null);
  const isFocused = useIsFocused();

  const diasDaSemana = useMemo(
    () => ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
    []
  );

  // 🔹 Inicializa `progress` com todas as barras vazias (cinza)
  useEffect(() => {
    const inicialProgress: Record<string, { verde: number; vermelho: number }> = {};
    diasDaSemana.forEach((dia) => {
      inicialProgress[dia] = { verde: 0, vermelho: 0 };
    });
    setProgress(inicialProgress);
  }, [diasDaSemana]);

  // 🔹 Busca o empresaid do AsyncStorage
  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (empresaid) {
          setUserEmpresaid(parseInt(empresaid, 10));
        } else {
          Alert.alert('Erro', 'Empresaid não encontrado.');
        }
      } catch (error) {
        console.error('[DEBUG] Erro ao buscar empresaid:', error);
      }
    };
    fetchEmpresaid();
  }, []);

  // 🔹 Busca os contadores de clientes
const fetchContadores = useCallback(async () => {
  if (!userEmpresaid) {
    console.log('[DEBUG] Tentativa de buscar contadores sem empresaid.');
    return;
  }

  try {
    console.log('[DEBUG] Buscando contadores para empresa ID:', userEmpresaid);
    const response = await axios.get(`${Config.API_URL}/contador-clientes`, {
      params: { equipeId, empresaid: userEmpresaid },
    });

    console.log('[DEBUG] Contadores recebidos:', response.data);

    const novosContadores = response.data.reduce(
      (acc: Record<string, { total: number; concluidas: number; naoConcluidas: number }>, item: any) => {
        acc[item.diasemana] = {
          total: item.total,
          concluidas: item.concluidas,
          naoConcluidas: item.naoConcluidas,
        };
        return acc;
      },
      {}
    );

    console.log('[DEBUG] Contadores formatados:', novosContadores);
    setContadores(novosContadores);
  } catch (error) {
    console.error('Erro ao buscar contadores de clientes:', error);
    Alert.alert('Erro', 'Não foi possível carregar os contadores de clientes.');
  }
}, [userEmpresaid, equipeId]); // ✅ Agora só é recriada quando necessário

// 🔹 Atualizamos o `useEffect`
useEffect(() => {
  if (isFocused && userEmpresaid !== null) {
    fetchContadores();
  }
}, [isFocused, userEmpresaid, fetchContadores]); // ✅ Agora o ESLint não reclama


  // 🔹 Reseta a barra de progresso quando o reset for acionado na outra tela
  useEffect(() => {
    if (route.params?.resetProgresso) {
      console.log('🔄 Resetando barra de progresso...');
      const resetProgresso: Record<string, { verde: number; vermelho: number }> = {};
      diasDaSemana.forEach((dia) => {
        resetProgresso[dia] = { verde: 0, vermelho: 0 };
      });
      setProgress(resetProgresso);
      // 🔹 Remove `resetProgresso` da navegação para evitar re-execução
      navigation.setParams({ resetProgresso: null });
    }
  }, [route.params?.resetProgresso, diasDaSemana, navigation]);


  // 🔹 Atualiza o progresso de um dia específico
  const atualizarProgresso = useCallback((dia: string) => {
    if (!contadores[dia] || contadores[dia].total === 0) {
      setProgress((prev) => {
        if (prev[dia]?.verde === 0 && prev[dia]?.vermelho === 0) {
          return prev;
        }
        return { ...prev, [dia]: { verde: 0, vermelho: 0 } };
      });
      return;
    }
    setProgress((prev) => {
      const novoVerde = contadores[dia].concluidas / contadores[dia].total;
      const novoVermelho = contadores[dia].naoConcluidas / contadores[dia].total;
      if (prev[dia]?.verde === novoVerde && prev[dia]?.vermelho === novoVermelho) {
        return prev;
      }
      return {
        ...prev,
        [dia]: {
          verde: novoVerde,
          vermelho: novoVermelho,
        },
      };
    });
  }, [contadores]);
    // ✅ Agora inclui `atualizarProgresso` e `diasDaSemana` corretamente
  useEffect(() => {
    if (contadores) {
      diasDaSemana.forEach((dia) => atualizarProgresso(dia));
    }
  }, [contadores, diasDaSemana, atualizarProgresso]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dias da Semana - {equipeNome}</Text>
      {diasDaSemana.map((dia) => (
        <View key={dia} style={styles.dayContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              navigation.navigate('EquipesPiscinasPorDia', {
                equipeId,
                equipeNome,
                diaSemana: dia,
                empresaid: userEmpresaid,
              });
            }}
          >
            <Text style={styles.buttonText}>
              {dia} - {contadores[dia]?.total || 0} clientes
            </Text>
          </TouchableOpacity>

          {/* 🔹 Wrapper para alinhar os números e a barra à esquerda */}
          <View style={styles.progressWrapper}>
            {/* 🔹 Texto com o progresso (ex: 2/5) */}
            <Text style={styles.progressText}>
              {contadores[dia]?.concluidas || 0}/{contadores[dia]?.total || 0}
            </Text>

            {/* 🔹 Barra de progresso */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, styles.progressVerde, { flex: progress[dia]?.verde || 0 }]} />
              <View style={[styles.progressBar, styles.progressVermelho, { flex: progress[dia]?.vermelho || 0 }]} />
              <View style={[styles.progressBar, styles.progressCinza, { flex: 1 - ((progress[dia]?.verde || 0) + (progress[dia]?.vermelho || 0)) }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );


};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
  },
  dayContainer: {
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#ADD8E6',
    padding: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#909090',
    alignItems: 'center',
    width: '100%', // 🔹 Garante que o botão ocupa toda a largura disponível
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  progressWrapper: {
    flexDirection: 'row', // 🔹 Mantém número e barra na mesma linha
    alignItems: 'center', // 🔹 Alinha verticalmente os elementos
    width: '100%', // 🔹 Garante que segue a largura dos botões
    justifyContent: 'flex-start', // 🔹 Alinha tudo à esquerda
  },
  progressText: {
    fontSize: 12, // 🔹 Texto pequeno e discreto
    fontWeight: 'bold',
    color: '#333', // 🔹 Cor escura para melhor legibilidade
    textAlign: 'center', // 🔹 Alinha o texto à esquerda
    width: 40, // 🔹 Mantém tamanho fixo para alinhamento
    marginRight: 8, // 🔹 Dá espaço entre o número e a barra
  },
  progressContainer: {
    flexDirection: 'row',
    height: 10,
    width: '87%', // 🔹 Barra ocupa 90% da largura total
    backgroundColor: '#909090',
    borderRadius: 5,
    overflow: 'hidden',
    marginLeft: -10,
  },
  progressBar: {
    height: '100%',
  },
  progressVerde: { backgroundColor: '#4CAF50' },
  progressVermelho: { backgroundColor: '#FF6347' },
  progressCinza: { backgroundColor: '#909090' },
});

export default EquipesDiasDaSemanaScreen;