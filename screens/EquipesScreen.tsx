import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const isDarkMode = Appearance.getColorScheme() === 'dark';

const EquipesScreen = ({ navigation }: any) => {
const [empresaNome, setEmpresaNome] = useState('');

  // 🔹 Carrega logo e nome da empresa do cache
  useEffect(() => {
    const loadData = async () => {
      const cachedNome = await AsyncStorage.getItem('empresa_nome');
      if (cachedNome) {setEmpresaNome(cachedNome);}
    };
    loadData();
  }, []);

  return (
      <View style={styles.container}>
          {/* 🔹 Secção dos botões — centralizada */}
      <View style={{ marginTop: 100, alignItems: 'center', width: '100%' }} />

      {/* 🔹 Secção principal */}
      <View style={styles.mainSection}>
        <Text style={styles.title}>Área de Equipas</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AddEquipe')}>
          <Text style={styles.buttonText}>Adicionar Equipa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ListaEquipes')}>
          <Text style={styles.buttonText}>Lista de Equipas</Text>
        </TouchableOpacity>
      </View>

      {/* 🔹 Rodapé com nome e powered by */}
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
    backgroundColor: isDarkMode ? '#D3D3D3' : '#D3D3D3',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  mainSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: 120, // 🔹 controla a distância entre o logo e os botões
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

export default EquipesScreen;
