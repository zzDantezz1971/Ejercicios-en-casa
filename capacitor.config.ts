import type { CapacitorConfig } from '@capacitor/cli';

// App Android (Google Play). El nombre que se ve bajo el icono está traducido en
// android/app/src/main/res/values*/strings.xml.
const config: CapacitorConfig = {
  appId: 'cat.exercicisacasa.app',
  appName: 'Kasa Fit',
  webDir: 'dist-android',
  backgroundColor: '#0A0D12',
  android: { allowMixedContent: false },
  plugins: {
    // los márgenes de la barra de estado y de los botones de Android los pone MainActivity.java
    // (funciona igual en todas las versiones del WebView)
    SystemBars: { insetsHandling: 'disable', style: 'DARK' },
    // icono blanco de la barra de notificaciones (android/app/src/main/res/drawable/ic_stat_kasa.xml)
    LocalNotifications: { smallIcon: 'ic_stat_kasa', iconColor: '#3D6BFF' },
  },
};

export default config;
