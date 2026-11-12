import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import './styles/app.css';
import { App } from './ui/App';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { MedalsScreen } from './ui/screens/MedalsScreen';
import { ProfileScreen } from './ui/screens/ProfileScreen';
import { TablesScreen } from './ui/screens/TablesScreen';
import { WelcomeScreen } from './ui/screens/WelcomeScreen';
import { PaywallScreen } from './ui/screens/PaywallScreen';
import { firstRunOfNewVersion, initUpdates, onUpdateReady } from './services/Updates';
import { showUpdateDialog } from './ui/components/updateDialog';
import { h } from './ui/dom';
import { startTranslating } from './i18n';

async function start(): Promise<void> {
  const app = new App(document.getElementById('app')!);
  // app de Google Play: suscripción o código (con un límite de tiempo por si Google Play no responde)
  await Promise.race([app.access.init(), new Promise((r) => setTimeout(r, 8000))]);
  app.setPaywall(() => new PaywallScreen(app));
  app.setTabs({
    inicio: () => new HomeScreen(app),
    tablas: () => new TablesScreen(app),
    medallas: () => new MedalsScreen(app),
    historial: () => new HistoryScreen(app),
    datos: () => new ProfileScreen(app),
    ajustes: () => new SettingsScreen(app),
  });
  // primera vez: idioma y datos personales
  if (!app.store.welcomed) app.home(new WelcomeScreen(app));
  else app.openTab('inicio');
  // App Android actualizada desde Google Play: se enseña qué ha cambiado
  if (firstRunOfNewVersion()) void showUpdateDialog();
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
    h('button', { class: 'btn primary small', onclick: () => void showUpdateDialog() }, 'Ver novedades'),
    h('button', { class: 'icon-btn small', 'aria-label': 'Más tarde', onclick: () => banner.remove() }, '✕'));
  document.body.append(banner);
});
