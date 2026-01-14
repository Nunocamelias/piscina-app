import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';


const HomeScreen = ({ navigation }: any) => {
  const [notificacoesPendentes, setNotificacoesPendentes] = useState(0);
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaId, setEmpresaId] = useState<number | null>(null);


  // 🔹 Carrega ID da empresa, logo e notificações
  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (empresaid) {
          const idNum = parseInt(empresaid, 10);
          setEmpresaId(idNum);
          await fetchEmpresa(idNum);
          await fetchNotificacoesPendentes(idNum);
        } else {
          console.warn('❌ Nenhum empresaid encontrado no AsyncStorage.');
        }
      } catch (error) {
        console.error('Erro ao buscar empresaid:', error);
      }
    };
    fetchEmpresaid();
  }, []);

  // 🔹 Atualiza notificações ao regressar ao ecrã
  useFocusEffect(
    React.useCallback(() => {
      if (empresaId) {
        fetchNotificacoesPendentes(empresaId);
      }
    }, [empresaId])
  );

  // 🔹 Busca informações da empresa (apenas nome, sem logo em AsyncStorage)
const fetchEmpresa = async (empresaid: number) => {
  try {
    // Carrega só o NOME do cache (é pequeno, não há stress)
    const cachedNome = await AsyncStorage.getItem('empresa_nome');

    if (cachedNome) {
      setEmpresaNome(cachedNome);
      console.log('⚡ Nome da empresa carregado do cache');
    }

    // Depois busca dados atualizados do servidor
    const response = await axios.get(`${Config.API_URL}/empresas/${empresaid}`);
    if (response.data) {
      const { nome } = response.data;

      setEmpresaNome(nome);

      // Atualiza o cache local só com o nome
      await AsyncStorage.setItem('empresa_nome', nome);

      console.log('💾 Nome da empresa atualizado no cache');
    }
  } catch (error) {
    // Só log normal para não aparecer ecrã vermelho
    console.log('Falha ao buscar informações da empresa (HomeScreen):', error);
  }
};



  // 🔹 Busca notificações pendentes
  const fetchNotificacoesPendentes = async (empresaid: number) => {
    try {
      const response = await axios.get(`${Config.API_URL}/notificacoes`, {
        params: { empresaid },
      });

      if (response.data && Array.isArray(response.data)) {
        const pendentes = response.data.filter((n: any) => n.status === 'pendente').length;
        setNotificacoesPendentes(pendentes);
      } else {
        console.warn('⚠️ Resposta inesperada ao buscar notificações.');
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };



  return (
  <View style={styles.container}>

    {/* 🔹 Secção dos botões — centralizada */}
    <View style={{ marginTop: 180, alignItems: 'center', width: '100%' }}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Clientes')}>
        <Text style={styles.buttonText}>Área de Clientes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Equipes')}>
        <Text style={styles.buttonText}>Área de Equipas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ListasManutencoes')}>
        <Text style={styles.buttonText}>Gerir Manutenções</Text>
      </TouchableOpacity>

      {/* 🔹 Botão Administração com ícone de notificação */}
      <TouchableOpacity
        style={[styles.button, styles.adminButton]}
        onPress={() => {
          if (empresaId !== null) {
            navigation.navigate('Administracao');
          } else {
            console.error('❌ Erro: empresaId é null, não foi possível acessar Administração.');
          }
        }}>
        <View style={styles.adminButtonContent}>
          <Text style={styles.buttonText}>Administração</Text>

          {notificacoesPendentes > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{notificacoesPendentes}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>

    {/* 🔹 Nome da empresa e powered by no rodapé */}
    <View style={styles.footer}>
      <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
      <Text style={styles.subTitle}>powered by GESPOOL</Text>
    </View>
  </View>
);


};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D3D3D3',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0, // 🔹 Mantém o logo encostado ao topo
  },
  button: {
  backgroundColor: '#22b4b4ff',
  paddingVertical: 15,
  paddingHorizontal: 40,
  borderRadius: 25,
  marginBottom: 15,
  width: '80%',
  alignItems: 'center',

  // 🔹 Remove o contorno preto
  borderWidth: 0,

  // 🔹 Sombra 3D leve e elegante
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 4.65,
  elevation: 10, // ← dá profundidade real no Android
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  adminButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 52,
  },

  adminButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notificationBadge: {
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    right: -65,
    top: 0,
  },

  notificationText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // 🔹 Footer fixo no fundo
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },

  empresaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },

  subTitle: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#444',
    marginTop: 2,
  },
});


export default HomeScreen;
