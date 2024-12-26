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
import ListasManutencoesScreen from './screens/ListasManutencoesScreen';
import DiasDaSemanaScreen from './screens/DiasDaSemanaScreen';
import PiscinasPorDiaScreen from './screens/PiscinasPorDiaScreen';
import LoginScreen from './screens/LoginScreen';
import AdminHomeScreen from './screens/AdminHomeScreen';
import EquipeHomeScreen from './screens/EquipeHomeScreen';
import EquipesListaManutencoesScreen from './screens/EquipesListaManutencoesScreen';
import EquipesDiasDaSemanaScreen from './screens/EquipesDiasDaSemanaScreen';
import EquipesPiscinasPorDiaScreen from './screens/EquipesPiscinasPorDiaScreen';



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
  ListasManutencoes: undefined;
  DiasDaSemana: { equipeId: number; equipeNome: string }; // Inclui equipeNome para consistência
  PiscinasPorDia: { equipeId: number; diaSemana: string; equipeNome: string };
  Login: undefined;
  AdminHome: undefined;
  EquipeHome: { equipeId: number; equipeNome: string };
  EquipesListaManutencoes: { equipeId: number; equipeNome: string }; // Adiciona os parâmetros
  EquipesDiasDaSemana: { equipeId: number; equipeNome: string }; // Adiciona os parâmetros
  EquipesPiscinasPorDia: { equipeId: number; diaSemana: string; equipeNome: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const App = (): React.JSX.Element => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Login', headerShown: false }}/>
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
        <Stack.Screen 
          name="ListasManutencoes" 
          component={ListasManutencoesScreen} 
          options={{ title: 'Listas de Manutenções' }} />
        <Stack.Screen 
          name="DiasDaSemana" 
          component={DiasDaSemanaScreen} 
          options={{ title: 'Dias da Semana' }} />
        <Stack.Screen 
          name="PiscinasPorDia" 
          component={PiscinasPorDiaScreen} 
          options={{ title: 'Piscinas por Dia' }} />
        <Stack.Screen
          name="AdminHome"
          component={AdminHomeScreen}
          options={{ title: 'Administração' }}/>
        <Stack.Screen
          name="EquipeHome"
          component={EquipeHomeScreen}
          options={{ title: 'Equipe' }}/>
        <Stack.Screen
          name="EquipesListaManutencoes"
          component={EquipesListaManutencoesScreen}
          options={{ title: 'Equipes - Lista de Manutenções' }}/>
        <Stack.Screen
          name="EquipesDiasDaSemana"
          component={EquipesDiasDaSemanaScreen}
          options={{ title: 'Dias da Semana' }}/>
        <Stack.Screen 
          name="EquipesPiscinasPorDia" 
          component={EquipesPiscinasPorDiaScreen} 
          options={{ title: 'Piscinas por Dia' }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;





