import React from 'react';
import { IonCard, IonCardContent, IonText, IonIcon, IonProgressBar, IonCheckbox } from '@ionic/react';
import { timeOutline, warningOutline, alertCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import clsx from 'clsx';
import { ReminderItem } from '../models/reminder';
import {
  computeRemainingPercent,
  formatRemainingLife,
  getRemainingDays,
  getStatusColor
} from '../util/reminderCalculations';
import { useLongPress } from '../hooks/useLongPress';
import './ReminderList.scss';

interface ReminderListProps {
  items: ReminderItem[];
  onSelect: (item: ReminderItem) => void;
  emptyMessage?: string;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onLongPress: (id: string) => void;
}

const ReminderList: React.FC<ReminderListProps> = ({
  items,
  onSelect,
  emptyMessage,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onLongPress,
}) => {
  const lp = useLongPress(onLongPress);

  if (!items.length) {
    return (
      <div className="ion-text-center ion-padding reminder-list-empty">
        <p>{emptyMessage ?? 'Items you add will appear here with a freshness indicator.'}</p>
      </div>
    );
  }

  return (
    <div className="reminder-list">
      {items.map(item => {
        const remainingDays = getRemainingDays(item);
        const percent = computeRemainingPercent(remainingDays, item.shelfLifeDays);

        const hasProgressBar = !item.wasted && !item.consumed && typeof item.shelfLifeDays !== 'undefined' && typeof item.productionDate !== 'undefined';

        const colorName = getStatusColor(remainingDays);

        let statusIcon = timeOutline;
        if (item.wasted) statusIcon = alertCircleOutline;
        else if (item.consumed) statusIcon = checkmarkCircleOutline;
        else if (colorName === 'danger') statusIcon = alertCircleOutline;
        else if (colorName === 'warning') statusIcon = warningOutline;

        const isSelected = selectedIds.has(item.id);

        const handleClick = () => {
          if (lp.consumeFire(item.id)) return;
          if (selectionMode) {
            onToggleSelect(item.id);
          } else {
            onSelect(item);
          }
        };

        return (
          <IonCard
            button
            key={item.id}
            onClick={handleClick}
            onContextMenu={e => {
              e.preventDefault();
              // Desktop: long press fires contextmenu instead of click — consume here
              lp.consumeFire(item.id);
            }}
            onPointerDown={() => { if (!selectionMode) lp.start(item.id); }}
            onPointerUp={lp.cancel}
            onPointerLeave={lp.cancel}
            className={clsx('reminder-card', { 'reminder-card--selected': isSelected })}
          >
            <IonCardContent>
              <div className="reminder-header">
                {selectionMode && (
                  <IonCheckbox
                    checked={isSelected}
                    className="reminder-checkbox"
                    onClick={e => e.stopPropagation()}
                    onIonChange={() => onToggleSelect(item.id)}
                    aria-label={`Select ${item.name}`}
                  />
                )}
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