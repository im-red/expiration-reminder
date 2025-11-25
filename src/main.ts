import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App';
import './styles.css';

async function initCapacitor() {
  try {
    await StatusBar.setStyle({ style: Style.Dark });

    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
    });

    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });

    console.log('Capacitor initialized successfully');
  } catch (error) {
    console.error('Error initializing Capacitor:', error);
  }
}

Keyboard.addListener('keyboardWillShow', info => {
  console.log('keyboard will show with height:', info.keyboardHeight);
});

Keyboard.addListener('keyboardWillHide', () => {
  console.log('keyboard will hide');
});

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
