import React from 'react';
import { IonList, IonCard, IonCardContent, IonText, IonIcon, IonProgressBar } from '@ionic/react';
import { timeOutline, warningOutline, alertCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import clsx from 'clsx';
import { ReminderItem } from '../models/reminder';
import {
  computeRemainingPercent,
  formatRemainingLife,
  getRemainingDays
} from '../util/reminderCalculations';
import './ReminderList.scss';

interface ReminderListProps {
  items: ReminderItem[];
  onSelect: (item: ReminderItem) => void;
  emptyMessage?: string;
}

const ReminderList: React.FC<ReminderListProps> = ({ items, onSelect, emptyMessage }) => {
  if (!items.length) {
    return (
      <div className="ion-text-center ion-padding" style={{ color: 'var(--text-muted)' }}>
        <p>{emptyMessage ?? 'Items you add will appear here with a freshness indicator.'}</p>
      </div>
    );
  }

  return (
    <div className="reminder-list">
      {items.map(item => {
        const remainingDays = getRemainingDays(item);
        const isExpired = remainingDays <= 0;
        const isLow = remainingDays > 0 && remainingDays <= 30;
        const percent = computeRemainingPercent(remainingDays, item.shelfLifeDays);

        const hasProgressBar = !item.wasted && !item.consumed && typeof item.shelfLifeDays !== 'undefined' && typeof item.productionDate !== 'undefined';

        const colorName = isExpired ? 'danger' : isLow ? 'warning' : 'primary';

        let statusIcon = timeOutline;
        if (item.wasted) statusIcon = alertCircleOutline;
        else if (item.consumed) statusIcon = checkmarkCircleOutline;
        else if (isExpired) statusIcon = alertCircleOutline;
        else if (isLow) statusIcon = warningOutline;

        return (
          <IonCard
            button
            key={item.id}
            onClick={() => onSelect(item)}
            className="reminder-card"
          >
            <IonCardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="reminder-name">{item.name}</h2>
                {item.price ? <IonText color="medium" className="reminder-price">￥{item.price.toFixed(2)}</IonText> : null}
              </div>

              {hasProgressBar && (
                <div className="reminder-life">
                  <IonIcon icon={statusIcon} color={colorName} />
                  <IonText color={colorName}>
                    {formatRemainingLife(remainingDays)}
                  </IonText>
                </div>
              )}
            </IonCardContent>
            {hasProgressBar && (
              <IonProgressBar
                value={percent / 100}
                color={colorName}
                className="reminder-progress"
              />
            )}
          </IonCard>
        );
      })}
    </div>
  );
};

export default ReminderList;