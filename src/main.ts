import { registerSW } from 'virtual:pwa-register';
import './styles/app.css';
import { loadSkin } from './figure/skinAsset';
import { App } from './ui/App';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { TablesScreen } from './ui/screens/TablesScreen';

async function start(): Promise<void> {
  // El cuerpo del maniquí se carga antes de dibujar la primera figura.
  await loadSkin();
  const app = new App(document.getElementById('app')!);
  app.setTabs({
    inicio: () => new HomeScreen(app),
    tablas: () => new TablesScreen(app),
    historial: () => new HistoryScreen(app),
    ajustes: () => new SettingsScreen(app),
  });
  app.openTab('inicio');
}

void start();

// Funciona sin conexión y se actualiza sola cuando hay una versión nueva.
registerSW({ immediate: true });
