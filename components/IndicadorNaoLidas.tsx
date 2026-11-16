import React from 'react';
import { Text, View } from 'react-native';
import { useNaoLidasMensagens } from '../services/ContextoNaoLidas';

// Badge discreto, alimentado pela monitorização comum da app.
const IndicadorNaoLidas = () => {
  const total = useNaoLidasMensagens();
  if (total <= 0) return null;
  return (
    <View
      accessibilityLabel={total + ' mensagens por ler'}
      style={{
        marginLeft: 10, backgroundColor: '#A91B1B', minWidth: 24,
        borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
        {total > 99 ? '99+' : total}
      </Text>
    </View>
  );
};

export default IndicadorNaoLidas;
