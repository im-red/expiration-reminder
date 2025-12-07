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
  onUpdate: (id: string, updates: Partial<ReminderItem>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

const ReminderDetailOverlay = ({
  reminder,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: ReminderDetailOverlayProps) => {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
  }, [isOpen, reminder]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const derived = useMemo(() => {
    if (!reminder) {
      return {
        remainingDays: 0,
        percent: 0,
        isExpired: false,
        expirationDate: null as Date | null,
        canMarkWasted: false,
        canMarkConsumed: false,
        canMarkActive: false
      };
    }

    const remainingDays = getRemainingDays(reminder);
    const percent = computeRemainingPercent(remainingDays, reminder.shelfLifeDays);
    const isExpired = remainingDays <= 0;
    const expirationDate = addDays(new Date(reminder.productionDate), reminder.shelfLifeDays);
    const canMarkWasted = !reminder.wasted;
    const canMarkConsumed = !reminder.consumed;
    const canMarkActive = reminder.wasted || reminder.consumed;

    return { remainingDays, percent, isExpired, expirationDate, canMarkWasted, canMarkConsumed, canMarkActive };
  }, [reminder]);

  if (!isOpen || !reminder) {
    return null;
  }

  const { remainingDays, percent, isExpired, expirationDate, canMarkWasted, canMarkConsumed, canMarkActive } = derived;

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

  const handleMarkWasted = async () => {
    await onUpdate(reminder.id, { wasted: true, wastedAt: new Date().toISOString(), consumed: false, consumedAt: null });
    onClose();
  };

  const handleMarkConsumed = async () => {
    await onUpdate(reminder.id, { consumed: true, consumedAt: new Date().toISOString(), wasted: false, wastedAt: null });
    onClose();
  };

  const handleMarkActive = async () => {
    await onUpdate(reminder.id, { wasted: false, wastedAt: null, consumed: false, consumedAt: null });
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="overlay-action overlay-action--danger"
                onClick={handleDelete}
              >
                Delete
              </button>
              <button
                type="button"
                className="overlay-action"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            </div>
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
              <div style={{ display: reminder.price ? 'grid' : 'none' }}>
                <dt>Price</dt>
                <dd>{reminder.price ? `￥${reminder.price.toFixed(2)}` : ''}</dd>
              </div>
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
              {reminder.purchaseDate ? (
                <div>
                  <dt>Purchase date</dt>
                  <dd>
                    {new Date(reminder.purchaseDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Shelf life</dt>
                <dd>{reminder.shelfLifeDays} days</dd>
              </div>
              <div>
                <dt>Estimated expiration</dt>
                <dd>
                  {expirationDate ? expirationDate.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </dd>
              </div>
            </dl>

            <div className="reminder-detail__actions">
              {canMarkActive ? (
                <button type="button" className="pill-button" onClick={handleMarkActive}>
                  Mark as active
                </button>
              ) : null}
              {reminder.wasted && (
                <button type="button" className="pill-button" onClick={handleMarkConsumed}>
                  Mark as consumed
                </button>
              )}
              {reminder.consumed && (
                <button type="button" className="pill-button" onClick={handleMarkWasted}>
                  Mark as wasted
                </button>
              )}
              {!reminder.wasted && !reminder.consumed && (
                <>
                  <button type="button" className="pill-button" onClick={handleMarkWasted}>
                    Mark as wasted
                  </button>
                  <button type="button" className="pill-button" onClick={handleMarkConsumed}>
                    Mark as consumed
                  </button>
                </>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default ReminderDetailOverlay;

