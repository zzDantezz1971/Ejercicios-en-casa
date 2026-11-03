import { registerSW } from 'virtual:pwa-register';
import './styles/app.css';
import { App } from './ui/App';
import { HomeScreen } from './ui/screens/HomeScreen';

const app = new App(document.getElementById('app')!);
app.home(new HomeScreen(app));

// Funciona sin conexión y se actualiza sola cuando hay una versión nueva.
registerSW({ immediate: true });
