import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Appearance, FlatList, Alert, ActivityIndicator, Modal, TextInput, TouchableOpacity, Linking, ScrollView, AppState, } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const isDarkMode = Appearance.getColorScheme() === 'dark';

type ContaCliente = {
  cliente_id: number;
  nome: string;
  morada: string;
  email: string | null;
  telefone: string | null;
  valor_manutencao: string | number | null;
  pagamento_id: number | null;
  mes_referencia: string | null;
  valor_extra: string | number | null;
  extras_pendentes: string | number | null;
  valor_pago: string | number | null;
  estado: string | null;
  observacoes: string | null;
  data_pagamento: string | null;
  saldo_mes: string | number | null;
  saldo_anterior: string | number | null;
  saldo_total: string | number | null;
  email_enviado: boolean | null;
};

type MovimentoPagamento = {
  id: number;
  valor: string | number;
  observacoes: string | null;
  data_pagamento: string;
};

type ExtraCliente = {
  id: number;
  empresaid: number;
  cliente_id: number;
  manutencao_id: number | null;
  equipe_id: number | null;
  descricao: string;
  quantidade: string | number;
  valor_unitario: string | number | null;
  valor_total: string | number | null;
  estado: 'pendente' | 'valorizado' | 'nao_cobrar';
  observacoes: string | null;
  criado_por: number | null;
  data_servico: string;
};

type DadosEmpresa = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  nif: string | null;

  iban1: string | null;
  titular_iban1: string | null;

  iban2: string | null;
  titular_iban2: string | null;

  mbway: string | null;
};

type PreferenciasPagamento = {
  usar_iban1: boolean;
  usar_iban2: boolean;
  usar_mbway: boolean;
};

type ModeloComunicacao = {
  id: number;
  empresaid: number;
  tipo: string;
  assunto: string | null;
  corpo: string;
};

const ContaCorrenteClientesScreen = () => {
  const [clientes, setClientes] = useState<ContaCliente[]>([]);
  const getMesAnterior = () => {
  const hoje = new Date();
  hoje.setMonth(hoje.getMonth() - 1);

  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');

  return `${ano}-${mes}`;
};
  const [mesReferencia, setMesReferencia] = useState(getMesAnterior());
  const [loading, setLoading] = useState(false);
  const [empresaid, setEmpresaid] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ContaCliente | null>(null);
  const [valorPagoInput, setValorPagoInput] = useState('');
  const [observacoesInput, setObservacoesInput] = useState('');
  const [pesquisa, setPesquisa] = useState('');
  const [clientesPagosExpandidos, setClientesPagosExpandidos] = useState<Record<number, boolean>>({});
  const [movimentos, setMovimentos] = useState<MovimentoPagamento[]>([]);
  const [totalRecebidoMes, setTotalRecebidoMes] = useState(0);
  const [extrasCliente, setExtrasCliente] = useState<ExtraCliente[]>([]);
  const [totalExtrasValorizados, setTotalExtrasValorizados] = useState(0);
  const [totalExtrasPendentes, setTotalExtrasPendentes] = useState(0);
  const [extrasExpandidos, setExtrasExpandidos] = useState(false);
  const [modalValorizarExtraVisible, setModalValorizarExtraVisible] = useState(false);
  const [extraSelecionado, setExtraSelecionado] = useState<ExtraCliente | null>(null);
  const [valorExtraPendenteInput, setValorExtraPendenteInput] = useState('');
  const [modalMensalidadeVisible, setModalMensalidadeVisible] = useState(false);
  const [valorMensalidadeInput, setValorMensalidadeInput] = useState('');
  const [observacoesMensalidadeInput, setObservacoesMensalidadeInput] = useState('');
  const [modalEmailVisible, setModalEmailVisible] = useState(false);
  const [emailAssunto, setEmailAssunto] = useState('');
  const [emailCorpo, setEmailCorpo] = useState('');
  const [comunicacaoEmailId, setComunicacaoEmailId] = useState<number | null>(null);
  const [aguardarConfirmacaoEmail, setAguardarConfirmacaoEmail] = useState(false);
  const [emailPagamentoAtual, setEmailPagamentoAtual] = useState('');
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa | null>(null);
  const [modeloEmail, setModeloEmail] = useState<ModeloComunicacao | null>(null);
  const [usarIban1, setUsarIban1] = useState(true);
  const [usarIban2, setUsarIban2] = useState(false);
  const [usarMbway, setUsarMbway] = useState(false);

  const carregarContaCorrente = useCallback(async (empresaIdAtual: number) => {
    setLoading(true);

    try {
      const response = await axios.get(`${Config.API_URL}/conta-corrente-clientes`, {
        params: { empresaid: empresaIdAtual, mes: mesReferencia },
      });

      setMesReferencia(response.data.mes_referencia);
      setClientes(response.data.clientes || []);
    } catch (error) {
      console.error('Erro ao carregar conta corrente:', error);
      Alert.alert('Erro', 'Não foi possível carregar a conta corrente dos clientes.');
    } finally {
      setLoading(false);
    }
  }, [mesReferencia]);

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

  useEffect(() => {
  const subscription = AppState.addEventListener(
    'change',
    (nextAppState) => {
      if (
        nextAppState === 'active' &&
        aguardarConfirmacaoEmail
      ) {
        setAguardarConfirmacaoEmail(false);

        setTimeout(() => {
          confirmarEmailEnviado();
        }, 500);
      }
    }
  );

  return () => {
    subscription.remove();
  };
}, [
  aguardarConfirmacaoEmail,
  comunicacaoEmailId,
  empresaid,
]);

const formatEuro = (valor: string | number | null) => {
    const n = Number(valor || 0);
    return `${n.toFixed(2)} €`;
};

const formatarMesExtenso = (mesReferenciaAtual: string) => {
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  const [ano, mes] = mesReferenciaAtual.split('-');
  const indice = Number(mes) - 1;

  if (indice < 0 || indice > 11) {
    return mesReferenciaAtual;
  }

  return `${meses[indice]} de ${ano}`;
};

const carregarMovimentosPagamento = async (clienteId: number) => {
  if (!empresaid || !mesReferencia) {
    return;
  }

    try {
    const response = await axios.get(
      `${Config.API_URL}/pagamentos-movimentos`,
      {
        params: {
          cliente_id: clienteId,
          empresaid,
          mes_referencia: mesReferencia,
        },
      }
    );

    setMovimentos(response.data.movimentos || []);
    setTotalRecebidoMes(Number(response.data.total_recebido || 0));
  } catch (error) {
    console.error('Erro ao carregar movimentos de pagamento:', error);
    setMovimentos([]);
    setTotalRecebidoMes(0);
  }
};

const carregarExtrasClienteMes = async (clienteId: number) => {
  if (!empresaid || !mesReferencia) {
    return;
  }

  try {
    const response = await axios.get(
      `${Config.API_URL}/extras-clientes`,
      {
        params: {
          cliente_id: clienteId,
          empresaid,
          mes: mesReferencia,
        },
      }
    );

    setExtrasCliente(response.data.extras || []);

    setTotalExtrasValorizados(
      Number(response.data.total_valorizado || 0)
    );

    setTotalExtrasPendentes(
      Number(response.data.extras_pendentes || 0)
    );
  } catch (error) {
    console.error(
      'Erro ao carregar extras do cliente:',
      error
    );

    setExtrasCliente([]);
    setTotalExtrasValorizados(0);
    setTotalExtrasPendentes(0);
  }
};

const abrirValorizarExtra = (extra: ExtraCliente) => {
  if (extra.estado !== 'pendente') {
    return;
  }

  setExtraSelecionado(extra);
  setValorExtraPendenteInput('');
  setModalValorizarExtraVisible(true);
};

const confirmarValorizarExtra = () => {
  if (!extraSelecionado) {
    return;
  }

  const valor = Number(
    valorExtraPendenteInput.replace(',', '.')
  );

  if (!Number.isFinite(valor) || valor < 0) {
    Alert.alert(
      'Atenção',
      'Introduza um valor unitário válido.'
    );
    return;
  }

  Alert.alert(
    'Confirmar valorização',
    `${extraSelecionado.descricao}\n\n` +
      `Quantidade: ${Number(extraSelecionado.quantidade)}\n` +
      `Valor unitário: ${formatEuro(valor)}\n` +
      `Total: ${formatEuro(
        Number(extraSelecionado.quantidade) * valor
      )}`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Confirmar',
        onPress: guardarValorExtra,
      },
    ]
  );
};

const guardarValorExtra = async () => {
  if (!extraSelecionado || !empresaid || !clienteSelecionado) {
    Alert.alert(
      'Erro',
      'Não foi possível identificar o extra.'
    );
    return;
  }

  const valor = Number(
    valorExtraPendenteInput.replace(',', '.')
  );

  try {
    await axios.put(
      `${Config.API_URL}/extras-clientes/${extraSelecionado.id}`,
      {
        empresaid,
        valor_unitario: valor,
      }
    );

    setModalValorizarExtraVisible(false);
    setExtraSelecionado(null);
    setValorExtraPendenteInput('');

    await carregarExtrasClienteMes(
      clienteSelecionado.cliente_id
    );

    await carregarContaCorrente(empresaid);

    Alert.alert(
      'Sucesso',
      'Extra valorizado com sucesso.'
    );
  } catch (error) {
    console.error(
      'Erro ao valorizar extra:',
      error
    );

    Alert.alert(
      'Erro',
      'Não foi possível valorizar o extra.'
    );
  }
};

const construirTextoPagamento = () => {
  if (!dadosEmpresa) {
    return '';
  }

  const blocos: string[] = [];

  if (
    usarIban1 &&
    dadosEmpresa.iban1
  ) {
    let texto =
      `Pagamento por transferência bancária:\n` +
      `IBAN: ${dadosEmpresa.iban1}`;

    if (dadosEmpresa.titular_iban1) {
      texto += `\nTitular: ${dadosEmpresa.titular_iban1}`;
    }

    blocos.push(texto);
  }

  if (
    usarIban2 &&
    dadosEmpresa.iban2
  ) {
    let texto =
      `Pagamento por transferência bancária:\n` +
      `IBAN: ${dadosEmpresa.iban2}`;

    if (dadosEmpresa.titular_iban2) {
      texto += `\nTitular: ${dadosEmpresa.titular_iban2}`;
    }

    blocos.push(texto);
  }

  if (
    usarMbway &&
    dadosEmpresa.mbway
  ) {
    blocos.push(
      `Pagamento por MB WAY:\n${dadosEmpresa.mbway}`
    );
  }

  return blocos.join('\n\nOu\n\n');
};

const prepararEmail = async () => {
  if (!clienteSelecionado) {
    Alert.alert('Erro', 'Cliente não identificado.');
    return;
  }

  if (!clienteSelecionado.email) {
    Alert.alert(
      'E-mail em falta',
      'Este cliente não tem endereço de e-mail registado.'
    );
    return;
  }

  if (totalExtrasPendentes > 0) {
    Alert.alert(
      'Extras pendentes',
      `Existem ${totalExtrasPendentes} extra(s) por valorizar. Valorize todos os extras antes de preparar o e-mail.`
    );
    return;
  }

  const valorMensalidade =
    Number(valorMensalidadeInput.replace(',', '.')) || 0;

  if (valorMensalidade <= 0) {
    Alert.alert(
      'Mensalidade em falta',
      'Introduza ou confirme o valor da mensalidade antes de preparar o e-mail.'
    );
    return;
  }

  const mensalidadeGuardada =
    Number(clienteSelecionado.valor_manutencao || 0);

  if (valorMensalidade !== mensalidadeGuardada) {
    Alert.alert(
      'Mensalidade alterada',
      'O valor da mensalidade foi alterado. Guarde primeiro a mensalidade e depois prepare o e-mail.'
    );
    return;
  }

    const mesExtenso = formatarMesExtenso(mesReferencia);

  if (!modeloEmail) {
    Alert.alert(
      'Modelo em falta',
      'Não existe um modelo de e-mail de mensalidade configurado para esta empresa.'
    );
    return;
  }

  if (!dadosEmpresa) {
    Alert.alert(
      'Dados da empresa em falta',
      'Não foi possível carregar os dados da empresa.'
    );
    return;
  }

  const extrasValorizados = extrasCliente.filter(
    (extra) => extra.estado === 'valorizado'
  );

  const linhasExtras = extrasValorizados.map((extra) => {
    const quantidade = Number(extra.quantidade || 1);

    const descricao =
      quantidade > 1
        ? `${quantidade} x ${extra.descricao}`
        : extra.descricao;

    return `- ${descricao}: ${formatEuro(extra.valor_total)}`;
  });

  const saldoAnterior =
    Number(clienteSelecionado.saldo_anterior || 0);

  const valorPago =
    Number(clienteSelecionado.valor_pago || 0);

  const totalAtual =
    saldoAnterior +
    valorMensalidade +
    totalExtrasValorizados -
    valorPago;

  let textoExtras = '';

  if (extrasValorizados.length > 0) {
    textoExtras =
`Serviços / Materiais Extra:
${linhasExtras.join('\n')}

Total de extras: ${formatEuro(totalExtrasValorizados)}`;
  }

  let textoPagamento = construirTextoPagamento();

  let assunto = modeloEmail.assunto || '';

  let corpo = modeloEmail.corpo || '';

  assunto = assunto
    .replaceAll('{MES}', mesExtenso)
    .replaceAll('{NOME_EMPRESA}', dadosEmpresa.nome || '');

  corpo = corpo
  .replaceAll('{MES}', mesExtenso)
  .replaceAll(
    '{VALOR_MANUTENCAO}',
    formatEuro(valorMensalidade)
  )
  .replaceAll(
    '{EXTRAS}',
    textoExtras
  )
  .replaceAll(
    '{SALDO_ANTERIOR}',
    formatEuro(saldoAnterior)
  )
  .replaceAll(
    '{TOTAL}',
    formatEuro(totalAtual)
  )
  .replaceAll(
    '{PAGAMENTO}',
    textoPagamento
  )
  .replaceAll(
    '{NOME_EMPRESA}',
    dadosEmpresa.nome || ''
  );

if (valorPago > 0) {
  corpo += `

Pagamentos já registados: ${formatEuro(valorPago)}`;
}

await guardarPreferenciasPagamento();

setEmailPagamentoAtual(textoPagamento);

setEmailAssunto(assunto);
setEmailCorpo(corpo);
setModalEmailVisible(true);
};

const registarEmailPreparado = async () => {
  if (!clienteSelecionado || !empresaid || !mesReferencia) {
    return null;
  }

  try {
    const usuarioIdStorage = await AsyncStorage.getItem('usuarioId');

    const response = await axios.post(
      `${Config.API_URL}/comunicacoes-clientes`,
      {
        empresaid,
        cliente_id: clienteSelecionado.cliente_id,
        mes_referencia: mesReferencia,
        canal: 'email',
        assunto: emailAssunto,
        mensagem: emailCorpo,
        criado_por: usuarioIdStorage
          ? Number(usuarioIdStorage)
          : null,
      }
    );

    return response.data.comunicacao?.id || null;
  } catch (error) {
    console.error(
      'Erro ao registar comunicação preparada:',
      error
    );

    return null;
  }
};

const confirmarEmailEnviado = () => {
  if (!comunicacaoEmailId) {
    return;
  }

  Alert.alert(
    'E-mail enviado?',
    'Confirme se o e-mail foi efetivamente enviado ao cliente.',
    [
      {
        text: 'Não',
        style: 'cancel',
        onPress: async () => {
          try {
            await axios.put(
              `${Config.API_URL}/comunicacoes-clientes/${comunicacaoEmailId}/estado`,
              {
                empresaid,
                estado: 'cancelado',
              }
            );
          } catch (error) {
            console.error(
              'Erro ao cancelar comunicação:',
              error
            );
          }

          setComunicacaoEmailId(null);
        },
      },
      {
        text: 'Sim',
        onPress: async () => {
          try {
            await axios.put(
              `${Config.API_URL}/comunicacoes-clientes/${comunicacaoEmailId}/estado`,
              {
                empresaid,
                estado: 'enviado',
              }
            );

            Alert.alert(
              'Registado',
              'O e-mail ficou marcado como enviado.'
            );

            setModalEmailVisible(false);
          } catch (error) {
            console.error(
              'Erro ao confirmar envio do e-mail:',
              error
            );

            Alert.alert(
              'Erro',
              'Não foi possível registar o envio do e-mail.'
            );
          }

          setComunicacaoEmailId(null);
        },
      },
    ]
  );
};

const abrirEmail = () => {
  if (!clienteSelecionado?.email) {
    Alert.alert(
      'Erro',
      'O cliente não tem endereço de e-mail registado.'
    );
    return;
  }

  Alert.alert(
    'Abrir aplicação de e-mail',
    `Abrir o e-mail preparado para ${clienteSelecionado.email}?`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Abrir e-mail',
        onPress: async () => {
  try {
    const comunicacaoId =
      await registarEmailPreparado();

    if (!comunicacaoId) {
      Alert.alert(
        'Erro',
        'Não foi possível registar a preparação do e-mail.'
      );
      return;
    }

    setComunicacaoEmailId(comunicacaoId);
    setAguardarConfirmacaoEmail(true);

    const url =
      `mailto:${clienteSelecionado.email}` +
      `?subject=${encodeURIComponent(emailAssunto)}` +
      `&body=${encodeURIComponent(emailCorpo)}`;

    await Linking.openURL(url);
  } catch (error) {
    console.error(
      'Erro ao abrir aplicação de e-mail:',
      error
    );

    setAguardarConfirmacaoEmail(false);

    Alert.alert(
      'Erro',
      'Não foi possível abrir uma aplicação de e-mail neste dispositivo.'
    );
  }
},
      },
    ]
  );
};

const carregarDadosEmpresa = async () => {
  if (!empresaid) {
    return null;
  }

  try {
    const response = await axios.get(
      `${Config.API_URL}/empresas/${empresaid}`
    );

    setDadosEmpresa(response.data);

    return response.data as DadosEmpresa;
  } catch (error) {
    console.error('Erro ao carregar dados da empresa:', error);

    setDadosEmpresa(null);
    return null;
  }
};

const carregarModeloEmail = async () => {
  if (!empresaid) {
    return null;
  }

  try {
    const response = await axios.get(
      `${Config.API_URL}/modelos-comunicacao`,
      {
        params: {
          empresaid,
          tipo: 'mensalidade_email',
        },
      }
    );

    const modelo =
      response.data.modelos?.length > 0
        ? response.data.modelos[0]
        : null;

    setModeloEmail(modelo);

    return modelo as ModeloComunicacao | null;
  } catch (error) {
    console.error('Erro ao carregar modelo de e-mail:', error);

    setModeloEmail(null);
    return null;
  }
};

const carregarPreferenciasPagamento = async (
  clienteId: number
) => {
  if (!empresaid) {
    return;
  }

  try {
    const response = await axios.get(
      `${Config.API_URL}/clientes-preferencias-pagamento`,
      {
        params: {
          empresaid,
          cliente_id: clienteId,
        },
      }
    );

    const preferencias =
      response.data.preferencias as PreferenciasPagamento;

    setUsarIban1(preferencias.usar_iban1);
    setUsarIban2(preferencias.usar_iban2);
    setUsarMbway(preferencias.usar_mbway);
  } catch (error) {
    console.error(
      'Erro ao carregar preferências de pagamento:',
      error
    );

    // padrão neutro
    setUsarIban1(true);
    setUsarIban2(false);
    setUsarMbway(false);
  }
};

const abrirModalMensalidade = async (cliente: ContaCliente) => {
  setClienteSelecionado(cliente);

  setValorMensalidadeInput(
    Number(cliente.valor_manutencao || 0) > 0
      ? String(cliente.valor_manutencao)
      : ''
  );

  setObservacoesMensalidadeInput(cliente.observacoes || '');

  setExtrasCliente([]);
  setTotalExtrasValorizados(0);
  setTotalExtrasPendentes(0);
  setExtrasExpandidos(false);

  setModalMensalidadeVisible(true);

await Promise.all([
  carregarExtrasClienteMes(cliente.cliente_id),
  carregarDadosEmpresa(),
  carregarModeloEmail(),
  carregarPreferenciasPagamento(cliente.cliente_id),
]);
};

const confirmarMensalidade = () => {
  if (!clienteSelecionado) {
    return;
  }

  const valor = Number(valorMensalidadeInput.replace(',', '.')) || 0;

  if (valor <= 0) {
    Alert.alert(
      'Atenção',
      'Introduza um valor de mensalidade superior a zero.'
    );
    return;
  }

  Alert.alert(
    'Confirmar mensalidade',
    `Lançar ${formatEuro(valor)} para ${clienteSelecionado.nome}?`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Confirmar',
        onPress: guardarMensalidadeManual,
      },
    ]
  );
};

const guardarMensalidadeManual = async () => {
  if (!clienteSelecionado || !empresaid || !mesReferencia) {
    Alert.alert('Erro', 'Dados incompletos para lançar a mensalidade.');
    return;
  }

  try {
    const valorMensalidade =
      Number(valorMensalidadeInput.replace(',', '.')) || 0;

    const response = await axios.post(
      `${Config.API_URL}/conta-corrente-clientes/lancar-mensalidade-manual`,
      {
        cliente_id: clienteSelecionado.cliente_id,
        empresaid,
        mes_referencia: mesReferencia,
        valor_manutencao: valorMensalidade,
        observacoes: observacoesMensalidadeInput,
      }
    );

    if (response.status === 200) {
      Alert.alert(
        'Sucesso',
        response.data.message || 'Mensalidade lançada.'
      );

      setModalMensalidadeVisible(false);
      setClienteSelecionado(null);

      carregarContaCorrente(empresaid);
    }
  } catch (error) {
    console.error('Erro ao lançar mensalidade manual:', error);

    Alert.alert(
      'Erro',
      'Não foi possível lançar a mensalidade.'
    );
  }
};

const guardarPreferenciasPagamento = async () => {
  if (!clienteSelecionado || !empresaid) {
    return;
  }

  try {
    await axios.put(
      `${Config.API_URL}/clientes-preferencias-pagamento`,
      {
        empresaid,
        cliente_id: clienteSelecionado.cliente_id,
        usar_iban1: usarIban1,
        usar_iban2: usarIban2,
        usar_mbway: usarMbway,
      }
    );
  } catch (error) {
    console.error(
      'Erro ao guardar preferências de pagamento:',
      error
    );
  }
};

const atualizarMetodosPagamentoEmail = async () => {
  if (!clienteSelecionado) {
    Alert.alert(
      'Erro',
      'Cliente não identificado.'
    );
    return;
  }

  const novoTextoPagamento = construirTextoPagamento();

  try {
    await guardarPreferenciasPagamento();

    setEmailCorpo((corpoAtual) => {
      // Se já existia um bloco de pagamento,
      // substitui apenas esse bloco.
      if (
        emailPagamentoAtual &&
        corpoAtual.includes(emailPagamentoAtual)
      ) {
        return corpoAtual.replace(
          emailPagamentoAtual,
          novoTextoPagamento
        );
      }

      // Se não existia anteriormente e agora existe,
      // acrescenta-o no final.
      if (
        !emailPagamentoAtual &&
        novoTextoPagamento
      ) {
        return `${corpoAtual.trim()}

${novoTextoPagamento}`;
      }

      return corpoAtual;
    });

    setEmailPagamentoAtual(novoTextoPagamento);

    Alert.alert(
      'Atualizado',
      'Os métodos de pagamento foram atualizados para este cliente.'
    );
  } catch (error) {
    console.error(
      'Erro ao atualizar métodos de pagamento:',
      error
    );

    Alert.alert(
      'Erro',
      'Não foi possível atualizar os métodos de pagamento.'
    );
  }
};

const abrirModalPagamento = async (cliente: ContaCliente) => {
  setClienteSelecionado(cliente);

  setValorPagoInput('');
  setObservacoesInput('');

  setMovimentos([]);
  setTotalRecebidoMes(0);

  setModalVisible(true);

  await carregarMovimentosPagamento(cliente.cliente_id);
};

const confirmarPagamento = () => {
  if (!clienteSelecionado) {
    return;
  }

  const valorPago = Number(valorPagoInput.replace(',', '.')) || 0;

  if (valorPago <= 0) {
    Alert.alert('Atenção', 'Introduza um valor recebido superior a zero.');
    return;
  }

  Alert.alert(
    'Confirmar pagamento',
    `Registar ${formatEuro(valorPago)} para ${clienteSelecionado.nome}?`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Confirmar',
        onPress: guardarPagamento,
      },
    ]
  );
};

const guardarPagamento = async () => {
  if (!clienteSelecionado || !empresaid || !mesReferencia) {
    Alert.alert('Erro', 'Dados incompletos para registar pagamento.');
    return;
  }

  try {
    const valorPago = Number(valorPagoInput.replace(',', '.')) || 0;

    const response = await axios.post(`${Config.API_URL}/conta-corrente-clientes/pagamento`, {
      cliente_id: clienteSelecionado.cliente_id,
      empresaid,
      mes_referencia: mesReferencia,
      valor_manutencao: Number(clienteSelecionado.valor_manutencao || 0),
      valor_extra: Number(clienteSelecionado.valor_extra || 0),
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

const clientesFiltrados = clientes.filter((cliente) => {
  const termo = pesquisa.toLowerCase().trim();

  if (!termo) {
    return true;
  }

  const nome = cliente.nome.toLowerCase();

  const saldoTotal = Number(cliente.saldo_total || 0);

  const saldoComPonto = saldoTotal.toFixed(2);
  const saldoComVirgula = saldoComPonto.replace('.', ',');

  return (
    nome.includes(termo) ||
    saldoComPonto.includes(termo) ||
    saldoComVirgula.includes(termo)
  );
});

const formatSaldoTotal = (valor: string | number | null) => {
  const n = Number(valor || 0);

  if (n < 0) {
    return `Crédito: ${Math.abs(n).toFixed(2)} €`;
  }

  return `Saldo total: ${n.toFixed(2)} €`;
};

const toggleClientePagoExpandido = (clienteId: number) => {
  setClientesPagosExpandidos((prev) => ({
    ...prev,
    [clienteId]: !prev[clienteId],
  }));
};

const renderItem = ({ item }: { item: ContaCliente }) => {
  const estado = item.estado || 'pendente';

  const saldoTotal = Number(item.saldo_total || 0);

  const clientePago = saldoTotal <= 0;

  const pagoExpandido =
    clientesPagosExpandidos[item.cliente_id] === true;

  const mostrarCartaoCompleto =
    !clientePago || pagoExpandido;

  if (!mostrarCartaoCompleto) {
    return (
      <TouchableOpacity
        style={styles.cardPagoFechado}
        onPress={() =>
          toggleClientePagoExpandido(item.cliente_id)
        }
      >
        <View style={styles.cardPagoCabecalho}>
          <Text style={styles.cardPagoNome}>
            {item.nome}
          </Text>

          <Text style={styles.cardPagoEstado}>
            ✓ Pago
          </Text>
        </View>

        {item.email_enviado && (
          <Text style={styles.cardPagoEmail}>
            ✓ E-mail enviado
          </Text>
        )}

        <Text style={styles.cardPagoAbrir}>
          Tocar para ver detalhes
        </Text>
      </TouchableOpacity>
    );
  }

  return (
      <View style={styles.card}>
        <Text style={styles.nome}>{item.nome}</Text>
        {item.email_enviado && (
  <Text style={styles.emailEnviado}>
    ✓ E-mail enviado
  </Text>
)}
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
  style={styles.mensalidadeButton}
  onPress={() => abrirModalMensalidade(item)}
>
  <Text style={styles.pagamentoButtonText}>
    Lançar / Editar Mensalidade
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.pagamentoButton}
  onPress={() => abrirModalPagamento(item)}
>
  <Text style={styles.pagamentoButtonText}>
    Registar novo pagamento
  </Text>
</TouchableOpacity>
{clientePago && (
  <TouchableOpacity
    style={styles.fecharCartaoPagoButton}
    onPress={() =>
      toggleClientePagoExpandido(item.cliente_id)
    }
  >
    <Text style={styles.fecharCartaoPagoText}>
      Fechar detalhes
    </Text>
  </TouchableOpacity>
)}
      </View>
    );
};

  const totalClientesPagos = clientes.filter(
  (c) => Number(c.saldo_total || 0) <= 0
).length;

const totalRecebido = clientes.reduce(
  (acc, c) => acc + Number(c.valor_pago || 0),
  0
);

const totalPorReceber = clientes.reduce((acc, c) => {
  const saldo = Number(c.saldo_total || 0);
  return saldo > 0 ? acc + saldo : acc;
}, 0);

const totalCreditos = clientes.reduce((acc, c) => {
  const saldo = Number(c.saldo_total || 0);
  return saldo < 0 ? acc + Math.abs(saldo) : acc;
}, 0);

const totalClientesPorPagar = clientes.filter(
  (c) => Number(c.saldo_total || 0) > 0
).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conta Corrente de Clientes</Text>
      <Text style={styles.subTitle}>
  Mensalidades referentes a: {mesReferencia || '-'}
</Text>
      <TextInput
  style={styles.searchInput}
  placeholder="Pesquisar cliente ou saldo..."
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
  ListHeaderComponent={
    <View style={styles.resumoCard}>
      <Text style={styles.resumoTitle}>Resumo do mês</Text>

      <View style={styles.resumoLinha}>
        <Text style={styles.resumoLabel}>Clientes pagos:</Text>
        <Text style={styles.resumoValor}>{totalClientesPagos}</Text>
      </View>

      <View style={styles.resumoLinha}>
        <Text style={styles.resumoLabel}>Recebido:</Text>
        <Text style={styles.resumoValor}>{formatEuro(totalRecebido)}</Text>
      </View>

      <View style={styles.resumoLinha}>
        <Text style={styles.resumoLabel}>Clientes por pagar:</Text>
        <Text style={styles.resumoValor}>{totalClientesPorPagar}</Text>
      </View>

      <View style={styles.resumoLinha}>
        <Text style={styles.resumoLabel}>Por receber:</Text>
        <Text style={styles.resumoValor}>{formatEuro(totalPorReceber)}</Text>
      </View>

      <View style={styles.resumoLinha}>
        <Text style={styles.resumoLabel}>Créditos:</Text>
        <Text style={styles.resumoValor}>{formatEuro(totalCreditos)}</Text>
      </View>
    </View>
  }
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
      <Text style={styles.modalTitle}>Registar Pagamento</Text>

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
        style={[styles.input, styles.inputObservacoes]}
        placeholder="Observações"
        placeholderTextColor="#666"
        value={observacoesInput}
        onChangeText={setObservacoesInput}
        multiline
      />

      <View style={styles.historicoContainer}>
        <Text style={styles.historicoTitle}>
          Pagamentos deste mês
        </Text>

        {movimentos.length === 0 ? (
          <Text style={styles.historicoVazio}>
            Ainda não existem pagamentos registados.
          </Text>
        ) : (
          movimentos.map((movimento) => {
            const data = new Date(movimento.data_pagamento);
            const dataFormatada = data.toLocaleDateString('pt-PT');

            return (
              <View key={movimento.id} style={styles.historicoLinha}>
                <View style={styles.historicoInfo}>
                  <Text style={styles.historicoData}>
                    {dataFormatada}
                  </Text>

                  {movimento.observacoes ? (
                    <Text style={styles.historicoObservacao}>
                      {movimento.observacoes}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.historicoValor}>
                  {formatEuro(movimento.valor)}
                </Text>
              </View>
            );
          })
        )}

        <View style={styles.historicoTotalLinha}>
          <Text style={styles.historicoTotalLabel}>
            Total recebido:
          </Text>

          <Text style={styles.historicoTotalValor}>
            {formatEuro(totalRecebidoMes)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.modalSaveButton}
        onPress={confirmarPagamento}
      >
        <Text style={styles.modalButtonText}>
          Guardar Pagamento
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modalCancelButton}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.modalButtonText}>
          Cancelar
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


<Modal
  visible={modalMensalidadeVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setModalMensalidadeVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        Lançar / Editar Mensalidade
      </Text>

      <Text style={styles.modalCliente}>
        {clienteSelecionado?.nome}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Valor da mensalidade"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={valorMensalidadeInput}
        onChangeText={setValorMensalidadeInput}
      />

      <View style={styles.extrasMensalidadeContainer}>
  <TouchableOpacity
    style={styles.extrasMensalidadeCabecalho}
    onPress={() => setExtrasExpandidos(!extrasExpandidos)}
  >
    <Text style={styles.extrasMensalidadeLabel}>
      Extras
    </Text>

    <View style={styles.extrasMensalidadeDireita}>
      <Text style={styles.extrasMensalidadeValor}>
        {formatEuro(totalExtrasValorizados)}
      </Text>

      <Text style={styles.extrasMensalidadeSeta}>
        {extrasExpandidos ? '▲' : '▼'}
      </Text>
    </View>
  </TouchableOpacity>

  {totalExtrasPendentes > 0 && (
    <Text style={styles.extrasResumoPendentesTotal}>
      Pendentes de valorização: {totalExtrasPendentes}
    </Text>
  )}

  {extrasExpandidos && (
    <View style={styles.extrasMensalidadeDetalhes}>
      {extrasCliente.length === 0 ? (
        <Text style={styles.historicoVazio}>
          Não existem extras neste mês.
        </Text>
      ) : (
        extrasCliente.map((extra) => (
          <View
            key={extra.id}
            style={styles.extraResumoLinha}
          >
            <Text style={styles.extraResumoDescricao}>
              {extra.descricao}
            </Text>

            <Text style={styles.extraResumoQuantidade}>
              Quantidade: {Number(extra.quantidade)}
            </Text>

            {extra.estado === 'pendente' ? (
            <TouchableOpacity
            onPress={() => abrirValorizarExtra(extra)}
          >
            <Text style={styles.extraResumoPendente}>
             Pendente de valorização — tocar para definir valor
            </Text>
            </TouchableOpacity>
           ) : extra.estado === 'nao_cobrar' ? (
              <Text style={styles.extraResumoNaoCobrar}>
                Não cobrar
              </Text>
            ) : (
              <>
                <Text style={styles.extraResumoQuantidade}>
                  Valor unitário: {formatEuro(extra.valor_unitario)}
                </Text>

                <Text style={styles.extraResumoValor}>
                  Total: {formatEuro(extra.valor_total)}
                </Text>
              </>
            )}
          </View>
        ))
      )}
    </View>
  )}
</View>

      <TextInput
        style={[styles.input, styles.inputObservacoes]}
        placeholder="Observações"
        placeholderTextColor="#666"
        value={observacoesMensalidadeInput}
        onChangeText={setObservacoesMensalidadeInput}
        multiline
      />

      <TouchableOpacity
        style={styles.modalSaveButton}
        onPress={confirmarMensalidade}
      >
        <Text style={styles.modalButtonText}>
          Guardar Mensalidade
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
         style={styles.emailButton}
         onPress={prepararEmail}
      >
        <Text style={styles.modalButtonText}>
          Preparar E-mail
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modalCancelButton}
        onPress={() => setModalMensalidadeVisible(false)}
      >
        <Text style={styles.modalButtonText}>
          Cancelar
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

<Modal
  visible={modalEmailVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setModalEmailVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, styles.modalEmailContent]}>
      <ScrollView
        style={styles.modalEmailScroll}
        contentContainerStyle={styles.modalEmailScrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.modalTitle}>
          Preparar E-mail
        </Text>

        <Text style={styles.modalCliente}>
          {clienteSelecionado?.nome}
        </Text>

        <Text style={styles.emailDestinatario}>
          Para: {clienteSelecionado?.email || '-'}
        </Text>

        <View style={styles.metodosPagamentoContainer}>
          <Text style={styles.metodosPagamentoTitulo}>
            Métodos de pagamento
          </Text>

          <TouchableOpacity
            style={styles.metodoPagamentoLinha}
            onPress={() => setUsarIban1(!usarIban1)}
          >
            <Text style={styles.checkboxPagamento}>
              {usarIban1 ? '☑' : '☐'}
            </Text>

            <Text style={styles.metodoPagamentoTexto}>
              IBAN Principal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metodoPagamentoLinha}
            onPress={() => setUsarIban2(!usarIban2)}
          >
            <Text style={styles.checkboxPagamento}>
              {usarIban2 ? '☑' : '☐'}
            </Text>

            <Text style={styles.metodoPagamentoTexto}>
              IBAN Secundário
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metodoPagamentoLinha}
            onPress={() => setUsarMbway(!usarMbway)}
          >
            <Text style={styles.checkboxPagamento}>
              {usarMbway ? '☑' : '☐'}
            </Text>

            <Text style={styles.metodoPagamentoTexto}>
              MB WAY
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.atualizarPagamentoButton}
          onPress={atualizarMetodosPagamentoEmail}
        >
          <Text style={styles.modalButtonText}>
            Atualizar métodos de pagamento
          </Text>
        </TouchableOpacity>

        <Text style={styles.emailLabel}>
          Assunto
        </Text>

        <TextInput
          style={styles.input}
          value={emailAssunto}
          onChangeText={setEmailAssunto}
        />

        <Text style={styles.emailLabel}>
          Mensagem
        </Text>

        <TextInput
          style={[styles.input, styles.emailCorpoInput]}
          value={emailCorpo}
          onChangeText={setEmailCorpo}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.emailButton}
          onPress={abrirEmail}
        >
          <Text style={styles.modalButtonText}>
            Abrir E-mail
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalCancelButton}
          onPress={() => setModalEmailVisible(false)}
        >
          <Text style={styles.modalButtonText}>
            Voltar
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>

<Modal
  visible={modalValorizarExtraVisible}
  transparent
  animationType="slide"
  onRequestClose={() =>
    setModalValorizarExtraVisible(false)
  }
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        Valorizar Extra
      </Text>

      <Text style={styles.modalCliente}>
        {extraSelecionado?.descricao}
      </Text>

      {extraSelecionado ? (
        <Text style={styles.extraResumoQuantidade}>
          Quantidade: {Number(extraSelecionado.quantidade)}
        </Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Valor unitário"
        placeholderTextColor="#666"
        keyboardType="decimal-pad"
        value={valorExtraPendenteInput}
        onChangeText={setValorExtraPendenteInput}
      />

      <TouchableOpacity
        style={styles.modalSaveButton}
        onPress={confirmarValorizarExtra}
      >
        <Text style={styles.modalButtonText}>
          Guardar Valor
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modalCancelButton}
        onPress={() => {
          setModalValorizarExtraVisible(false);
          setExtraSelecionado(null);
          setValorExtraPendenteInput('');
        }}
      >
        <Text style={styles.modalButtonText}>
          Cancelar
        </Text>
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
    marginTop: 3,
    marginBottom: 3,
  },
  subTitle: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
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
  marginTop: 10,
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

cardPagoFechado: {
  backgroundColor: '#CCFFCC',
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 12,
  marginBottom: 10,
  width: '92%',
  alignSelf: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 3,
  elevation: 4,
},

cardPagoCabecalho: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

cardPagoNome: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#000',
  flex: 1,
  marginRight: 10,
},

cardPagoEstado: {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#000',
},

cardPagoEmail: {
  fontSize: 12,
  fontWeight: '600',
  color: '#000',
  marginTop: 4,
},

cardPagoAbrir: {
  fontSize: 11,
  color: '#555',
  marginTop: 5,
},

fecharCartaoPagoButton: {
  backgroundColor: '#D3D3D3',
  marginTop: 10,
  paddingVertical: 8,
  borderRadius: 20,
  alignItems: 'center',
},

fecharCartaoPagoText: {
  color: '#000',
  fontSize: 13,
  fontWeight: '600',
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
  marginBottom: 10,
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
resumoCard: {
  backgroundColor: '#fff',
  width: '92%',
  alignSelf: 'center',
  borderRadius: 18,
  padding: 14,
  marginBottom: 16,

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.18,
  shadowRadius: 4,
  elevation: 5,
},

resumoTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#000',
  marginBottom: 8,
  textAlign: 'center',
},

resumoLinha: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 4,
},

resumoLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#000',
},

resumoValor: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#000',
},

historicoContainer: {
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 14,
  marginBottom: 14,
},

historicoTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#000',
  textAlign: 'center',
  marginBottom: 10,
},

historicoVazio: {
  fontSize: 13,
  color: '#555',
  textAlign: 'center',
  marginBottom: 10,
},

historicoLinha: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 7,
  borderBottomWidth: 1,
  borderBottomColor: '#D3D3D3',
},

historicoInfo: {
  flex: 1,
  marginRight: 10,
},

historicoData: {
  fontSize: 13,
  fontWeight: '600',
  color: '#000',
},

historicoObservacao: {
  fontSize: 12,
  color: '#555',
  marginTop: 2,
},

historicoValor: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#000',
},

historicoTotalLinha: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 12,
},

historicoTotalLabel: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#000',
},

historicoTotalValor: {
  fontSize: 15,
  fontWeight: 'bold',
  color: '#000',
},

mensalidadeButton: {
  backgroundColor: '#FFF5CC',
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

extrasResumoContainer: {
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 14,
  marginBottom: 14,
},

extrasResumoTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#000',
  textAlign: 'center',
  marginBottom: 10,
},

extraResumoLinha: {
  borderBottomWidth: 1,
  borderBottomColor: '#D3D3D3',
  paddingVertical: 7,
},

extraResumoInfo: {
  width: '100%',
},

extraResumoDescricao: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#000',
},

extraResumoQuantidade: {
  fontSize: 12,
  color: '#555',
  marginTop: 2,
},

extraResumoPendente: {
  fontSize: 12,
  fontWeight: 'bold',
  color: '#8A5A00',
  marginTop: 3,
},

extraResumoNaoCobrar: {
  fontSize: 12,
  fontWeight: 'bold',
  color: '#555',
  marginTop: 3,
},

extraResumoValor: {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#000',
  marginTop: 3,
},

extrasResumoTotalLinha: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 10,
},

extrasResumoTotalLabel: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#000',
},

extrasResumoTotalValor: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#000',
},

extrasResumoPendentesTotal: {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#8A5A00',
  marginTop: 6,
  textAlign: 'center',
},

extrasMensalidadeContainer: {
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 11,
  marginBottom: 12,
},

extrasMensalidadeCabecalho: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

extrasMensalidadeLabel: {
  fontSize: 15,
  fontWeight: '600',
  color: '#000',
},

extrasMensalidadeDireita: {
  flexDirection: 'row',
  alignItems: 'center',
},

extrasMensalidadeValor: {
  fontSize: 15,
  fontWeight: 'bold',
  color: '#000',
},

extrasMensalidadeSeta: {
  fontSize: 13,
  color: '#000',
  marginLeft: 10,
},

extrasMensalidadeDetalhes: {
  marginTop: 10,
},

emailButton: {
  backgroundColor: '#ADD8E6',
  width: '100%',
  paddingVertical: 12,
  borderRadius: 20,
  alignItems: 'center',
  marginTop: 10,
},

emailDestinatario: {
  width: '100%',
  fontSize: 13,
  color: '#000',
  marginBottom: 12,
},

emailLabel: {
  width: '100%',
  fontSize: 14,
  fontWeight: 'bold',
  color: '#000',
  marginBottom: 5,
},

emailCorpoInput: {
  minHeight: 280,
  maxHeight: 400,
},

atualizarPagamentoButton: {
  backgroundColor: '#FFF5CC',
  width: '100%',
  paddingVertical: 10,
  borderRadius: 20,
  alignItems: 'center',
  marginBottom: 15,
},

metodosPagamentoContainer: {
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: 15,
  padding: 12,
  marginBottom: 15,
},

metodosPagamentoTitulo: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#000',
  marginBottom: 8,
},

metodoPagamentoLinha: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
},

checkboxPagamento: {
  fontSize: 22,
  marginRight: 10,
  color: '#000',
},

metodoPagamentoTexto: {
  fontSize: 14,
  color: '#000',
},

modalEmailContent: {
  maxHeight: '92%',
},

modalEmailScroll: {
  width: '100%',
},

modalEmailScrollContent: {
  width: '100%',
  alignItems: 'center',
  paddingBottom: 10,
},

emailEnviado: {
  alignSelf: 'flex-start',
  backgroundColor: '#CCFFCC',
  color: '#000',
  fontSize: 12,
  fontWeight: 'bold',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  marginBottom: 6,
},
});

export default ContaCorrenteClientesScreen;