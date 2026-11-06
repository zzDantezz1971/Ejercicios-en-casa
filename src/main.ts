import './styles/app.css';
import { loadSkin } from './figure/skinAsset';
import { App } from './ui/App';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { TablesScreen } from './ui/screens/TablesScreen';
import { applyUpdate, initUpdates, onUpdateReady } from './services/Updates';
import { h } from './ui/dom';
import { startTranslating } from './i18n';

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

startTranslating();
void start();

// Funciona sin conexión. Cuando hay una versión nueva, un aviso permite aplicarla con un toque
// (no aparece durante un entrenamiento).
initUpdates();
onUpdateReady(() => {
  if (document.querySelector('.update-banner')) return;
  const banner = h('div', { class: 'update-banner', role: 'status' },
    h('span', {}, 'Nueva versión disponible'),
    h('button', { class: 'btn primary small', onclick: () => void applyUpdate() }, 'Actualizar'),
    h('button', { class: 'icon-btn small', 'aria-label': 'Más tarde', onclick: () => banner.remove() }, '✕'));
  document.body.append(banner);
});
