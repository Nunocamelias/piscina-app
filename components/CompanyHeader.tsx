import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

type Props = {
  logo?: string | null;
  size?: 'big' | 'small';
};

const CompanyHeader: React.FC<Props> = ({ logo, size = 'big' }) => {
  const dimensions = size === 'big'
    ? { width: 160, height: 120, borderRadius: 25 }
    : { width: 100, height: 75, borderRadius: 15 };

  return (
    <View style={styles.container}>
      {logo && (
        <Image
          source={{ uri: logo }}
          style={[styles.logo, dimensions]}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20, // 🔹 espaço entre logo e botão
  },
  logo: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 5,
  },
});

export default CompanyHeader;








