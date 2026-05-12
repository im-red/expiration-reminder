import React from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/react';
import ReminderForm from './ReminderForm';
import { ReminderFormValues } from '../models/reminder';
import { useApp } from '../data/AppContext';

interface AddReminderOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory?: string;
}

const AddReminderOverlay: React.FC<AddReminderOverlayProps> = ({ isOpen, onClose, selectedCategory }) => {
  const { addReminder } = useApp();

  const handleSubmit = async (values: ReminderFormValues) => {
    await addReminder(values);
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Add Reminder</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p style={{ color: 'var(--text-muted)' }}>
          Capture the basics so we can track freshness for you.
        </p>
        <ReminderForm
          onSubmit={handleSubmit}
          submitLabel="Add reminder"
          selectedCategory={selectedCategory}
        />
      </IonContent>
    </IonModal>
  );
};

export default AddReminderOverlay;