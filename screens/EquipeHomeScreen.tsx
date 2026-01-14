import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';


// 👇 solução simples: não tipar a navegação a fundo neste ecrã
type Props = StackScreenProps<any, any>;

const EquipeHomeScreen = ({ navigation, route }: Props) => {
  const { equipeId, equipeNome } = (route?.params || {}) as {
  equipeId: number;
  equipeNome: string;
};

  const [empresaNome, setEmpresaNome] = useState('');

 useEffect(() => {
  const fetchEmpresa = async () => {
    try {
      const cachedNome = await AsyncStorage.getItem('empresa_nome');

      if (cachedNome) {
        setEmpresaNome(cachedNome);
        console.log('⚡ Nome da empresa (equipa) carregado do cache');
      }

      const storedEmpresaid = await AsyncStorage.getItem('empresaid');
      if (storedEmpresaid) {
        const empresaIdNum = parseInt(storedEmpresaid, 10);
        const response = await axios.get(`${Config.API_URL}/empresas/${empresaIdNum}`);

        if (response.data) {
          const { nome } = response.data;
          setEmpresaNome(nome);
          await AsyncStorage.setItem('empresa_nome', nome);
          console.log('💾 Nome da empresa (equipa) atualizado no cache');
        }
      }
    } catch (error) {
      console.log('Falha ao buscar informações da empresa (EquipeHomeScreen):', error);
    }
  };

  fetchEmpresa();
}, []);



  return (
    <View style={styles.container}>

      {/* 🔹 Secção principal */}
   <View style={{ alignItems: 'center', width: '100%', marginTop: 140 }}>
     <Text style={styles.title}>Equipe de Manutenção</Text>
     <Text style={styles.subtitle}>
     ID: {equipeId} | Nome: {equipeNome}
     </Text>


        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('EquipesListaManutencoes', {
              equipeId,
              equipeNome,
            })
          }>
          <Text style={styles.buttonText}>Manutenções - Semanal</Text>
        </TouchableOpacity>
        {/* 🔹 NOVO BOTÃO: Notificações da equipa */}
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
           navigation.navigate('ReceberNotificacoes', {
          filtro: 'equipa',
          equipeId,
         })
      }
>
          <Text
             style={styles.buttonText}
             numberOfLines={1}
             ellipsizeMode="tail"
            >
             As minhas notificações
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🔹 Nome da empresa e "powered by" fixos no fundo */}
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
    textAlign: 'center',
    // 🔹 Sombra igual à dos botões
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  button: {
    backgroundColor: '#22b4b4ff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
    flexShrink: 0,          // ✅ importante
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 10,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  footer: {
    position: 'absolute',
    bottom: 50, // 🔹 afastado do fundo
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

export default EquipeHomeScreen;



