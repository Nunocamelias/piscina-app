import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HeaderLogo = () => {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const storedLogo = await AsyncStorage.getItem('empresa_logo'); // 🔹 vem da coluna "logo"
        if (storedLogo) {setLogo(storedLogo);}
      } catch (error) {
        console.error('Erro ao carregar o logo do header:', error);
      }
    };
    loadLogo();
  }, []);

  if (!logo) {return null;} // Evita falhas se ainda não carregou

  return (
    <Image
      source={{ uri: logo }}
      style={{ width: 150, height: 50, resizeMode: 'contain' }}
    />
  );
};

export default HeaderLogo;

