import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native'; // 👈 acrescentado
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../App';

type ContabilidadeHomeNav = StackNavigationProp<
  RootStackParamList,
  'ContabilidadeHome'
>;

type RouteParams = {
  userId?: number;
  userNome?: string;
};

const ContabilidadeHomeScreen: React.FC = () => {
  const navigation = useNavigation<ContabilidadeHomeNav>();
  const route = useRoute(); // 👈 acrescentado

  const { userId, userNome } = (route.params || {}) as RouteParams;

  const handleVerAFaturar = () => {
    // 👉 Agora abre o ecrã central de notificações
    navigation.navigate('ReceberNotificacoes');
    // Mais tarde podemos passar um filtro: { filtroInicial: 'aguardar_faturacao' }
  };

  const handleVerPagamentos = () => {
    Alert.alert(
      'Em desenvolvimento',
      'Aqui vais poder acompanhar faturas enviadas e pagamentos recebidos.'
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
         Área de Contabilidade {userNome ? `- ${userNome}` : ''}
        </Text>
        {userId && (
        <Text style={styles.subtitle}>ID do utilizador: {userId}</Text>
        )}
        <Text style={styles.subtitle}>
          Bem-vindo à área de contabilidade da GES-POOL.
        </Text>
        <Text style={styles.text}>
          Nesta área vais receber as notificações marcadas como "Serviço
          concluído". A partir daqui defines quando a fatura foi emitida e
          quando o pagamento foi recebido, fechando o ciclo da notificação.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleVerAFaturar}>
          <Text style={styles.buttonText}>Ver serviços para faturar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleVerPagamentos}
        >
          <Text style={styles.buttonSecondaryText}>
            Ver faturas e pagamentos
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>powered by GES-POOL</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#ADD8E6', // Azul Claro
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4.65,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333333',
  },
  text: {
    fontSize: 14,
    marginBottom: 20,
    color: '#333333',
  },
  button: {
    backgroundColor: '#22b4b4ff',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#22b4b4ff',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#22b4b4ff',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#000000',
  },
});

export default ContabilidadeHomeScreen;

