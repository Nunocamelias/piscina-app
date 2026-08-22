import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ModelosComunicacaoScreen = () => {
  const [empresaid, setEmpresaid] = useState<number | null>(null);

  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [corpoEmail, setCorpoEmail] = useState('');

  const [corpoWhatsapp, setCorpoWhatsapp] = useState('');

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const empresaGuardada = await AsyncStorage.getItem('empresaid');

      if (!empresaGuardada) {
        Alert.alert(
          'Erro',
          'Não foi possível identificar a empresa.'
        );
        return;
      }

      const empresaIdNumero = Number(empresaGuardada);
      setEmpresaid(empresaIdNumero);

      const response = await axios.get(
        `${Config.API_URL}/modelos-comunicacao`,
        {
          params: {
            empresaid: empresaIdNumero,
          },
        }
      );

      const modelos = response.data.modelos || [];

      const email = modelos.find(
        (modelo: any) => modelo.tipo === 'mensalidade_email'
      );

      const whatsapp = modelos.find(
        (modelo: any) => modelo.tipo === 'mensalidade_whatsapp'
      );

      if (email) {
        setAssuntoEmail(email.assunto || '');
        setCorpoEmail(email.corpo || '');
      }

      if (whatsapp) {
        setCorpoWhatsapp(whatsapp.corpo || '');
      }
    } catch (error) {
      console.error(
        'Erro ao carregar modelos de comunicação:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível carregar os modelos de comunicação.'
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmarGuardar = () => {
    if (!empresaid) {
      Alert.alert(
        'Erro',
        'Empresa não identificada.'
      );
      return;
    }

    if (!corpoEmail.trim()) {
      Alert.alert(
        'Atenção',
        'O corpo do e-mail não pode ficar vazio.'
      );
      return;
    }

    Alert.alert(
      'Guardar modelos',
      'Pretende guardar estas alterações?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Guardar',
          onPress: guardarModelos,
        },
      ]
    );
  };

  const guardarModelos = async () => {
    if (!empresaid) {
      return;
    }

    try {
      setGuardando(true);

      await axios.post(
        `${Config.API_URL}/modelos-comunicacao`,
        {
          empresaid,
          tipo: 'mensalidade_email',
          assunto: assuntoEmail,
          corpo: corpoEmail,
        }
      );

      if (corpoWhatsapp.trim()) {
        await axios.post(
          `${Config.API_URL}/modelos-comunicacao`,
          {
            empresaid,
            tipo: 'mensalidade_whatsapp',
            assunto: null,
            corpo: corpoWhatsapp,
          }
        );
      }

      Alert.alert(
        'Sucesso',
        'Modelos de comunicação guardados.'
      );
    } catch (error) {
      console.error(
        'Erro ao guardar modelos de comunicação:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível guardar os modelos.'
      );
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Modelos de Comunicação
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          E-mail de Mensalidade
        </Text>

        <Text style={styles.label}>
          Assunto
        </Text>

        <TextInput
          style={styles.input}
          value={assuntoEmail}
          onChangeText={setAssuntoEmail}
          placeholder="Ex: Manutenção da piscina – {MES}"
          placeholderTextColor="#777"
        />

        <Text style={styles.label}>
          Corpo do e-mail
        </Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={corpoEmail}
          onChangeText={setCorpoEmail}
          multiline
          textAlignVertical="top"
          placeholder="Introduza o texto base do e-mail..."
          placeholderTextColor="#777"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          WhatsApp de Mensalidade
        </Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={corpoWhatsapp}
          onChangeText={setCorpoWhatsapp}
          multiline
          textAlignVertical="top"
          placeholder="Introduza o texto base da mensagem WhatsApp..."
          placeholderTextColor="#777"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Variáveis disponíveis
        </Text>

        <Text style={styles.variavel}>
          {'{MES}'} — mês de referência
        </Text>

        <Text style={styles.variavel}>
          {'{VALOR_MANUTENCAO}'} — mensalidade
        </Text>

        <Text style={styles.variavel}>
          {'{EXTRAS}'} — discriminação dos extras
        </Text>

        <Text style={styles.variavel}>
          {'{PAGAMENTO}'} — método(s) de pagamento
        </Text>

        <Text style={styles.variavel}>
          {'{NOME_EMPRESA}'} — nome da empresa
        </Text>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={confirmarGuardar}
        disabled={guardando}
      >
        <Text style={styles.saveButtonText}>
          {guardando
            ? 'A guardar...'
            : 'Guardar Modelos'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D3D3D3',
  },

  content: {
    padding: 15,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    elevation: 4,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    color: '#000',
  },

  textArea: {
    minHeight: 180,
  },

  variavel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#000',
  },

  saveButton: {
    backgroundColor: '#ADD8E6',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default ModelosComunicacaoScreen;