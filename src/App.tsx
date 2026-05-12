import React, { useEffect } from 'react';
import { Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { SplashScreen } from '@capacitor/splash-screen';

import { AppProvider } from './data/AppContext';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import SideMenu from './components/SideMenu';

// Custom styles — AFTER Ionic CSS (imported in main.tsx)
import './theme/variables.css';
import './App.scss';

// Force Material Design mode
setupIonicReact({
  mode: 'md',
});

import { useIonRouter } from '@ionic/react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { BackButtonEvent } from '@ionic/core';

// Component that handles back button - must be inside IonReactRouter
const BackButtonHandler: React.FC = () => {
  const ionRouter = useIonRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = (event: Event) => {
      const backButtonEvent = event as BackButtonEvent;
      backButtonEvent.detail.register(-1, () => {
        if (!ionRouter.canGoBack()) {
          CapacitorApp.exitApp();
        }
      });
    };

    document.addEventListener('ionBackButton', handleBackButton);

    return () => {
      document.removeEventListener('ionBackButton', handleBackButton);
    };
  }, [ionRouter]);

  return null;
};

const App: React.FC = () => {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (err) {
        console.warn('Error hiding splash screen', err);
      }
    };
    hideSplash();
  }, []);

  return (
    <IonApp>
      <AppProvider>
        <IonReactRouter>
          <BackButtonHandler />
          <SideMenu />
          <IonRouterOutlet id="main">
            <Route exact path="/" component={HomePage} />
            <Route exact path="/settings" component={SettingsPage} />
            <Route exact path="/about" component={AboutPage} />
          </IonRouterOutlet>
        </IonReactRouter>
      </AppProvider>
    </IonApp>
  );
};

export default App;