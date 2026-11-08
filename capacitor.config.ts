import type { CapacitorConfig } from '@capacitor/cli';

// App Android (Google Play). El nombre que se ve bajo el icono está traducido en
// android/app/src/main/res/values*/strings.xml.
const config: CapacitorConfig = {
  appId: 'cat.ejercicisacasa.app',
  appName: 'Exercicis a casa',
  webDir: 'dist-android',
  backgroundColor: '#0A0D12',
  android: { allowMixedContent: false },
  plugins: {
    // los márgenes de la barra de estado y de los botones de Android los pone MainActivity.java
    // (funciona igual en todas las versiones del WebView)
    SystemBars: { insetsHandling: 'disable', style: 'DARK' },
  },
};

export default config;
