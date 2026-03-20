import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'de.deudat.dsgvoaudit',
  appName: 'DSGVO-Audit Pro',
  webDir: 'frontend/dist',
  server: {
    // Für lokale Entwicklung: URL des Backends
    // androidScheme: 'https',
    // url: 'http://10.0.2.2:8000',  // Android Emulator
    // cleartext: true,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#92200d',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#92200d',
    },
  },
}

export default config
