import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, Platform, } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ImageViewing from 'react-native-image-viewing';
import * as DocumentPicker from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import Config from 'react-native-config';

import { RootStackParamList } from '../App';

type ValvulasFotosRouteProp = RouteProp<
  RootStackParamList,
  'ValvulasFotos'
>;

type ValvulasFotosNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ValvulasFotos'
>;

type Props = {
  route: ValvulasFotosRouteProp;
  navigation: ValvulasFotosNavigationProp;
};

type FotoValvula = {
  id: number;
  ordem: number;
  url: string;
};

const ValvulasFotosScreen: React.FC<Props> = ({
  route,
}) => {
  const {
  clienteId,
  empresaid,
  nome = 'Cliente',
  modoConsulta = false,
} = route.params;

  const [fotos, setFotos] = useState<FotoValvula[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingOrdem, setUploadingOrdem] =
    useState<number | null>(null);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  

  // ============================================================
  // OBTER API URL
  // ============================================================


  // ============================================================
  // CARREGAR FOTOGRAFIAS
  // ============================================================

  const carregarFotos = useCallback(async () => {
    if (!Config.API_URL) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${Config.API_URL}/clientes/${clienteId}/valvulas-fotos?empresaid=${empresaid}`
      );

      if (!response.ok) {
        throw new Error(
          'Não foi possível carregar as fotografias.'
        );
      }

      const data = await response.json();

      setFotos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        'Erro ao carregar fotografias das válvulas:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível carregar as fotografias das válvulas.'
      );
    } finally {
      setLoading(false);
    }
  }, [Config.API_URL, clienteId, empresaid]);

  useFocusEffect(
    useCallback(() => {
      if (Config.API_URL) {
        carregarFotos();
      }
    }, [Config.API_URL, carregarFotos])
  );

  // ============================================================
  // ESCOLHER E ENVIAR FOTOGRAFIA
  // ============================================================

  const escolherFoto = async (ordem: number) => {
  try {
    const res = await DocumentPicker.pick({
      type: [DocumentPicker.types.images],
      allowMultiSelection: false,
    });

    const file = Array.isArray(res) ? res[0] : res;

    if (!file || !file.uri) {
      throw new Error(
        'A fotografia selecionada não contém URI.'
      );
    }

    let finalUri = file.uri;

    // Android: converter content:// para ficheiro temporário
    if (
      Platform.OS === 'android' &&
      finalUri.startsWith('content://')
    ) {
      const extensao =
        file.type === 'image/png' ? 'png' : 'jpg';

      const filePath =
        `${RNFS.CachesDirectoryPath}/` +
        `valvula_${Date.now()}.${extensao}`;

      await RNFS.copyFile(finalUri, filePath);

      finalUri = `file://${filePath}`;
    }

    const mimeType =
      file.type === 'image/png'
        ? 'image/png'
        : 'image/jpeg';

    setUploadingOrdem(ordem);

    const base64Data = await RNFS.readFile(
      finalUri,
      'base64'
    );

    const response = await fetch(
      `${Config.API_URL}/clientes/${clienteId}/valvulas-fotos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresaid,
          ordem,
          imagem_base64: base64Data,
          mime_type: mimeType,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          'Não foi possível guardar a fotografia.'
      );
    }

    Alert.alert(
      'Sucesso',
      `Foto ${ordem} guardada com sucesso.`
    );

    await carregarFotos();

  } catch (err: any) {
    console.log(
      'Erro ao selecionar/enviar fotografia:',
      err
    );

    if (
      err?.code === 'DOCUMENT_PICKER_CANCELED'
    ) {
      return;
    }

    Alert.alert(
      'Erro',
      err?.message ||
        'Não foi possível guardar a fotografia.'
    );

  } finally {
    setUploadingOrdem(null);
  }
};

  // ============================================================
  // APAGAR FOTOGRAFIA
  // ============================================================

  const confirmarApagarFoto = (
    foto: FotoValvula
  ) => {
    Alert.alert(
      'Apagar fotografia',
      `Tem a certeza de que pretende apagar a Foto ${foto.ordem}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => apagarFoto(foto),
        },
      ]
    );
  };

  const apagarFoto = async (
    foto: FotoValvula
  ) => {
    try {
      setUploadingOrdem(foto.ordem);

      const response = await fetch(
        `${Config.API_URL}/clientes/${clienteId}/valvulas-fotos/${foto.id}?empresaid=${empresaid}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Não foi possível apagar a fotografia.'
        );
      }

      Alert.alert(
        'Sucesso',
        `Foto ${foto.ordem} apagada com sucesso.`
      );

      await carregarFotos();
    } catch (error: any) {
      console.error(
        'Erro ao apagar fotografia:',
        error
      );

      Alert.alert(
        'Erro',
        error?.message ||
          'Não foi possível apagar a fotografia.'
      );
    } finally {
      setUploadingOrdem(null);
    }
  };

  // ============================================================
  // ABRIR GALERIA
  // ============================================================

  const abrirFoto = (
    foto: FotoValvula
  ) => {
    const fotosOrdenadas = [...fotos].sort(
      (a, b) => a.ordem - b.ordem
    );

    const index = fotosOrdenadas.findIndex(
      (item) => item.id === foto.id
    );

    setViewerIndex(
      index >= 0 ? index : 0
    );

    setViewerVisible(true);
  };

  const fotosOrdenadas = [...fotos].sort(
    (a, b) => a.ordem - b.ordem
  );

  const imagensViewer =
    fotosOrdenadas.map((foto) => ({
      uri: foto.url,
    }));

  // ============================================================
  // CARTÃO DE CADA FOTOGRAFIA
  // ============================================================

  const renderFoto = (ordem: number) => {
    const foto = fotos.find(
      (item) => item.ordem === ordem
    );

    const uploading =
      uploadingOrdem === ordem;

    return (
      <View
        key={ordem}
        style={styles.fotoCard}
      >
        <Text style={styles.fotoTitulo}>
          Foto {ordem}
        </Text>

        {uploading ? (
          <View style={styles.fotoPlaceholder}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              A processar...
            </Text>
          </View>
        ) : foto ? (
          <>
            <TouchableOpacity
              onPress={() => abrirFoto(foto)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: foto.url }}
                style={styles.foto}
                resizeMode="cover"
              />
            </TouchableOpacity>

            <View style={styles.botoesFoto}>
                {!modoConsulta && (
              <TouchableOpacity
                style={styles.botaoSecundario}
                onPress={() =>
                  escolherFoto(ordem)
                }
              >
                <Text
                  style={
                    styles.botaoSecundarioTexto
                  }
                >
                  Substituir
                </Text>
              </TouchableOpacity>
              )}
              {!modoConsulta && (
              <TouchableOpacity
                style={styles.botaoApagar}
                onPress={() =>
                  confirmarApagarFoto(foto)
                }
              >
                <Text
                  style={styles.botaoApagarTexto}
                >
                  Apagar
                </Text>
              </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.fotoPlaceholder}>
              <Text
                style={styles.placeholderTexto}
              >
                Sem fotografia
              </Text>
            </View>
            
            {!modoConsulta && (
            <TouchableOpacity
              style={styles.botaoAdicionar}
              onPress={() =>
                escolherFoto(ordem)
              }
            >
              <Text
                style={styles.botaoAdicionarTexto}
              >
                Adicionar Foto
              </Text>
            </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  // ============================================================
  // ECRÃ
  // ============================================================

  if (!Config.API_URL || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          A carregar fotografias...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <Text style={styles.titulo}>
          Posição das Válvulas
        </Text>

        <Text style={styles.clienteNome}>
          {nome}
        </Text>

        <Text style={styles.descricao}>
          Fotografias de referência para a posição final das válvulas.
        </Text>

        <View style={styles.fotosContainer}>
          {[1, 2, 3].map(renderFoto)}
        </View>
      </ScrollView>

      <ImageViewing
        images={imagensViewer}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() =>
          setViewerVisible(false)
        }
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
    marginTop: 8,
  },

  clienteNome: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
    marginTop: 6,
  },

  descricao: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555555',
    marginTop: 8,
    marginBottom: 20,
  },

  fotosContainer: {
    gap: 16,
  },

  fotoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 15,
    padding: 12,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  fotoTitulo: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },

  foto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#D3D3D3',
  },

  fotoPlaceholder: {
    height: 180,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderTexto: {
    color: '#777777',
    fontSize: 15,
  },

  botoesFoto: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  botaoAdicionar: {
    backgroundColor: '#ADD8E6',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },

  botaoAdicionarTexto: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 15,
  },

  botaoSecundario: {
    flex: 1,
    backgroundColor: '#ADD8E6',
    borderRadius: 25,
    paddingVertical: 11,
    alignItems: 'center',
  },

  botaoSecundarioTexto: {
    color: '#000000',
    fontWeight: 'bold',
  },

  botaoApagar: {
    flex: 1,
    backgroundColor: '#FFB3B3',
    borderRadius: 25,
    paddingVertical: 11,
    alignItems: 'center',
  },

  botaoApagarTexto: {
    color: '#000000',
    fontWeight: 'bold',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#555555',
  },
});

export default ValvulasFotosScreen;