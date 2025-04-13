import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, Appearance } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isDarkMode = Appearance.getColorScheme() === 'dark';

const HomeScreen = ({ navigation }: any) => {
  const [notificacoesPendentes, setNotificacoesPendentes] = useState(0);
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaId, setEmpresaId] = useState<number | null>(null);



  useEffect(() => {
    const fetchEmpresaid = async () => {
      try {
        const empresaid = await AsyncStorage.getItem('empresaid');
        if (empresaid) {
          setEmpresaId(parseInt(empresaid, 10));
          fetchEmpresa(parseInt(empresaid, 10)); // 🔹 Busca o nome da empresa
          fetchNotificacoesPendentes(parseInt(empresaid, 10)); // 🔹 Busca notificações
        }
      } catch (error) {
        console.error('Erro ao buscar empresaid:', error);
      }
    };

    fetchEmpresaid();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (empresaId) {
        fetchNotificacoesPendentes(empresaId);
      }
    }, [empresaId])
  );

  const fetchEmpresa = async (empresaid: number) => {
    try {
      const response = await axios.get(`${Config.API_URL}/empresas/${empresaid}`);

      if (response.data) {
        setEmpresaNome(response.data.nome); // ✅ Agora garante que o nome é atualizado
      }
    } catch (error) {
      console.error('Erro ao buscar informações da empresa:', error);
    }
  };

  const fetchNotificacoesPendentes = async (empresaid: number) => {
    try {
      const response = await axios.get(`${Config.API_URL}/notificacoes`, {
        params: { empresaid },
      });

      if (response.data) {
        const pendentes = response.data.filter((n: any) => n.status === 'pendente').length;
        setNotificacoesPendentes(pendentes);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };


  return (
    <View style={styles.container}>
      {/* 🔹 Cabeçalho com nome da empresa e ID */}
      <View style={styles.header}>
        <Text style={styles.title}>GES-POOL</Text>
        {empresaNome ? <Text style={styles.empresaNome}>{empresaNome}</Text> : null}
        {empresaId !== null ? <Text style={styles.empresaId}>ID: {empresaId}</Text> : null}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Clientes')}>
        <Text style={styles.buttonText}>Área de Clientes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Equipes')}>
        <Text style={styles.buttonText}>Área de Equipes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ListasManutencoes')}>
        <Text style={styles.buttonText}>Gerir Manutenções</Text>
      </TouchableOpacity>

      {/* 🔹 Botão Administração com Ícone de Notificação */}
      <TouchableOpacity
  style={[styles.button, styles.adminButton]}
  onPress={() => {
    if (empresaId !== null) {
      navigation.navigate('Administracao');
    } else {
      console.error('❌ Erro: empresaId é null, não foi possível acessar Administração.');
    }
  }}
>
  {/* 🔹 Mantém o texto centralizado e a bolinha no canto */}
  <View style={styles.adminButtonContent}>
    <Text style={styles.buttonText}>Administração</Text>

    {/* 🔹 Exibir a bolinha apenas se houver notificações pendentes */}
    {notificacoesPendentes > 0 && (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationText}>{notificacoesPendentes}</Text>
      </View>
    )}
  </View>
</TouchableOpacity>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  empresaNome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 4,
  },
  empresaId: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#ADD8E6',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#000',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  notificationBadge: {
    backgroundColor: 'red',
    borderRadius: 10, // 🔹 Reduz o tamanho da bolinha
    paddingHorizontal: 6, // 🔹 Ajusta para ser menor
    paddingVertical: 2, // 🔹 Diminui a altura da bolinha
    marginLeft: 10,
    position: 'absolute', // 🔹 Mantém fixa no canto direito
    right: -65, // 🔹 Posição correta dentro do botão
    top: 0, // 🔹 Ajuste fino para centralizar melhor
  },
  notificationText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  adminButton: {
    flexDirection: 'row', // 🔹 Mantém o ícone e o texto alinhados na horizontal
    justifyContent: 'center', // 🔹 Centraliza o texto "Administração"
    alignItems: 'center', // 🔹 Garante alinhamento vertical
    paddingHorizontal: 20,
    height: 52, // 🔹 Define uma altura fixa para evitar mudanças
  },

adminButtonContent: {
  flexDirection: 'row', // 🔹 Permite que o texto e a bolinha fiquem alinhados
  alignItems: 'center', // 🔹 Centraliza verticalmente
},
});

export default HomeScreen;