import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Appearance, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const isDarkMode = Appearance.getColorScheme() === 'dark';

type Props = {
  navigation: any;
};

const AdministracaoScreen: React.FC<Props> = ({ navigation }) => {
  const [empresaNome, setEmpresaNome] = useState('');


  // 🔹 Carrega logo e nome da empresa
  useEffect(() => {
    const loadData = async () => {
      const cachedNome = await AsyncStorage.getItem('empresa_nome');
      if (cachedNome) {setEmpresaNome(cachedNome);}
    };
    loadData();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>

        {/* 🔹 Secção principal */}
        <View style={styles.mainSection}>
          <Text style={styles.title}>Área de Administração</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('InfoCompany')}>
            <Text style={styles.buttonText}>Informação da Empresa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Faturas')}>
            <Text style={styles.buttonText}>Faturas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ParametrosQuimicos')}>
            <Text style={styles.buttonText}>Parâmetros Químicos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ReceberNotificacoes')}>
            <Text style={styles.buttonText}>Notificações</Text>
          </TouchableOpacity>
        </View>

        {/* 🔹 Rodapé com nome e powered by */}
        <View style={styles.footer}>
          <Text style={styles.empresaNome}>{empresaNome || 'Empresa'}</Text>
          <Text style={styles.subTitle}>powered by GES-POOL</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    paddingVertical: 20,
    paddingBottom: 80, // 🔹 garante espaço entre os botões e o rodapé
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  mainSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: 60, // 🔹 controla a distância entre o logo e os botões
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 70,
    marginTop: 60,
    color: '#000',
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
  alignItems: 'center',
  marginTop: 170, // 🔹 desce o nome da empresa (ajusta se quiseres mais/menos)
  marginBottom: 20, // 🔹 garante distância extra do fundo do ecrã
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

export default AdministracaoScreen;

