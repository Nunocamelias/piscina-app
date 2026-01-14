import React, { useEffect, useState } from 'react';
import {  View, Text, TextInput, TouchableOpacity, Image, Alert, StyleSheet, Appearance, Platform, } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import * as DocumentPicker from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Login: undefined;
  InfoCompany: undefined;
};

type InfoCompanyNavigationProp = StackNavigationProp<RootStackParamList, 'InfoCompany'>;

type Props = {
  navigation: InfoCompanyNavigationProp;
};

const isDarkMode = Appearance.getColorScheme() === 'dark';

const InfoCompanyScreen = ({ navigation }: Props) => {
  const [empresa, setEmpresa] = useState({
  id: null,
  nome: '',
  email: '',
  telefone: '',
  endereco: '',
  nif: '',
  logo: null as string | null,
});

  const [isEditing, setIsEditing] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoAnterior, setLogoAnterior] = useState<string | null>(null);
  


useEffect(() => {
  const fetchEmpresa = async () => {
    try {
      const storedEmpresaid = await AsyncStorage.getItem('empresaid');

      if (!storedEmpresaid) {
        Alert.alert(
          'Erro',
          'Empresaid não encontrado. Faça login novamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' as keyof RootStackParamList }],
                });
              },
            },
          ]
        );
        return;
      }

      const empresaIdNum = parseInt(storedEmpresaid, 10);
      const endpoint = `${Config.API_URL}/empresas/${empresaIdNum}`;

      console.log('📦 Empresa ID recuperado:', empresaIdNum);
      console.log('🔗 Endpoint a chamar:', endpoint);

      const response = await axios.get(endpoint);

      if (response.status === 200 && response.data) {
        console.log('🏢 Empresa recebida:', {
              id: response.data.id,
              nome: response.data.nome,
              email: response.data.email,
              telefone: response.data.telefone,
              endereco: response.data.endereco,
              nif: response.data.nif,
              logo: response.data.logo ? '[BASE64]' : null,
             });

        setLogo(response.data.logo || null);
      } else {
        console.warn('⚠️ Nenhum dado recebido para esta empresa.');
        Alert.alert('Aviso', 'Não foram encontrados dados da empresa.');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados da empresa:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da empresa.');
    }
  };

  fetchEmpresa();
}, [navigation]);



  const handleSelecionarLogo = async () => {
  try {
    const res = await DocumentPicker.pick({
      type: [DocumentPicker.types.images],
      allowMultiSelection: false,
    });

    const file = Array.isArray(res) ? res[0] : res;
    if (!file?.uri) return;

    // 🔹 guarda já o logo atual (antes de mudar)
    const prevLogo = logo;

    let finalUri = file.uri;

    if (Platform.OS === 'android' && finalUri.startsWith('content://')) {
      const filePath = `${RNFS.CachesDirectoryPath}/logo_${Date.now()}`;
      await RNFS.copyFile(finalUri, filePath);
      finalUri = `file://${filePath}`;
    }

    const base64Data = await RNFS.readFile(finalUri, 'base64');
    const mimeType = file.type || 'image/jpeg';
    const base64Uri = `data:${mimeType};base64,${base64Data}`;

    // ✅ preview imediato
    setLogo(base64Uri);

    Alert.alert('Confirmar alteração', 'Pretende atualizar o logotipo da empresa?', [
      {
        text: 'Cancelar',
        style: 'cancel',
        onPress: () => {
          // ✅ rollback correto
          setLogo(prevLogo);
        },
      },
      {
        text: 'Confirmar',
        onPress: async () => {
          if (!empresa) {
            setLogo(prevLogo);
            return;
          }

          const updatedData = { ...empresa, logo: base64Uri };

          try {
            const response = await axios.put(
              `${Config.API_URL}/empresas/${empresa.id}/update`,
              updatedData
            );

            if (response.status === 200) {
              setEmpresa(updatedData);
              Alert.alert('Sucesso', 'Logotipo atualizado com sucesso.');
            } else {
              throw new Error('Erro ao atualizar logo');
            }
          } catch (err) {
            console.error('Erro ao gravar logo:', err);
            Alert.alert('Erro', 'Não foi possível atualizar o logotipo.');
            // ✅ rollback se falhar o PUT
            setLogo(prevLogo);
          }
        },
      },
    ]);
  } catch (err: any) {
    if ((DocumentPicker as any).isCancel?.(err)) return;

    console.error('Erro ao selecionar logo:', err);
    Alert.alert('Erro', 'Não foi possível selecionar o logo.');
  }
};

  const handleSave = async () => {
    try {
      if (!empresa) {return;}

      const updatedData = { ...empresa, logo };

      const response = await axios.put(`${Config.API_URL}/empresas/${empresa.id}/update`, updatedData);
      if (response.status === 200) {
        Alert.alert('Sucesso', 'Informações atualizadas com sucesso!');
        setIsEditing(false);
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar as informações.');
      }
    } catch (error) {
      console.error('Erro ao atualizar informações:', error);
      Alert.alert('Erro', 'Falha ao atualizar informações da empresa.');
    }
  };

  if (!empresa) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>A carregar informações...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Informação da Empresa</Text>

      {logo ? (
        <Image source={{ uri: logo }} style={styles.logoPreview} />
      ) : (
        <Text style={styles.noLogo}>Sem logo definido</Text>
      )}

      <TouchableOpacity style={styles.attachButton} onPress={handleSelecionarLogo}>
        <Text style={styles.attachButtonText}>📸 {logo ? 'Alterar Logo' : 'Adicionar Logo'}</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={empresa.nome}
        editable={isEditing}
        onChangeText={(text) => setEmpresa({ ...empresa, nome: text })}
        placeholder="Nome da Empresa"
      />

      <TextInput
        style={styles.input}
        value={empresa.email}
        editable={isEditing}
        onChangeText={(text) => setEmpresa({ ...empresa, email: text })}
        placeholder="Email"
      />

      <TextInput
        style={styles.input}
        value={empresa.telefone}
        editable={isEditing}
        onChangeText={(text) => setEmpresa({ ...empresa, telefone: text })}
        placeholder="Telefone"
      />

      <TextInput
        style={styles.input}
        value={empresa.endereco}
        editable={isEditing}
        onChangeText={(text) => setEmpresa({ ...empresa, endereco: text })}
        placeholder="Endereço"
      />

      <TextInput
        style={styles.input}
        value={empresa.nif || ''}
        editable={isEditing}
        onChangeText={(text) => setEmpresa({ ...empresa, nif: text })}
        placeholder="NIF"
      />

      <TouchableOpacity
        style={[styles.button, isEditing && { backgroundColor: '#CCFFCC' }]}
        onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
      >
        <Text style={styles.buttonText}>{isEditing ? 'Guardar Alterações' : 'Editar'}</Text>
      </TouchableOpacity>
      {/* 🔹 Footer fixo */}
      <View style={styles.footer}>
        <Text style={styles.empresaNome}>
        {empresa?.nome || 'Empresa'}
        </Text>
      <Text style={styles.subTitle}>powered by GESPOOL</Text>
    </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: isDarkMode ? '#B0B0B0' : '#D3D3D3',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.25)', // 👈 opacidade aqui
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  noLogo: {
    color: '#333',
    marginBottom: 10,
  },
  attachButton: {
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
  attachButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#FFF',        // fundo branco
    borderRadius: 10,
    width: '90%',
    padding: 10,
    marginBottom: 15,
    // 🔹 Sombra 3D leve e elegante (igual aos botões)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,   // 🔹 profundidade Android
    // 🔹 Remove o contorno
    borderWidth: 0,
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
  loadingText: {
    fontSize: 16,
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

export default InfoCompanyScreen;
