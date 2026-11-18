import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../App';
import IndicadorNaoLidas from '../components/IndicadorNaoLidas';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RouteParams = {
  equipeId?: number;
  equipeNome?: string;
};

// 🔹 Tipo de navegação
type EquipeTecNav = StackNavigationProp<
  RootStackParamList,
  'EquipeTecHome'
>;

const EquipeTecHomeScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<EquipeTecNav>();
  const insets = useSafeAreaInsets();

  const { equipeId, equipeNome } = (route.params || {}) as RouteParams;

  const handleVerManutencoes = () => {
    Alert.alert(
      'Em desenvolvimento',
      'Aqui vais poder ver a lista de intervenções técnicas atribuídas a esta equipa.'
    );
  };

  const handleVerNotificacoes = () => {
    // 👉 Agora liga diretamente ao ecrã central de notificações
    navigation.navigate('ReceberNotificacoes');
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>
          Equipa Técnica {equipeNome ? `- ${equipeNome}` : ''}
        </Text>

        {equipeId && (
          <Text style={styles.subtitle}>ID da equipa: {equipeId}</Text>
        )}

        <Text style={styles.text}>
          Esta é a área inicial das equipas técnicas. Aqui vão aparecer as
          intervenções técnicas, reparações especiais, instalações de equipamentos
          e outras tarefas não rotineiras de manutenção semanal.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleVerManutencoes}>
          <Text style={styles.buttonText}>Ver intervenções técnicas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleVerNotificacoes}
        >
          <Text style={styles.buttonSecondaryText}>Ver notificações técnicas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 12 }]} onPress={() => navigation.navigate('MensagensInternas')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.buttonSecondaryText}>Mensagens internas</Text>
            <IndicadorNaoLidas />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>powered by GESPOOL</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#ADD8E6',
  },
  container: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'flex-start',
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
    marginTop: 'auto',
    paddingTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#000000',
  },
});

export default EquipeTecHomeScreen;

