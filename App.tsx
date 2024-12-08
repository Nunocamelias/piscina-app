import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import ClientesScreen from './screens/ClientesScreen';
import AddClienteScreen from './screens/AddClienteScreen';
import ListaClientesScreen from './screens/ListaClientesScreen';
import EditClienteScreen from './screens/EditClienteScreen';
import EquipesScreen from './screens/EquipesScreen';
import AddEquipeScreen from './screens/AddEquipeScreen';
import ListaEquipesScreen from './screens/ListaEquipesScreen';
import EditEquipeScreen from './screens/EditEquipeScreen';



type RootStackParamList = {
  Home: undefined;
  Clientes: undefined;
  AddCliente: undefined;
  ListaClientes: undefined;
  EditCliente: { clienteId: number };
  Equipes: undefined;
  AddEquipe: undefined;
  ListaEquipes: undefined;
  EditEquipe: { equipeId: number };
};

const Stack = createStackNavigator<RootStackParamList>();

const App = (): React.JSX.Element => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'GES-POOL' }}
        />
        <Stack.Screen
          name="Clientes"
          component={ClientesScreen}
          options={{ title: 'Área de Cliente' }}
        />
        <Stack.Screen
          name="AddCliente"
          component={AddClienteScreen}
          options={{ title: 'Adicionar Cliente' }}
        />
        <Stack.Screen
          name="ListaClientes"
          component={ListaClientesScreen}
          options={{ title: 'Lista de Clientes' }}
        />
        <Stack.Screen
          name="EditCliente"
          component={EditClienteScreen}
          options={{ title: 'Detalhes do Cliente' }}
        />
        <Stack.Screen
          name="Equipes"
          component={EquipesScreen}
          options={{ title: 'Área de Equipes' }}
        />
        <Stack.Screen
          name="AddEquipe"
          component={AddEquipeScreen}
          options={{ title: 'Adicionar Equipe' }}
        />
        <Stack.Screen
          name="ListaEquipes"
          component={ListaEquipesScreen}
          options={{ title: 'Lista de Equipes' }}
        />
        <Stack.Screen
          name="EditEquipe"
          component={EditEquipeScreen}
          options={{ title: 'Detalhes da Equipe' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;





