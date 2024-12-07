import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';

// Definir o tipo da equipe
interface Equipe {
  id: number;
  nomeequipe: string;
  nome1: string;
}

const ListaEquipesScreen = ({ navigation }: any) => {
  const [equipes, setEquipes] = useState<Equipe[]>([]);

   // Função para buscar as equipes do backend
   const fetchEquipes = async () => {
    try {
      const response = await axios.get(`${Config.API_URL}/equipes`); // Ajuste a URL se necessário
      setEquipes(response.data);
    } catch (error) {
      console.error('Erro ao buscar equipes:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de equipes.');
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchEquipes); // Adiciona o listener de foco

    return unsubscribe; // Remove o listener ao desmontar o componente
  }, [navigation]); // Reexecuta apenas quando a navegação mudar

  // Função para renderizar cada equipe
  const renderEquipe = ({ item }: { item: Equipe }) => (
    <View style={styles.equipeItem}>
      <View>
        <Text style={styles.equipeNome}>{item.nomeequipe}</Text>
        <Text style={styles.equipeNome1}>{item.nome1}</Text>
        <Text style={styles.equipeId}>ID: {item.id}</Text>
      </View>
      <TouchableOpacity
        style={styles.detalhesButton}
        onPress={() => navigation.navigate('EditEquipe', { equipeId: item.id })}
      >
        <Text style={styles.buttonText}>Ver Detalhes</Text>
      </TouchableOpacity>
    </View>
  );

  // Componente principal
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Equipes</Text>
      <FlatList
        data={equipes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEquipe}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma equipe encontrada.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D3D3D3',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  equipeItem: {
    backgroundColor: '#FFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderColor: '#CCC',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equipeNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  equipeNome1: {
    fontSize: 16,
    color: '#555',
  },
  equipeId: {
    fontSize: 14,
    color: '#777',
  },
  detalhesButton: {
    backgroundColor: '#ADD8E6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#000',
  },
});

export default ListaEquipesScreen;


