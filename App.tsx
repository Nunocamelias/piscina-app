import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
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
import EquipeHomeScreen from './screens/EquipeHomeScreen';
import EquipesListaManutencoesScreen from './screens/EquipesListaManutencoesScreen';
import EquipesDiasDaSemanaScreen from './screens/EquipesDiasDaSemanaScreen';
import EquipesPiscinasPorDiaScreen from './screens/EquipesPiscinasPorDiaScreen';
import AdministracaoScreen from './screens/AdministracaoScreen';
import ParametrosQuimicosScreen from './screens/ParametrosQuimicosScreen';
import FolhaManutencaoScreen from './screens/FolhaManutencaoScreen';
import RegisterCompanyScreen from './screens/RegisterCompanyScreen';
import ReceberNotificacoesScreen from './screens/ReceberNotificacoesScreen';
import InfoCompanyScreen from './screens/InfoCompanyScreen';
import EquipeTecHomeScreen from './screens/EquipeTecHomeScreen';
import OrcamentacaoHomeScreen from './screens/OrcamentacaoHomeScreen';
import ContabilidadeHomeScreen from './screens/ContabilidadeHomeScreen';
import HeaderLogo from './components/HeaderLogo';
import TesteRapidoScreen from './screens/TesteRapidoScreen';



export type RootStackParamList = {
  Login: undefined;
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
  EquipeHome: { equipeId: number; equipeNome: string };
  EquipesListaManutencoes: { equipeId: number; equipeNome: string }; // Adiciona os parâmetros
  EquipesDiasDaSemana: { equipeId: number; equipeNome: string; atualizarProgressoDia?: string; atualizarProgressoStatus?: string }; // Adiciona os parâmetros
  EquipesPiscinasPorDia: { equipeId: number; diaSemana: string; equipeNome: string; atualizarStatusClienteId?: number; atualizarStatusCliente?: string };
  Administracao: undefined; // Define a tela de administração
  ParametrosQuimicos: undefined;
  FolhaManutencao: {
    clienteId: number;
    nome: string;
    morada: string;
    telefone: string;
    info_acesso: string;
    volume: number;
    google_maps: string;
    tanque_compensacao: boolean;
    cobertura: boolean;
    bomba_calor: boolean;
    equipamentos_especiais: boolean;
    ultima_substituicao: string;
    status: string;
    equipeId: number;
    diaSemana: string;
    };
    TesteRapido: {
    // provisório: vamos navegar a partir da FolhaManutencao
    clienteId: number;
    nome: string;
    volume: number;
    // opcional (se quiseres já controlar o modo a partir da Folha)
    // modo?: 'PH_CL' | 'TODOS';
    };
    RegisterCompany: undefined;
    ReceberNotificacoes: undefined;
    InfoCompany: undefined;
    EquipeTecHome: { equipeId: number; equipeNome: string };   // novas equipas técnicas
    OrcamentacaoHome: undefined;
    ContabilidadeHome: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const CustomHeaderTitle = () => <HeaderLogo />;

const App = (): React.JSX.Element => {
  return (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Login', headerShown: false }}
      />

      {/* 🔹 HomeScreen com logo no header */}
      <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
      <Stack.Screen
          name="Clientes"
          component={ClientesScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
      <Stack.Screen
          name="AddCliente"
          component={AddClienteScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
      <Stack.Screen
          name="ListaClientes"
          component={ListaClientesScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="EditCliente"
          component={EditClienteScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="Equipes"
          component={EquipesScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="AddEquipe"
          component={AddEquipeScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="ListaEquipes"
          component={ListaEquipesScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="EditEquipe"
          component={EditEquipeScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="ListasManutencoes"
          component={ListasManutencoesScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="DiasDaSemana"
          component={DiasDaSemanaScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="PiscinasPorDia"
          component={PiscinasPorDiaScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="InfoCompany"
          component={InfoCompanyScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="EquipeHome"
          component={EquipeHomeScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="EquipesListaManutencoes"
          component={EquipesListaManutencoesScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="EquipesDiasDaSemana"
          component={EquipesDiasDaSemanaScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="EquipesPiscinasPorDia"
          component={EquipesPiscinasPorDiaScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="Administracao"
          component={AdministracaoScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="ParametrosQuimicos"
          component={ParametrosQuimicosScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="FolhaManutencao"
          component={FolhaManutencaoScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
        <Stack.Screen
          name="TesteRapido"
          component={TesteRapidoScreen}
          options={{
          headerTitle: CustomHeaderTitle,
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000', }}/>
        <Stack.Screen
          name="RegisterCompany"
          component={RegisterCompanyScreen}
          options={{ title: 'Registar Empresa' }}/>
        <Stack.Screen
          name="ReceberNotificacoes"
          component={ReceberNotificacoesScreen}
          options={{
          headerTitle: CustomHeaderTitle, // ✅ chama a função, não cria inline
          headerStyle: {
          backgroundColor: '#22b4b4ff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4.65,
          elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000' }}/>
                <Stack.Screen
        name="OrcamentacaoHome"
        component={OrcamentacaoHomeScreen}
        options={{
          headerTitle: CustomHeaderTitle,
          headerStyle: {
            backgroundColor: '#22b4b4ff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 4.65,
            elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000',
        }}
      />

      <Stack.Screen
        name="ContabilidadeHome"
        component={ContabilidadeHomeScreen}
        options={{
          headerTitle: CustomHeaderTitle,
          headerStyle: {
            backgroundColor: '#22b4b4ff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 4.65,
            elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000',
        }}
      />

      <Stack.Screen
        name="EquipeTecHome"
        component={EquipeTecHomeScreen}
        options={{
          headerTitle: CustomHeaderTitle,
          headerStyle: {
            backgroundColor: '#22b4b4ff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 4.65,
            elevation: 10,
          },
          headerTitleAlign: 'center',
          headerTintColor: '#000',
        }}
      />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
