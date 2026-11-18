import React from 'react';
import { NavigationContainer, createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { View, Text, TouchableOpacity } from 'react-native';
import VigiarMensagensEmPrimeiroPlano from './components/VigiarMensagensEmPrimeiroPlano';
import { FornecedorNaoLidas, useNaoLidasMensagens } from './services/ContextoNaoLidas';
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
import MensagensInternasScreen from './screens/MensagensInternasScreen';
import InfoCompanyScreen from './screens/InfoCompanyScreen';
import EquipeTecHomeScreen from './screens/EquipeTecHomeScreen';
import OrcamentacaoHomeScreen from './screens/OrcamentacaoHomeScreen';
import ContabilidadeHomeScreen from './screens/ContabilidadeHomeScreen';
import HeaderLogo from './components/HeaderLogo';
import TesteRapidoScreen from './screens/TesteRapidoScreen';
import ContaCorrenteClientesScreen from './screens/ContaCorrenteClientesScreen';
import ModelosComunicacaoScreen from './screens/ModelosComunicacaoScreen';
import ValvulasFotosScreen from './screens/ValvulasFotosScreen';



export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Clientes: undefined;
  AddCliente: undefined;
  ListaClientes: undefined;
  EditCliente: { clienteId: number };
  ValvulasFotos: { clienteId: number; empresaid: number; nome?: string; modoConsulta?: boolean; };
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
  EquipesPiscinasPorDia: { empresaid: number; equipeId: number; diaSemana: string; equipeNome: string; atualizarStatusClienteId?: number; atualizarStatusCliente?: string };
  Administracao: undefined; // Define a tela de administração
  ModelosComunicacao: undefined;
  ParametrosQuimicos: undefined;
  FolhaManutencao: {
    empresaid: number;

    clienteId: number;
    nome: string;
    morada: string;
    telefone: string;
    info_acesso: string;
    google_maps: string;

    volume: number;    
    tanque_compensacao: boolean;
    cobertura: boolean;
    bomba_calor: boolean;
    equipamentos_especiais: boolean;
    eletrolise_sal: boolean;
    tem_orp: boolean;
    ultima_substituicao: string;
    status: string;

    equipeId: number;
    diaSemana: string;
    equipeNome: string;
    // ✅ NOVO: valores vindos do Teste Rápido
    testeRapido?: Partial<{
      dureza: number | null;
      cloro_total: number | null;
      cloro_livre: number | null;
      ph: number | null;
      alcalinidade: number | null;
      cya: number | null;
      sal: number | null;
    }>;
  };
    TesteRapido: {
    folhaParams: RootStackParamList['FolhaManutencao'];
    modoTratamento: 'sal' | 'cloro';
    };
    RegisterCompany: undefined;
    ReceberNotificacoes: undefined;
    MensagensInternas: { conversaId?: string | number } | undefined;
    InfoCompany: undefined;
    EquipeTecHome: { equipeId: number; equipeNome: string };   // novas equipas técnicas
    OrcamentacaoHome: undefined;
    ContabilidadeHome: undefined;
    ContaCorrenteClientes: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const CustomHeaderTitle = () => <HeaderLogo />;

// Push conserva o ecrã de origem (por exemplo uma folha ainda em edição).
const abrirCaixaMensagens = () => {
  if (!navigationRef.isReady()) return;
  const rota = navigationRef.getCurrentRoute()?.name;
  if (!rota || rota === 'Login' || rota === 'MensagensInternas') return;
  navigationRef.dispatch(StackActions.push('MensagensInternas'));
};

// Indicador persistente: não depende de apanhar o aviso temporário.
const CabecalhoMensagens = () => {
  const total = useNaoLidasMensagens();
  if (total <= 0) return null;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={total + ' mensagens internas por ler. Abrir mensagens'}
      onPress={abrirCaixaMensagens}
      style={{ minWidth: 52, minHeight: 44, marginRight: 8, justifyContent: 'center', alignItems: 'center' }}
    >
      <Text style={{ fontSize: 27, color: '#000000', lineHeight: 34 }}>✉</Text>
      <View style={{ position: 'absolute', right: 0, top: 0, minWidth: 20,
        paddingHorizontal: 4, paddingVertical: 2, borderRadius: 12,
        backgroundColor: '#A91B1B', alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{total > 99 ? '99+' : total}</Text>
      </View>
    </TouchableOpacity>
  );
};

const App = (): React.JSX.Element => {
  const [rotaAtual, setRotaAtual] = React.useState<string>('Login');
  const [naoLidas, setNaoLidas] = React.useState(0);
  const [avisoNovo, setAvisoNovo] = React.useState(false);

  React.useEffect(() => {
    if (!avisoNovo) return undefined;
    const temporizador = setTimeout(() => setAvisoNovo(false), 8000);
    return () => clearTimeout(temporizador);
  }, [avisoNovo]);

  const aoChegarNova = React.useCallback(() => {
    if (navigationRef.isReady() &&
        navigationRef.getCurrentRoute()?.name !== 'MensagensInternas') {
      setAvisoNovo(true);
    }
  }, []);

  const abrirMensagens = () => {
    setAvisoNovo(false);
    abrirCaixaMensagens();
  };

  const atualizarRota = () => {
    const atual = navigationRef.getCurrentRoute()?.name || 'Login';
    setRotaAtual(atual);
    if (atual === 'MensagensInternas' || atual === 'Login') setAvisoNovo(false);
  };

  return (
    <FornecedorNaoLidas value={naoLidas}>
      <View style={{ flex: 1 }}>
        <NavigationContainer
          ref={navigationRef}
          onReady={atualizarRota}
          onStateChange={atualizarRota}
        >
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={({ route }) => ({
        headerRight: route.name === 'Login' || route.name === 'MensagensInternas'
          ? undefined : CabecalhoMensagens,
      })}
    >
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
        <Stack.Screen
          name="ValvulasFotos"
          component={ValvulasFotosScreen}
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
        <Stack.Screen
          name="ModelosComunicacao"
          component={ModelosComunicacaoScreen}
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
        <Stack.Screen
          name="MensagensInternas"
          component={MensagensInternasScreen}
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
          }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
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
          headerTintColor: '#000', }}/>
        <Stack.Screen
          name="ContaCorrenteClientes"
          component={ContaCorrenteClientesScreen}
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

      </Stack.Navigator>
        </NavigationContainer>
        <VigiarMensagensEmPrimeiroPlano
          ativado={rotaAtual !== 'Login'}
          aoAtualizar={setNaoLidas}
          aoChegarNova={aoChegarNova}
        />
        {avisoNovo && rotaAtual !== 'Login' && rotaAtual !== 'MensagensInternas' && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Abrir novas mensagens internas"
            onPress={abrirMensagens}
            style={{
              position: 'absolute', top: 62, left: 14, right: 14,
              backgroundColor: '#ADD8E6', borderRadius: 16,
              paddingVertical: 14, paddingHorizontal: 18,
              borderWidth: 1, borderColor: '#333333', elevation: 16,
            }}
          >
            <Text style={{ color: '#000000', fontWeight: '700', textAlign: 'center' }}>
              Nova mensagem interna · {naoLidas} por ler
            </Text>
            <Text style={{ color: '#333333', textAlign: 'center', fontSize: 12 }}>
              Toca aqui para abrir as conversas
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </FornecedorNaoLidas>
  );
};

export default App;
