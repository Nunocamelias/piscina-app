import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';


type RootStackParamList = {
  EquipeHome: { equipeId: number; equipeNome: string };
  EquipesListaManutencoes: { equipeId: number; equipeNome: string };
};

type Props = StackScreenProps<RootStackParamList, 'EquipeHome'>;

const EquipeHomeScreen = ({ navigation, route }: Props) => {
  const { equipeId, equipeNome } = route.params;
  const [empresaNome, setEmpresaNome] = useState('');

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const cachedLogo = await AsyncStorage.getItem('empresa_logo');
        const cachedNome = await AsyncStorage.getItem('empresa_nome');

        if (cachedLogo && cachedNome) {
          setEmpresaNome(cachedNome);
          console.log('⚡ Logo e nome carregados do cache');
        }

        const storedEmpresaid = await AsyncStorage.getItem('empresaid');
        if (storedEmpresaid) {
          const empresaIdNum = parseInt(storedEmpresaid, 10);
          const response = await axios.get(`${Config.API_URL}/empresas/${empresaIdNum}`);

          if (response.data) {
            const { nome, logo } = response.data;
            setEmpresaNome(nome);
            await AsyncStorage.setItem('empresa_nome', nome);
            if (logo) {await AsyncStorage.setItem('empresa_logo', logo);}
            console.log('💾 Logo e nome atualizados no cache');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar informações da empresa:', error);
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
      </View>

      {/* 🔹 Nome da empresa e "powered by" fixos no fundo */}
      <View style={styles.footer}>
        <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
        <Text style={styles.subTitle}>powered by GES-POOL</Text>
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
  footer: {
    position: 'absolute',
    bottom: 25, // 🔹 afastado do fundo
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



