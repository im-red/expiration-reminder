import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App';
import './styles.css';

const isNative = Capacitor.isNativePlatform();

async function initCapacitor() {
  if (!isNative) {
    console.info('Running on web, skipping native-only Capacitor setup.');
    return;
  }

  try {
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Dark });
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

  const rootElement = document.getElementById('app');

  if (!rootElement) {
    throw new Error('Unable to find root element with id "app"');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
