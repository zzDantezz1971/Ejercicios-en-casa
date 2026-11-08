import { restoreDurable } from './platform/durable';

/* Arranque: en la app Android, primero se recuperan los datos guardados en la propia app
   (antes de que nada lea localStorage, p. ej. el idioma); luego se carga la app. */
void (async () => {
  await restoreDurable();
  await import('./main');
})();
