import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from 'react-native-config';

const HeaderLogo: React.FC = () => {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const loadLogoFromApi = async () => {
      try {
        // Buscar o ID da empresa guardado no login
        const storedEmpresaid = await AsyncStorage.getItem('empresaid');
        if (!storedEmpresaid) {
          console.log('Sem empresaid — não posso buscar o logo.');
          return;
        }

        const empresaIdNum = parseInt(storedEmpresaid, 10);

        // Chamada ao backend (buscar logo direto do servidor)
        const response = await axios.get(`${Config.API_URL}/empresas/${empresaIdNum}`);

        if (response.data && response.data.logo) {
          setLogo(response.data.logo);
        } else {
          console.log('Empresa sem logo definido.');
        }
      } catch (error) {
        console.log('Erro ao carregar logo no Header:', error);
      }
    };

    loadLogoFromApi();
  }, []);

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



