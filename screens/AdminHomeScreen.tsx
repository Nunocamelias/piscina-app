import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  AdminHome: undefined;
  AddClienteScreen: undefined;
  GerenciarEquipasScreen: undefined;
};

type AdminHomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AdminHome'
>;

type Props = {
  navigation: AdminHomeScreenNavigationProp;
};

const AdminHomeScreen = ({ navigation }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Administração</Text>
      <Button
        title="Gerenciar Clientes"
        onPress={() => navigation.navigate('AddClienteScreen')}
      />
      <Button
        title="Gerenciar Equipas"
        onPress={() => navigation.navigate('GerenciarEquipasScreen')}
      />
      <Button
        title="Relatórios"
        onPress={() => Alert.alert('Funcionalidade em desenvolvimento!')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default AdminHomeScreen;