import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from 'react-native-config';

const HeaderLogo: React.FC = () => {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        // 1️⃣ Buscar o ID da empresa guardado no login
        const storedEmpresaid = await AsyncStorage.getItem('empresaid');
        if (!storedEmpresaid) {
          console.warn('Empresaid não encontrado no AsyncStorage');
          return;
        }

        // 2️⃣ Pedir os dados da empresa ao backend
        const response = await axios.get(
          `${Config.API_URL}/empresas/${storedEmpresaid}`
        );

        if (response.status === 200 && response.data) {
          const logoFromApi = response.data.logo || null;
          setLogo(logoFromApi);
        } else {
          console.warn('Nenhum dado de empresa recebido ao carregar o logo');
        }
      } catch (error) {
        console.error('Erro ao carregar o logo do header:', error);
      }
    };

    loadLogo();
  }, []);

  // Se ainda não há logo, não mostra nada (evita erros de renderização)
  if (!logo) return null;

  return (
    <Image
      source={{ uri: logo }}
      style={{
        width: 150,
        height: 50,
        resizeMode: 'contain',
      }}
    />
  );
};

export default HeaderLogo;


