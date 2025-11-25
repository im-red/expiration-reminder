import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import ReminderForm from './ReminderForm';
import { ReminderFormValues, ReminderItem } from '../types/reminder';
import {
  addDays,
  computeRemainingPercent,
  formatRemainingLife,
  getRemainingDays
} from '../utils/reminderCalculations';

interface ReminderDetailOverlayProps {
  reminder: ReminderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, values: ReminderFormValues) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onArchive: (id: string) => Promise<void> | void;
}

const ReminderDetailOverlay = ({
  reminder,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onArchive
}: ReminderDetailOverlayProps) => {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
  }, [isOpen, reminder]);

  const derived = useMemo(() => {
    if (!reminder) {
      return {
        remainingDays: 0,
        percent: 0,
        isExpired: false,
        expirationDate: null as Date | null,
        canArchive: false
      };
    }

    const remainingDays = getRemainingDays(reminder);
    const percent = computeRemainingPercent(remainingDays, reminder.shelfLifeDays);
    const isExpired = remainingDays <= 0;
    const expirationDate = addDays(new Date(reminder.productionDate), reminder.shelfLifeDays);
    const canArchive = isExpired && !reminder.archived;

    return { remainingDays, percent, isExpired, expirationDate, canArchive };
  }, [reminder]);

  if (!isOpen || !reminder) {
    return null;
  }

  const { remainingDays, percent, isExpired, expirationDate, canArchive } = derived;

  const handleSubmit = async (values: ReminderFormValues) => {
    await onUpdate(reminder.id, values);
    setIsEditing(false);
    onClose();
  };

  const handleDelete = async () => {
    const shouldDelete = window.confirm('Delete this reminder? This cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    await onDelete(reminder.id);
    onClose();
  };

  const handleArchive = async () => {
    const shouldArchive = window.confirm('Archive this expired item?');
    if (!shouldArchive) {
      return;
    }

    await onArchive(reminder.id);
    onClose();
  };

  return (
    <div className="overlay">
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="overlay-panel">
        <div className="overlay-header overlay-header--between">
          <button type="button" className="overlay-back" onClick={onClose}>
            &lt; Back
          </button>
          {!isEditing && (
            <button
              type="button"
              className="overlay-action"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <ReminderForm
            defaultValues={reminder}
            submitLabel="Save changes"
            title="Edit reminder"
            subtitle="Adjust fields below and save to keep things accurate."
            onSubmit={handleSubmit}
          />
        ) : (
          <article className="card reminder-detail">
            <header className="reminder-detail__header">
              <div>
                <p className="reminder-detail__label">Item</p>
                <h2>{reminder.name}</h2>
              </div>
              <p className={clsx('reminder-detail__status', { expired: isExpired })}>
                {formatRemainingLife(remainingDays)}
              </p>
            </header>

            <div className="progress-bar progress-bar--lg">
              <div
                className={clsx('progress-bar__fill', {
                  'is-low': percent <= 25,
                  'is-expired': isExpired
                })}
                style={{ width: `${percent}%` }}
              />
            </div>

            <dl className="reminder-detail__meta">
              <div>
                <dt>Category</dt>
                <dd>{reminder.category || 'Uncategorized'}</dd>
              </div>
              <div>
                <dt>Production date</dt>
                <dd>
                  {new Date(reminder.productionDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </dd>
              </div>
              <div>
                <dt>Shelf life</dt>
                <dd>{reminder.shelfLifeDays} days</dd>
              </div>
              <div>
                <dt>Estimated expiration</dt>
                <dd>
                  {expirationDate.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </dd>
              </div>
            </dl>

            <div className="reminder-detail__actions">
              {canArchive ? (
                <button type="button" className="pill-button" onClick={handleArchive}>
                  Archive item
                </button>
              ) : null}
              <button
                type="button"
                className="pill-button pill-button--danger"
                onClick={handleDelete}
              >
                Delete item
              </button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default ReminderDetailOverlay;

