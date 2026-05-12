import React, { useEffect, useMemo, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonProgressBar,
  IonText,
  IonAlert,
  IonActionSheet,
  IonIcon,
} from '@ionic/react';
import ReminderForm from './ReminderForm';
import { ReminderItem } from '../models/reminder';
import { useApp } from '../data/AppContext';
import {
  addDays,
  computeRemainingPercent,
  formatRemainingLife,
  getRemainingDays
} from '../util/reminderCalculations';
import { ellipsisVertical } from 'ionicons/icons';

interface ReminderDetailOverlayProps {
  reminder: ReminderItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const ReminderDetailOverlay: React.FC<ReminderDetailOverlayProps> = ({
  reminder,
  isOpen,
  onClose,
}) => {
  const { updateReminder, deleteReminder } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  const derived = useMemo(() => {
    if (!reminder) {
      return {
        remainingDays: 0,
        percent: 0,
        isExpired: false,
        expirationDate: null as Date | null,
        canMarkActive: false
      };
    }

    const remainingDays = getRemainingDays(reminder);
    const percent = computeRemainingPercent(remainingDays, reminder.shelfLifeDays);
    const isExpired = remainingDays <= 0;
    const expirationDate = (typeof reminder.shelfLifeDays === 'undefined' || typeof reminder.productionDate === 'undefined')
      ? null
      : addDays(new Date(reminder.productionDate), reminder.shelfLifeDays);
    const canMarkActive = reminder.wasted || reminder.consumed;

    return { remainingDays, percent, isExpired, expirationDate, canMarkActive };
  }, [reminder]);

  if (!reminder) return null;

  const { remainingDays, percent, isExpired, expirationDate, canMarkActive } = derived;

  const handleSubmit = async (values: any) => {
    await updateReminder(reminder.id, values);
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    await deleteReminder(reminder.id);
    onClose();
  };

  const handleMarkWasted = async () => {
    await updateReminder(reminder.id, { wasted: true, wastedAt: new Date().toISOString(), consumed: false, consumedAt: null });
    onClose();
  };

  const handleMarkConsumed = async () => {
    await updateReminder(reminder.id, { consumed: true, consumedAt: new Date().toISOString(), wasted: false, wastedAt: null });
    onClose();
  };

  const handleMarkActive = async () => {
    await updateReminder(reminder.id, { wasted: false, wastedAt: null, consumed: false, consumedAt: null });
    onClose();
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{isEditing ? 'Edit Reminder' : reminder.name}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose}>Close</IonButton>
              {!isEditing && (
                <IonButton onClick={() => setShowActionSheet(true)}>
                  <IonIcon slot="icon-only" icon={ellipsisVertical} />
                </IonButton>
              )}
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          {isEditing ? (
            <>
              <p style={{ color: 'var(--text-muted)' }}>
                Adjust fields below and save to keep things accurate.
              </p>
              <ReminderForm
                defaultValues={reminder}
                submitLabel="Save changes"
                onSubmit={handleSubmit}
              />
              <div>
                <IonButton expand="block" fill="clear" onClick={() => setIsEditing(false)}>
                  Cancel Edit
                </IonButton>
              </div>
            </>
          ) : (
            <>
              {!reminder.wasted && !reminder.consumed && typeof reminder.shelfLifeDays !== 'undefined' && (
                <div className="ion-padding-bottom">
                  <h2 style={{ marginTop: 0 }}>
                    <IonText color={isExpired ? 'danger' : percent <= 25 ? 'warning' : 'primary'}>
                      {formatRemainingLife(remainingDays)}
                    </IonText>
                  </h2>
                  <IonProgressBar
                    value={percent / 100}
                    color={isExpired ? 'danger' : percent <= 25 ? 'warning' : 'primary'}
                    style={{ height: '14px', borderRadius: '8px' }}
                  />
                </div>
              )}

              <IonList className="edge-to-edge">
                {reminder.price ? (
                  <IonItem>
                    <IonLabel>
                      <p>Price</p>
                      <h2>￥{reminder.price.toFixed(2)}</h2>
                    </IonLabel>
                  </IonItem>
                ) : null}

                {reminder.category ? (
                  <IonItem>
                    <IonLabel>
                      <p>Category</p>
                      <h2>{reminder.category}</h2>
                    </IonLabel>
                  </IonItem>
                ) : null}

                {reminder.productionDate ? (
                  <IonItem>
                    <IonLabel>
                      <p>Production date</p>
                      <h2>{new Date(reminder.productionDate).toLocaleDateString()}</h2>
                    </IonLabel>
                  </IonItem>
                ) : null}

                {reminder.purchaseDate ? (
                  <IonItem>
                    <IonLabel>
                      <p>Purchase date</p>
                      <h2>{new Date(reminder.purchaseDate).toLocaleDateString()}</h2>
                    </IonLabel>
                  </IonItem>
                ) : null}

                {reminder.shelfLifeDays ? (
                  <IonItem>
                    <IonLabel>
                      <p>Shelf life</p>
                      <h2>{reminder.shelfLifeDays} days</h2>
                    </IonLabel>
                  </IonItem>
                ) : null}

                {!reminder.wasted && !reminder.consumed && expirationDate ? (
                  <IonItem>
                    <IonLabel>
                      <p>Estimated expiration</p>
                      <h2>{expirationDate.toLocaleDateString()}</h2>
                    </IonLabel>
                  </IonItem>
                ) : null}
              </IonList>
            </>
          )}
        </IonContent>
      </IonModal>

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        buttons={[
          {
            text: 'Edit',
            handler: () => setIsEditing(true),
          },
          ...(canMarkActive ? [{
            text: 'Mark as Active',
            handler: handleMarkActive,
          }] : []),
          ...(!reminder.consumed ? [{
            text: 'Mark as Consumed',
            handler: handleMarkConsumed,
          }] : []),
          ...(!reminder.wasted ? [{
            text: 'Mark as Wasted',
            handler: handleMarkWasted,
          }] : []),
          {
            text: 'Delete',
            role: 'destructive',
            handler: () => setShowDeleteAlert(true),
          },
          {
            text: 'Cancel',
            role: 'cancel',
          }
        ]}
      />

      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header="Delete Reminder?"
        message="This action cannot be undone."
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { text: 'Delete', role: 'destructive', handler: handleConfirmDelete },
        ]}
      />
    </>
  );
};

export default ReminderDetailOverlay;