import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from 'react-native-config';

const { resumoNaoLidas, chegaramMensagensNovas } = require('../services/resumoNaoLidas');

type Resumo = { total: number; porAssunto: Record<string, number> };

type Props = {
  ativado: boolean;
  aoAtualizar: (total: number) => void;
  aoChegarNova: () => void;
};

// Consulta ligeira apenas enquanto a APP está visível, independentemente do ecrã.
// Não cria serviço Android nem tenta enviar notificações com a app fechada.
const VigiarMensagensEmPrimeiroPlano = ({ ativado, aoAtualizar, aoChegarNova }: Props) => {
  const identidadeRef = useRef('');
  const resumoRef = useRef<Resumo | null>(null);
  const bloqueadoRef = useRef('');
  const aConsultarRef = useRef(false);
  const callbacksRef = useRef({ aoAtualizar, aoChegarNova });
  callbacksRef.current = { aoAtualizar, aoChegarNova };

  useEffect(() => {
    if (!ativado) {
      identidadeRef.current = '';
      resumoRef.current = null;
      bloqueadoRef.current = '';
      callbacksRef.current.aoAtualizar(0);
      return undefined;
    }
    let cancelado = false;

    const atualizar = async () => {
      if (cancelado || AppState.currentState !== 'active' || aConsultarRef.current) return;
      aConsultarRef.current = true;
      try {
        const dadosSessao = Object.fromEntries(
          await AsyncStorage.multiGet(['authToken', 'userId'])
        );
        const token = dadosSessao.authToken;
        const utilizadorId = Number(dadosSessao.userId);
        if (!token || !Number.isSafeInteger(utilizadorId) || utilizadorId <= 0) {
          if (!cancelado) callbacksRef.current.aoAtualizar(0);
          resumoRef.current = null;
          identidadeRef.current = '';
          return;
        }
        const identidade = String(utilizadorId) + ':' + token;
        if (identidade !== identidadeRef.current) {
          identidadeRef.current = identidade;
          resumoRef.current = null;
          bloqueadoRef.current = '';
          if (!cancelado) callbacksRef.current.aoAtualizar(0);
        }
        // Não repetir pedidos com JWT que já foi recusado.
        if (bloqueadoRef.current === identidade) return;

        const resposta = await axios.get(
          Config.API_URL + '/mensagens-internas/conversas',
          { headers: { Authorization: 'Bearer ' + token }, timeout: 12000 }
        );
        if (cancelado || identidadeRef.current !== identidade) return;
        const seguinte: Resumo = resumoNaoLidas(resposta.data);
        const anterior = resumoRef.current;
        resumoRef.current = seguinte;
        callbacksRef.current.aoAtualizar(seguinte.total);
        if (chegaramMensagensNovas(anterior, seguinte)) {
          callbacksRef.current.aoChegarNova();
        }
      } catch (erro) {
        if (axios.isAxiosError(erro) && erro.response?.status === 401) {
          bloqueadoRef.current = identidadeRef.current;
        }
        // Sem alertas contínuos quando não há rede ou o servidor está em testes.
      } finally {
        aConsultarRef.current = false;
      }
    };

    void atualizar();
    const intervalo = setInterval(() => { void atualizar(); }, 30000);
    const subscricao = AppState.addEventListener('change', (estado: AppStateStatus) => {
      if (estado === 'active') void atualizar();
    });
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      subscricao.remove();
    };
  }, [ativado]);

  return null;
};

export default VigiarMensagensEmPrimeiroPlano;
