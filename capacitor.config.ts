import type { CapacitorConfig } from '@capacitor/cli';

// App Android (Google Play). El nombre que se ve bajo el icono está traducido en
// android/app/src/main/res/values*/strings.xml.
const config: CapacitorConfig = {
  appId: 'cat.ejercicisacasa.app',
  appName: 'Exercicis a casa',
  webDir: 'dist-android',
  backgroundColor: '#0A0D12',
  android: { allowMixedContent: false },
};

export default config;
