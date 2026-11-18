import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform,
} from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Config from 'react-native-config';
import ImageViewing from 'react-native-image-viewing';
import * as DocumentPicker from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';

type Sessao = { token: string; usuarioId: number; admin: boolean };
type Conversa = {
  id: number | string;
  assunto: string;
  estado: 'pendente' | 'em_resolucao' | 'resolvido';
  equipeid: number;
  equipa_nome?: string | null;
  cliente_nome?: string | null;
  grupo_envio_id?: string | null;
  notificacao_origem_id?: number | string | null;
  nao_lidas: number;
  atualizada_em: string;
};
type Leitura = { usuario_id: number; nome?: string | null; lida_em: string };
type Mensagem = {
  id: number | string;
  autor_id: number;
  autor_nome: string;
  texto?: string | null;
  anexos?: string[] | null;
  criada_em: string;
  leituras?: Leitura[];
};
type Tecnico = { id: number; nome: string; equipeid: number };
type ClienteAssociado = { id: number; nome: string; equipeid: number };
type Metodo = 'get' | 'post' | 'patch' | 'delete';

const CORES = {
  azul: '#ADD8E6', cinza: '#D3D3D3', preto: '#000000',
  branco: '#FFFFFF', vermelho: '#FFB3B3', amarelo: '#FFF5CC',
  verde: '#CCFFCC',
};

const formatarData = (valor?: string) => {
  if (!valor) return '';
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? ''
    : data.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const nomeEstado = (estado: string) => {
  if (estado === 'em_resolucao') return 'Em resolução';
  if (estado === 'resolvido') return 'Resolvido';
  return 'Pendente';
};

const corEstado = (estado: string) => {
  if (estado === 'em_resolucao') return CORES.amarelo;
  if (estado === 'resolvido') return CORES.verde;
  return CORES.vermelho;
};

/**
 * Novo ecrã, independente do ReceberNotificacoesScreen antigo.
 * As permissões são verificadas NO SERVIDOR com JWT e equipa da BD.
 * Nesta fase os avisos são atualizados quando o ecrã está aberto;
 * notificações push/sonoras serão implementadas separadamente.
 */
const MensagensInternasScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'MensagensInternas'>>();
  const alvoInicial = route.params?.conversaId;
  const alvoTratadoRef = useRef(false);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [aIniciar, setAIniciar] = useState(true);
  const [lista, setLista] = useState<Conversa[]>([]);
  const [aberta, setAberta] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [aCarregar, setACarregar] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [resposta, setResposta] = useState('');
  const [imagensResposta, setImagensResposta] = useState<string[]>([]);
  const [aEscolherImagem, setAEscolherImagem] = useState(false);
  const [novaAberta, setNovaAberta] = useState(false);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [destinatario, setDestinatario] = useState('');
  const [clientesAssociados, setClientesAssociados] = useState<ClienteAssociado[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [clientesIndisponiveis, setClientesIndisponiveis] = useState(false);
  const [assunto, setAssunto] = useState('');
  const [textoNovo, setTextoNovo] = useState('');
  const [imagensNova, setImagensNova] = useState<string[]>([]);
  const [imagensAbertas, setImagensAbertas] = useState<{ uri: string }[]>([]);
  const [visualizarImagens, setVisualizarImagens] = useState(false);
  const conversaRef = useRef<string | null>(null);
  const avisouSessao = useRef(false);

  useEffect(() => {
    let montado = true;
    const preparar = async () => {
      try {
        const valores = await AsyncStorage.multiGet(['authToken', 'userId', 'tipo_usuario']);
        const dados = Object.fromEntries(valores);
        const usuarioId = Number(dados.userId);
        if (!dados.authToken || !Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
          Alert.alert('Sessão indisponível', 'Inicia sessão novamente para consultar as mensagens.');
          return;
        }
        if (montado) {
          setSessao({
            token: dados.authToken,
            usuarioId,
            admin: dados.tipo_usuario === 'admin',
          });
        }
      } catch {
        Alert.alert('Erro', 'Não foi possível ler a sessão do utilizador.');
      } finally {
        if (montado) setAIniciar(false);
      }
    };
    void preparar();
    return () => { montado = false; };
  }, []);

  const tratarErro = useCallback((erro: unknown, silencioso = false) => {
    if (axios.isAxiosError(erro) && erro.response?.status === 401) {
      if (!avisouSessao.current) {
        avisouSessao.current = true;
        Alert.alert('Sessão expirada', 'Volta a iniciar sessão para utilizar as mensagens.');
      }
      return;
    }
    if (!silencioso) {
      const detalhe = axios.isAxiosError(erro) ? erro.response?.data?.error : null;
      Alert.alert('Mensagens', typeof detalhe === 'string' ? detalhe : 'Não foi possível concluir a operação.');
    }
  }, []);

  const pedir = useCallback(async (metodo: Metodo, caminho: string, dados?: object) => {
    if (!sessao) throw new Error('Sem sessão');
    const respostaApi = await axios.request({
      method: metodo,
      url: Config.API_URL + '/mensagens-internas' + caminho,
      headers: { Authorization: 'Bearer ' + sessao.token },
      data: dados,
      timeout: 15000,
    });
    return respostaApi.data;
  }, [sessao]);

  const carregarLista = useCallback(async (silencioso = false) => {
    if (!sessao) return;
    if (!silencioso) setACarregar(true);
    try {
      const dados = await pedir('get', '/conversas');
      setLista(Array.isArray(dados) ? dados : []);
    } catch (erro) {
      tratarErro(erro, silencioso);
    } finally {
      if (!silencioso) setACarregar(false);
    }
  }, [pedir, sessao, tratarErro]);

  const carregarMensagens = useCallback(async (
    conversaId: number | string, marcarLeitura: boolean, silencioso = false,
  ) => {
    if (!sessao) return;
    if (!silencioso) setACarregar(true);
    try {
      const caminho = '/conversas/' + encodeURIComponent(String(conversaId));
      const resultado = await pedir('get', caminho + '/mensagens');
      if (conversaRef.current === String(conversaId)) {
        setMensagens(Array.isArray(resultado.mensagens) ? resultado.mensagens : []);
        setAberta(atual => atual && String(atual.id) === String(conversaId)
          ? { ...atual, estado: resultado.conversa?.estado || atual.estado,
              notificacao_origem_id: resultado.conversa?.notificacao_origem_id ?? atual.notificacao_origem_id }
          : atual);
      }
      // Uma mensagem nova enquanto a conversa esta aberta tambem conta
      // como lida, mas nunca marcar leitura se o utilizador ja saiu.
      if (marcarLeitura && conversaRef.current === String(conversaId)) {
        await pedir('post', caminho + '/ler');
        await carregarLista(true);
      }
    } catch (erro) {
      tratarErro(erro, silencioso);
    } finally {
      if (!silencioso) setACarregar(false);
    }
  }, [sessao, pedir, carregarLista, tratarErro]);

  // Atualização só enquanto este ecrã está aberto. O push com som será outra fase.
  useFocusEffect(useCallback(() => {
    if (!sessao) return undefined;
    // A primeira consulta mostra eventuais erros; as atualizações seguintes são silenciosas.
    void carregarLista();
    const intervalo = setInterval(() => {
      void carregarLista(true);
      if (conversaRef.current) void carregarMensagens(conversaRef.current, true, true);
    }, 25000);
    return () => clearInterval(intervalo);
  }, [sessao, carregarLista, carregarMensagens]));

  const abrirConversa = useCallback((conversa: Conversa) => {
    conversaRef.current = String(conversa.id);
    setAberta(conversa);
    setMensagens([]);
    setResposta('');
    setImagensResposta([]);
    void carregarMensagens(conversa.id, true);
  }, [carregarMensagens]);

  // A lista autenticada fornece a conversa; nunca confiar no cartão de origem
  // para permissões nem marcar como lida antes de a abrir com sucesso.
  useEffect(() => {
    if (!alvoInicial || alvoTratadoRef.current || !sessao) return;
    const alvo = lista.find(c => String(c.id) === String(alvoInicial));
    if (alvo) {
      alvoTratadoRef.current = true;
      abrirConversa(alvo);
    }
  }, [alvoInicial, lista, sessao, abrirConversa]);

  const voltar = () => {
    conversaRef.current = null;
    setAberta(null);
    setMensagens([]);
    void carregarLista(true);
  };

  const anexarFotografia = async (destino: 'resposta' | 'nova' = 'resposta') => {
    if (aEscolherImagem || aEnviar) return;
    if (destino === 'resposta' && (!aberta || aberta.estado === 'resolvido')) return;
    if (destino === 'nova' && !novaAberta) return;
    const imagens = destino === 'nova' ? imagensNova : imagensResposta;
    const setImagens = destino === 'nova' ? setImagensNova : setImagensResposta;
    if (imagens.length >= 2) {
      Alert.alert('Fotografias', 'Podes anexar até duas fotografias por mensagem.');
      return;
    }
    setAEscolherImagem(true);
    let caminhoTemporario: string | null = null;
    try {
      const resultado = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
      });
      const ficheiro = Array.isArray(resultado) ? resultado[0] : resultado;
      if (!ficheiro?.uri) throw new Error('Fotografia sem endereço válido.');

      let uri = ficheiro.uri;
      if (Platform.OS === 'android' && uri.startsWith('content://')) {
        caminhoTemporario = RNFS.CachesDirectoryPath + '/mensagem_' + Date.now() + '.jpg';
        await RNFS.copyFile(uri, caminhoTemporario);
        uri = 'file://' + caminhoTemporario;
      }

      // Mesmo compressor que já funciona no ecrã das fotografias das válvulas.
      let comprimida = await ImageResizer.createResizedImage(
        uri, 1280, 1280, 'JPEG', 70, 0
      );
      let caminhoComprimido = comprimida.uri.replace('file://', '');
      let tamanho = Number((await RNFS.stat(caminhoComprimido)).size);
      if (tamanho > 1.5 * 1024 * 1024) {
        comprimida = await ImageResizer.createResizedImage(
          comprimida.uri, 900, 900, 'JPEG', 55, 0
        );
        caminhoComprimido = comprimida.uri.replace('file://', '');
        tamanho = Number((await RNFS.stat(caminhoComprimido)).size);
      }
      if (tamanho > 1.5 * 1024 * 1024) {
        throw new Error('Esta fotografia continua demasiado grande. Escolhe outra.');
      }

      const base64 = await RNFS.readFile(caminhoComprimido, 'base64');
      const imagem = 'data:image/jpeg;base64,' + base64;
      if (imagem.length > 2200000) {
        throw new Error('Esta fotografia excede o tamanho permitido.');
      }
      setImagens(anteriores => anteriores.length < 2
        ? [...anteriores, imagem] : anteriores);
    } catch (erro: any) {
      const codigo = String(erro?.code || '');
      if (!codigo.toUpperCase().includes('CANCEL')) {
        Alert.alert('Fotografia', erro instanceof Error
          ? erro.message : 'Não foi possível anexar esta fotografia.');
      }
    } finally {
      if (caminhoTemporario) {
        await RNFS.unlink(caminhoTemporario).catch(() => {});
      }
      setAEscolherImagem(false);
    }
  };

  const removerFotografia = (indice: number, destino: 'resposta' | 'nova' = 'resposta') => {
    if (aEnviar || aEscolherImagem) return;
    const setImagens = destino === 'nova' ? setImagensNova : setImagensResposta;
    Alert.alert('Remover fotografia', 'Retirar esta fotografia da mensagem?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive',
        onPress: () => setImagens(anteriores =>
          anteriores.filter((_, posicao) => posicao !== indice)) },
    ]);
  };

  const enviarResposta = () => {
    if (!aberta || aEnviar || (!resposta.trim() && imagensResposta.length === 0)) {
      if (!resposta.trim() && imagensResposta.length === 0) {
        Alert.alert('Atenção', 'Escreve uma resposta ou anexa uma fotografia.');
      }
      return;
    }
    const texto = resposta.trim();
    const anexos = [...imagensResposta];
    const conversaId = aberta.id;
    Alert.alert('Confirmar resposta', 'Enviar esta resposta para a conversa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar',
        onPress: async () => {
          setAEnviar(true);
          try {
            await pedir('post', '/conversas/' + conversaId + '/mensagens', {
              mensagem: texto, anexos,
            });
            setResposta('');
            setImagensResposta([]);
            await carregarMensagens(conversaId, true);
          } catch (erro) {
            tratarErro(erro);
          } finally {
            setAEnviar(false);
          }
        },
      },
    ]);
  };

  const alterarEstado = (estado: 'pendente' | 'resolvido') => {
    if (!aberta || !sessao?.admin) return;
    const id = aberta.id;
    const descricao = estado === 'resolvido' ? 'marcar como resolvido' : 'reabrir';
    Alert.alert('Confirmar alteração', 'Queres ' + descricao + ' este assunto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            await pedir('patch', '/conversas/' + id + '/estado', { estado });
            await carregarMensagens(id, false);
            await carregarLista(true);
          } catch (erro) {
            tratarErro(erro);
          }
        },
      },
    ]);
  };

  const apagarConversa = () => {
    if (!aberta || !sessao?.admin) return;
    const id = aberta.id;
    if (aberta.notificacao_origem_id != null) {
      Alert.alert('Relatório protegido', 'Este assunto está ligado a um relatório de anomalia. Utiliza Resolver para o encerrar e conservar o histórico.');
      return;
    }
    Alert.alert('Apagar conversa', 'Esta operação é definitiva e apaga todas as mensagens e fotografias desta conversa. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await pedir('delete', '/conversas/' + id);
            voltar();
          } catch (erro) {
            tratarErro(erro);
          }
        },
      },
    ]);
  };

  const prepararNova = async () => {
    if (!sessao || aEnviar || aEscolherImagem) return;
    setAssunto('');
    setTextoNovo('');
    setImagensNova([]);
    setDestinatario('');
    setClienteSelecionado('');
    setFiltroCliente('');
    setClientesAssociados([]);
    setClientesIndisponiveis(false);
    if (!sessao.admin) {
      setNovaAberta(true);
      return;
    }
    try {
      const dados = await pedir('get', '/tecnicos');
      setTecnicos(Array.isArray(dados) ? dados : []);
      try {
        const clientes = await pedir('get', '/clientes-associados');
        setClientesAssociados(Array.isArray(clientes) ? clientes : []);
      } catch {
        // O envio operacional continua disponível mesmo se esta lista falhar.
        setClientesIndisponiveis(true);
      }
      setNovaAberta(true);
    } catch (erro) {
      tratarErro(erro);
    }
  };

  const equipeEscolhida = tecnicos.find(t => String(t.id) === destinatario)?.equipeid;
  const clientesDaEquipa = clientesAssociados.filter(c => Number(c.equipeid) === Number(equipeEscolhida));
  const clienteEscolhido = clientesDaEquipa.find(c => String(c.id) === clienteSelecionado);
  const clientesFiltrados = clientesDaEquipa.filter(c =>
    String(c.id) === clienteSelecionado || c.nome.toLocaleLowerCase().includes(filtroCliente.trim().toLocaleLowerCase())
  );

  const criarNova = () => {
    if (!sessao || aEnviar || aEscolherImagem) return;
    if (!assunto.trim() || (!textoNovo.trim() && imagensNova.length === 0)) {
      Alert.alert('Atenção', 'Preenche o assunto e escreve uma mensagem ou anexa uma fotografia.');
      return;
    }
    const todos = sessao.admin && destinatario === 'todos';
    const escolhido = tecnicos.find(t => String(t.id) === destinatario);
    if (sessao.admin && !todos && !escolhido) {
      Alert.alert('Atenção', 'Escolhe um técnico válido ou Todos.');
      return;
    }
    if (sessao.admin && clienteSelecionado && (!clienteEscolhido || todos || !textoNovo.trim())) {
      Alert.alert('Atenção', 'Escolhe um cliente associado e escreve a indicação para a manutenção.');
      return;
    }
    const destinoTexto = !sessao.admin
      ? 'a Administração'
      : todos
        ? 'todos os técnicos da empresa (uma conversa por equipa)'
        : 'a equipa do técnico ' + escolhido?.nome;
    const dados = {
      assunto: assunto.trim(),
      mensagem: textoNovo.trim(),
      anexos: [...imagensNova],
      ...(sessao.admin ? { todos, tecnico_id: todos ? undefined : Number(destinatario),
        cliente_id: clienteEscolhido && !todos ? clienteEscolhido.id : undefined } : {}),
    };
    Alert.alert('Confirmar envio', 'Enviar a mensagem para ' + destinoTexto +
      (clienteEscolhido ? ' e apresentar na próxima manutenção de ' + clienteEscolhido.nome : '') + '?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar',
        onPress: async () => {
          setAEnviar(true);
          try {
            await pedir('post', '/conversas', dados);
            setNovaAberta(false);
            setImagensNova([]);
            await carregarLista();
          } catch (erro) {
            tratarErro(erro);
          } finally {
            setAEnviar(false);
          }
        },
      },
    ]);
  };

  const abrirFotografia = (uri: string) => {
    setImagensAbertas([{ uri }]);
    setVisualizarImagens(true);
  };

  const cartao = ({ item }: { item: Conversa }) => (
    <TouchableOpacity
      style={[styles.cartao, { borderLeftColor: corEstado(item.estado) }]}
      onPress={() => abrirConversa(item)}
    >
      <View style={styles.linha}>
        <Text style={styles.assunto} numberOfLines={2}>{item.assunto}</Text>
        {Number(item.nao_lidas) > 0 && (
          <View style={styles.naoLidas}><Text style={styles.naoLidasTexto}>{item.nao_lidas}</Text></View>
        )}
      </View>
      {!!item.cliente_nome && <Text style={styles.metadados}>Piscina: {item.cliente_nome}</Text>}
      <Text style={styles.metadados}>
        {item.grupo_envio_id ? 'Comunicado geral · ' : ''}
        {item.equipa_nome || 'Equipa ' + item.equipeid}
      </Text>
      <View style={styles.linha}>
        <Text style={[styles.estado, { backgroundColor: corEstado(item.estado) }]}>{nomeEstado(item.estado)}</Text>
        <Text style={styles.data}>{formatarData(item.atualizada_em)}</Text>
      </View>
    </TouchableOpacity>
  );

  const mensagemItem = (item: Mensagem) => {
    const propria = Number(item.autor_id) === sessao?.usuarioId;
    const leitores = Array.isArray(item.leituras) ? item.leituras : [];
    const nomes = leitores.map(leitura => leitura.nome || 'Utilizador ' + leitura.usuario_id).join(', ');
    return (
      <View key={String(item.id)} style={[styles.bolha, propria ? styles.minhaBolha : styles.outraBolha]}>
        <Text style={styles.autor}>{item.autor_nome || 'Utilizador'}</Text>
        {!!item.texto && <Text style={styles.corpoMensagem}>{item.texto}</Text>}
        {(item.anexos || []).map((uri, indice) => (
          <TouchableOpacity key={indice} onPress={() => abrirFotografia(uri)}>
            <Image source={{ uri }} style={styles.fotografia} resizeMode="cover" />
          </TouchableOpacity>
        ))}
        <Text style={styles.data}>{formatarData(item.criada_em)}</Text>
        {propria && (
          <Text style={styles.leitura}>
            {leitores.length > 0 ? '✓✓ Lida por: ' + nomes : '✓ Enviada · ainda não lida'}
          </Text>
        )}
      </View>
    );
  };

  if (aIniciar) {
    return <View style={styles.centrado}><ActivityIndicator size="large" /><Text>A carregar sessão...</Text></View>;
  }

  if (!sessao) {
    return <View style={styles.centrado}><Text>Inicia sessão novamente para utilizar as mensagens.</Text></View>;
  }

  return (
    <View style={styles.pagina}>
      {aberta ? (
        <View style={styles.pagina}>
          <TouchableOpacity style={styles.voltar} onPress={voltar}>
            <Text style={styles.textoBotao}>‹ Voltar aos assuntos</Text>
          </TouchableOpacity>
          <View style={styles.topo}>
            <Text style={styles.titulo}>{aberta.assunto}</Text>
            {!!aberta.cliente_nome && <Text style={styles.metadados}>Piscina: {aberta.cliente_nome}</Text>}
            <Text style={[styles.estado, { backgroundColor: corEstado(aberta.estado) }]}>
              {nomeEstado(aberta.estado)}
            </Text>
            {sessao.admin && (
              <View style={styles.acoes}>
                <TouchableOpacity style={styles.botaoSecundario} onPress={() => alterarEstado(aberta.estado === 'resolvido' ? 'pendente' : 'resolvido')}>
                  <Text style={styles.textoSecundario}>{aberta.estado === 'resolvido' ? 'Reabrir' : 'Resolver'}</Text>
                </TouchableOpacity>
                {aberta.notificacao_origem_id == null && (
                  <TouchableOpacity style={[styles.botaoSecundario, styles.botaoApagar]} onPress={apagarConversa}>
                    <Text style={styles.textoSecundario}>Apagar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {sessao.admin && aberta.notificacao_origem_id != null && (
              <Text style={styles.metadados}>Relatório de anomalia protegido · utiliza Resolver para encerrar.</Text>
            )}
          </View>
          <ScrollView
            style={styles.listaMensagens}
            contentContainerStyle={styles.conteudoMensagens}
            refreshControl={<RefreshControl refreshing={aCarregar} onRefresh={() => void carregarMensagens(aberta.id, true)} />}
          >
            {mensagens.length === 0 && <Text style={styles.metadados}>Ainda não há mensagens nesta conversa.</Text>}
            {mensagens.map(mensagemItem)}
          </ScrollView>
          {aberta.estado !== 'resolvido' ? (
            <View style={styles.compositor}>
              <TextInput
                style={styles.entradaResposta}
                placeholder="Escrever resposta..."
                placeholderTextColor="#666666"
                value={resposta}
                onChangeText={setResposta}
                multiline
                maxLength={5000}
              />
              {imagensResposta.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {imagensResposta.map((uri, i) => (
                    <TouchableOpacity
                      key={i}
                      accessibilityLabel={'Remover fotografia ' + (i + 1)}
                      onPress={() => removerFotografia(i)}
                    >
                      <Image source={{ uri }} style={{ width: 70, height: 60, borderRadius: 8 }} />
                      <Text style={{ color: '#000000', fontSize: 11 }}>Remover foto</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.botaoSecundario, { flex: 1 }]}
                  disabled={aEscolherImagem || aEnviar || imagensResposta.length >= 2}
                  onPress={() => void anexarFotografia()}
                >
                  <Text style={styles.textoSecundario}>
                    {aEscolherImagem ? 'A preparar...' : '📷 Foto'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botao, { flex: 2 }, aEnviar && styles.desativado]}
                  onPress={enviarResposta}
                  disabled={aEnviar || aEscolherImagem}
                >
                  <Text style={styles.textoBotao}>
                    {aEnviar ? 'A enviar...' : 'Responder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.avisoResolvido}>
              <Text>Assunto resolvido. Só a Administração pode reabri-lo.</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.pagina}>
          <View style={styles.topo}>
            <Text style={styles.titulo}>Mensagens internas</Text>
            <Text style={styles.metadados}>Administração e equipas de manutenção</Text>
            <TouchableOpacity style={styles.botao} onPress={() => void prepararNova()}>
              <Text style={styles.textoBotao}>+ Nova mensagem</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={lista}
            keyExtractor={item => String(item.id)}
            renderItem={cartao}
            contentContainerStyle={styles.listaConversas}
            refreshControl={<RefreshControl refreshing={aCarregar} onRefresh={() => void carregarLista()} />}
            ListEmptyComponent={<Text style={styles.vazio}>Sem conversas. Os relatórios de anomalias serão integrados nesta área.</Text>}
          />
        </View>
      )}
      <Modal visible={novaAberta} animationType="slide" transparent onRequestClose={() => !aEnviar && !aEscolherImagem && setNovaAberta(false)}>
        <View style={styles.fundoModal}>
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.titulo}>Nova mensagem</Text>
              <Text style={styles.etiqueta}>Destinatário</Text>
              {sessao.admin ? (
                <>
                  <View style={styles.campoPicker}>
                    <Picker selectedValue={destinatario} onValueChange={valor => {
                      setDestinatario(String(valor));
                      setClienteSelecionado('');
                      setFiltroCliente('');
                    }}>
                      <Picker.Item label="Escolher técnico..." value="" />
                      <Picker.Item label="Todos os técnicos" value="todos" />
                      {tecnicos.map(t => (
                        <Picker.Item
                          key={t.id}
                          label={t.nome + ' · Equipa ' + t.equipeid}
                          value={String(t.id)}
                        />
                      ))}
                    </Picker>
                  </View>
                  <Text style={styles.metadados}>Os colegas da mesma equipa podem ler e responder.</Text>
                  {!!equipeEscolhida && destinatario !== 'todos' && (
                    <>
                      <Text style={styles.etiqueta}>Cliente associado (opcional)</Text>
                      {clientesIndisponiveis ? (
                        <Text style={styles.metadados}>Não foi possível carregar os clientes. Podes enviar uma mensagem normal ou reabrir este formulário.</Text>
                      ) : (
                        <>
                          <TextInput style={styles.campo} placeholder="Pesquisar cliente..." placeholderTextColor="#666666"
                            value={filtroCliente} onChangeText={setFiltroCliente} />
                          <View style={[styles.campoPicker, { marginTop: 6 }]}>
                            <Picker selectedValue={clienteSelecionado} onValueChange={valor => setClienteSelecionado(String(valor))}>
                              <Picker.Item label="Sem cliente (mensagem normal)" value="" />
                              {clientesFiltrados.map(c => (
                                <Picker.Item key={c.id} label={c.nome} value={String(c.id)} />
                              ))}
                            </Picker>
                          </View>
                          <Text style={styles.metadados}>{clienteEscolhido
                            ? 'Indicação apresentada na próxima manutenção desta piscina, mesmo depois de lida.'
                            : 'Seleciona um cliente apenas quando a mensagem for uma indicação de manutenção.'}</Text>
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <View style={styles.campo}>
                  <Text style={styles.textoSecundario}>Administração</Text>
                  <Text style={styles.metadados}>Os colegas da mesma equipa podem ler e responder.</Text>
                </View>
              )}
              <Text style={styles.etiqueta}>Assunto</Text>
              <TextInput style={styles.campo} value={assunto} onChangeText={setAssunto} maxLength={255} />
              <Text style={styles.etiqueta}>Mensagem</Text>
              <TextInput
                style={[styles.campo, styles.campoGrande]}
                value={textoNovo}
                onChangeText={setTextoNovo}
                multiline
                maxLength={5000}
              />
              {imagensNova.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {imagensNova.map((uri, i) => (
                    <TouchableOpacity
                      key={i}
                      disabled={aEnviar || aEscolherImagem}
                      accessibilityLabel={'Remover fotografia ' + (i + 1)}
                      onPress={() => removerFotografia(i, 'nova')}
                    >
                      <Image source={{ uri }} style={{ width: 70, height: 60, borderRadius: 8 }} />
                      <Text style={{ color: '#000000', fontSize: 11 }}>Remover foto</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.botaoSecundario}
                disabled={aEscolherImagem || aEnviar || imagensNova.length >= 2}
                onPress={() => void anexarFotografia('nova')}
              >
                <Text style={styles.textoSecundario}>{aEscolherImagem ? 'A preparar...' : '📷 Foto (' + imagensNova.length + '/2)'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botao} disabled={aEnviar || aEscolherImagem} onPress={criarNova}>
                <Text style={styles.textoBotao}>{aEnviar ? 'A enviar...' : 'Enviar mensagem'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoSecundario} disabled={aEnviar || aEscolherImagem} onPress={() => setNovaAberta(false)}>
                <Text style={styles.textoSecundario}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ImageViewing
        images={imagensAbertas}
        imageIndex={0}
        visible={visualizarImagens}
        onRequestClose={() => setVisualizarImagens(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: CORES.cinza },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  topo: { backgroundColor: CORES.branco, padding: 14, gap: 8 },
  titulo: { color: CORES.preto, fontSize: 20, fontWeight: '700' },
  assunto: { flex: 1, color: CORES.preto, fontWeight: '700', fontSize: 16 },
  metadados: { color: '#444444', fontSize: 13 },
  data: { color: '#555555', fontSize: 11 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  listaConversas: { padding: 12, paddingBottom: 60, flexGrow: 1 },
  cartao: { backgroundColor: CORES.branco, borderRadius: 12, borderLeftWidth: 7, padding: 12, marginBottom: 10, gap: 8 },
  naoLidas: { backgroundColor: '#A91B1B', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  naoLidasTexto: { color: CORES.branco, fontWeight: '700', fontSize: 12 },
  estado: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, color: CORES.preto, fontSize: 12 },
  vazio: { textAlign: 'center', color: '#555555', marginTop: 50, paddingHorizontal: 20 },
  voltar: { backgroundColor: '#22b4b4ff', padding: 12 },
  acoes: { flexDirection: 'row', gap: 10 },
  botao: { backgroundColor: '#22B4B4', borderRadius: 25, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  textoBotao: { color: CORES.preto, fontWeight: '700' },
  botaoSecundario: { borderColor: '#555555', borderWidth: 1, borderRadius: 25, padding: 10, alignItems: 'center', marginTop: 5 },
  textoSecundario: { color: CORES.preto, fontWeight: '600' },
  botaoApagar: { backgroundColor: CORES.vermelho },
  desativado: { opacity: 0.5 },
  listaMensagens: { flex: 1 },
  conteudoMensagens: { padding: 12, paddingBottom: 35, gap: 9 },
  bolha: { padding: 12, borderRadius: 12, maxWidth: '92%', gap: 6 },
  minhaBolha: { alignSelf: 'flex-end', backgroundColor: CORES.azul },
  outraBolha: { alignSelf: 'flex-start', backgroundColor: CORES.branco },
  autor: { color: CORES.preto, fontWeight: '700', fontSize: 12 },
  corpoMensagem: { color: CORES.preto, fontSize: 15 },
  leitura: { color: '#3E5154', fontSize: 11 },
  fotografia: { width: 180, height: 140, borderRadius: 8, marginVertical: 4 },
  compositor: { backgroundColor: CORES.branco, padding: 10, gap: 6 },
  entradaResposta: { borderWidth: 1, borderColor: '#999999', borderRadius: 12, padding: 10, maxHeight: 120, color: CORES.preto },
  avisoResolvido: { backgroundColor: CORES.verde, padding: 12, alignItems: 'center' },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: CORES.branco, borderRadius: 16, padding: 18, maxHeight: '85%' },
  etiqueta: { color: CORES.preto, fontWeight: '700', marginTop: 14, marginBottom: 4 },
  campoPicker: { borderWidth: 1, borderColor: '#999999', borderRadius: 8 },
  campo: { borderWidth: 1, borderColor: '#999999', borderRadius: 8, padding: 10, color: CORES.preto },
  campoGrande: { minHeight: 110, textAlignVertical: 'top' },
});

export default MensagensInternasScreen;
