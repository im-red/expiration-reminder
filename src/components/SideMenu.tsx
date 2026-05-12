import React, { useRef } from 'react';
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonMenuToggle,
  IonFooter,
} from '@ionic/react';
import { settingsOutline, informationCircleOutline, downloadOutline, logInOutline } from 'ionicons/icons';
import useAppVersion from '../hooks/useAppVersion';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { useApp } from '../data/AppContext';

const SideMenu: React.FC = () => {
  const { fullString: versionString } = useAppVersion();
  const { reminders, replaceReminders } = useApp();
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportReminders = async () => {
    const dataStr = JSON.stringify(reminders, null, 2);

    const generateFileName = (): string => {
      const now = new Date();
      const dateString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      return `expiration-reminders_${dateString}.json`;
    };

    const fileName = generateFileName();

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        alert(`Reminders exported to Documents/${fileName}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert('Failed to export reminders: ' + message);
      }
    } else {
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportReminders = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          replaceReminders(imported);
          alert('Reminders imported successfully!');
        } else {
          alert('Invalid file format.');
        }
      } catch (err) {
        alert('Failed to import reminders.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <IonMenu contentId="main" menuId="side-menu" side="start">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Menu</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList lines="full">
          <IonMenuToggle autoHide={false}>
            <IonItem button onClick={handleExportReminders}>
              <IonIcon icon={downloadOutline} slot="start" />
              <IonLabel>Export Data</IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle autoHide={false}>
            <IonItem button onClick={() => importInputRef.current?.click()}>
              <IonIcon icon={logInOutline} slot="start" />
              <IonLabel>Import Data</IonLabel>
            </IonItem>
          </IonMenuToggle>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportReminders}
          />

          <IonMenuToggle autoHide={false}>
            <IonItem button routerLink="/settings" routerDirection="none">
              <IonIcon icon={settingsOutline} slot="start" />
              <IonLabel>Settings</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonTitle size="small" className="ion-text-center">{versionString}</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonMenu>
  );
};

export default SideMenu;