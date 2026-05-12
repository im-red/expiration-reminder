import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';

// Ionic CSS — MUST come before any custom styles
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';

import App from './App';

const isNative = Capacitor.isNativePlatform();

async function initCapacitor() {
  if (!isNative) {
    console.info('Running on web, skipping native-only Capacitor setup.');
    return;
  }

  try {
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#3880ff' });
    }

    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
    });

    console.log('Capacitor initialized successfully');
  } catch (error) {
    console.error('Error initializing Capacitor:', error);
  }
}

if (Capacitor.isPluginAvailable('Keyboard')) {
  Keyboard.addListener('keyboardWillShow', info => {
    console.log('keyboard will show with height:', info.keyboardHeight);
  });

  Keyboard.addListener('keyboardWillHide', () => {
    console.log('keyboard will hide');
  });
}

async function bootstrap() {
  await initCapacitor();

  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Unable to find root element with id "root"');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();