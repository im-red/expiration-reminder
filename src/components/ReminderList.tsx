import clsx from 'clsx';
import { ReminderItem } from '../types/reminder';
import {
  computeRemainingPercent,
  formatRemainingLife,
  getRemainingDays
} from '../utils/reminderCalculations';

interface ReminderListProps {
  items: ReminderItem[];
  onSelect: (item: ReminderItem) => void;
  emptyMessage?: string;
}

const ReminderList = ({ items, onSelect, emptyMessage }: ReminderListProps) => {
  if (!items.length) {
    return (
      <section className="card reminder-empty">
        <h2>Reminder list</h2>
        <p>{emptyMessage ?? 'Items you add will appear here with a freshness indicator.'}</p>
      </section>
    );
  }

  return (
    <section className="card reminder-list">
      <ul>
        {items.map(item => {
          const remainingDays = getRemainingDays(item);
          const isExpired = remainingDays <= 0;
          const isLow = remainingDays > 0 && remainingDays <= 30;
          const percent = computeRemainingPercent(remainingDays, item.shelfLifeDays);

          return (
            <li key={item.id}>
              <button type="button" className="reminder-row" onClick={() => onSelect(item)}>
                <div className="reminder-row__top">
                  <span style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                    <span className="reminder-row__name">{item.name}</span>
                    {!item.wasted && !item.consumed && typeof item.shelfLifeDays !== 'undefined' && typeof item.productionDate !== 'undefined' && (
                      <span
                        className={clsx('reminder-row__life', {
                          expired: isExpired,
                          warning: isLow
                        })}
                      >
                        {formatRemainingLife(remainingDays)}
                      </span>
                    )}
                  </span>
                  <span className="reminder-row__price">{item.price ? `￥${item.price.toFixed(2)}` : ''}</span>
                </div>
                {!item.wasted && !item.consumed && (
                  <div className="progress-bar progress-bar--sm">
                    <div
                      className={clsx('progress-bar__fill', {
                        'is-low': percent <= 25,
                        'is-expired': isExpired
                      })}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ReminderList;

