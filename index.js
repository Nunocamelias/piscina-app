/**
 * @format
 */
import { AppRegistry } from 'react-native';
import App from './App'; // Certifique-se de que o arquivo App.js está na raiz do projeto.
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
