import { registerSW } from 'virtual:pwa-register';
import './styles/app.css';
import { App } from './ui/App';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { TablesScreen } from './ui/screens/TablesScreen';

const app = new App(document.getElementById('app')!);
app.setTabs({
  inicio: () => new HomeScreen(app),
  tablas: () => new TablesScreen(app),
  historial: () => new HistoryScreen(app),
  ajustes: () => new SettingsScreen(app),
});
app.openTab('inicio');

// Funciona sin conexión y se actualiza sola cuando hay una versión nueva.
registerSW({ immediate: true });
