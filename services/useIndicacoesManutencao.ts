import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from 'react-native-config';

export type IndicacaoManutencao = {
  conversa_id: string | number;
  cliente_id: number;
  equipeid: number;
  assunto: string;
  mensagem: string | null;
  num_anexos: number;
  lida: boolean;
};

const PERFIS = ['equipe', 'equipa_manutencao', 'equipa_tecnica'];

// Consulta separada da agenda/folha química. Sem fotos em Base64 nem cache em disco.
// Ao perder rede conserva a última resposta da mesma sessão/ecrã, com aviso.
// Atualiza ao voltar da conversa e enquanto o ecrã está em foco.
export function useIndicacoesManutencao(
  equipeId: number, clienteId: number | undefined, empresaid: number, ativo = true,
) {
  const [indicacoes, setIndicacoes] = useState<IndicacaoManutencao[]>([]);
  const [indisponiveis, setIndisponiveis] = useState(false);
  const identidadeRef = useRef('');
  const escopo = String(empresaid) + ':' + String(equipeId) + ':' + String(clienteId ?? '');
  useFocusEffect(useCallback(() => {
    let cancelado = false;
    let emCurso = false;
    if (!ativo) {
      setIndicacoes([]);
      setIndisponiveis(false);
      return undefined;
    }
    const atualizar = async () => {
      if (cancelado || emCurso) return;
      emCurso = true;
      try {
        const dados = Object.fromEntries(await AsyncStorage.multiGet(['authToken', 'userId', 'tipo_usuario', 'empresaid']));
        if (cancelado) return;
        const token = dados.authToken;
        const identidade = escopo + ':' + String(dados.userId) + ':' + String(token);
        if (identidadeRef.current !== identidade) {
          identidadeRef.current = identidade;
          setIndicacoes([]);
          setIndisponiveis(false);
        }
        if (!PERFIS.includes(dados.tipo_usuario || '') || Number(dados.empresaid) !== Number(empresaid)) {
          setIndicacoes([]);
          setIndisponiveis(false);
          return;
        }
        if (!token) {
          setIndicacoes([]);
          setIndisponiveis(true);
          return;
        }
        const r = await axios.get(Config.API_URL + '/mensagens-internas/indicacoes-manutencao', {
          headers: { Authorization: 'Bearer ' + token },
          params: clienteId != null ? { cliente_id: clienteId } : undefined,
          timeout: 12000,
        });
        if (cancelado || identidadeRef.current !== identidade) return;
        const lista: IndicacaoManutencao[] = Array.isArray(r.data) ? r.data : [];
        setIndicacoes(lista.filter(i => Number(i.equipeid) === Number(equipeId) &&
          (clienteId == null || Number(i.cliente_id) === Number(clienteId))));
        setIndisponiveis(false);
      } catch (erro) {
        if (!cancelado) {
          if (axios.isAxiosError(erro) && (erro.response?.status === 401 || erro.response?.status === 403)) {
            setIndicacoes([]);
          }
          setIndisponiveis(true);
        }
      } finally {
        emCurso = false;
      }
    };
    void atualizar();
    const intervalo = setInterval(() => { void atualizar(); }, 30000);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [ativo, escopo, empresaid, equipeId, clienteId]));
  return { indicacoes: ativo ? indicacoes : [], indisponiveis: ativo && indisponiveis };
}
