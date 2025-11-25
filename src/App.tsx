import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  LocalNotificationSchema,
  LocalNotifications
} from '@capacitor/local-notifications';
import {
  ReminderFormValues,
  ReminderItem,
  ReminderUpdate
} from './types/reminder';
import clsx from 'clsx';
import ReminderList from './components/ReminderList';
import AddReminderOverlay from './components/AddReminderOverlay';
import ReminderDetailOverlay from './components/ReminderDetailOverlay';
import CategoryFilter from './components/CategoryFilter';
import useLocalStorageState from './hooks/useLocalStorageState';
import {
  addDays,
  getRemainingDays,
  sortByRemainingLife
} from './utils/reminderCalculations';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'expiration-reminder:items';
const INITIAL_DELAY_MS = 2000;

const App = () => {
  const [reminders, setReminders] = useLocalStorageState<ReminderItem[]>(
    STORAGE_KEY,
    []
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const overlayOpenRef = useRef(isOverlayOpen);
  const detailOpenRef = useRef(Boolean(activeReminderId));
  const menuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReminders(prev => {
      const needsMigration = prev.some(
        reminder =>
          typeof reminder.category === 'undefined' ||
          typeof reminder.archived === 'undefined'
      );
      if (!needsMigration) {
        return prev;
      }

      return prev.map(reminder => ({
        ...reminder,
        category: reminder.category ?? '',
        archived: reminder.archived ?? false,
        archivedAt: typeof reminder.archivedAt === 'undefined' ? null : reminder.archivedAt
      }));
    });
  }, [setReminders]);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display === 'denied') {
          await LocalNotifications.requestPermissions();
        }
      } catch (error) {
        console.warn('Local notifications unavailable', error);
      }
    };

    initNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const sortedReminders = useMemo(
    () => [...reminders].sort(sortByRemainingLife),
    [reminders]
  );

  const activeReminders = useMemo(
    () => sortedReminders.filter(reminder => !reminder.archived),
    [sortedReminders]
  );

  const archivedReminders = useMemo(
    () => sortedReminders.filter(reminder => reminder.archived),
    [sortedReminders]
  );

  const filteredActiveReminders = useMemo(() => {
    if (!selectedCategory) {
      return activeReminders;
    }

    return activeReminders.filter(reminder => reminder.category === selectedCategory);
  }, [activeReminders, selectedCategory]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(activeReminders.map(reminder => reminder.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return unique;
  }, [activeReminders]);

  const displayedReminders =
    viewMode === 'active' ? filteredActiveReminders : archivedReminders;

  const activeReminder = useMemo(
    () => reminders.find(reminder => reminder.id === activeReminderId) ?? null,
    [activeReminderId, reminders]
  );

  const handleAddReminder = useCallback(async (values: ReminderFormValues) => {
    const newReminder: ReminderItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      ...values,
      category: values.category ?? '',
      archived: false,
      archivedAt: null
    };

    setReminders(prev => [newReminder, ...prev]);

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, []);

  const scheduleReminderNotifications = useCallback(
    async (items: ReminderItem[]) => {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length) {
          await LocalNotifications.cancel(pending);
        }

        const notifications = buildNotificationPayload(items);
        if (notifications.length) {
          await LocalNotifications.schedule({ notifications });
        }
      } catch (error) {
        console.warn('Unable to schedule notifications', error);
      }
    },
    []
  );

  useEffect(() => {
    scheduleReminderNotifications(reminders.filter(reminder => !reminder.archived));
  }, [reminders, scheduleReminderNotifications]);

  const handleUpdateReminder = useCallback(
    async (id: string, updates: ReminderUpdate) => {
      const normalizedUpdates: ReminderUpdate = {
        ...updates,
        category: updates.category ?? ''
      };

      setReminders(prev =>
        prev.map(reminder =>
          reminder.id === id ? { ...reminder, ...normalizedUpdates } : reminder
        )
      );

      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.warn('Unable to trigger haptic feedback', error);
      }
    },
    [setReminders]
  );

  const handleDeleteReminder = useCallback(
    async (id: string) => {
      setReminders(prev => prev.filter(reminder => reminder.id !== id));

      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.warn('Unable to trigger haptic feedback', error);
      }
    },
    [setReminders]
  );

  const handleArchiveReminder = useCallback(
    async (id: string) => {
      setReminders(prev =>
        prev.map(reminder =>
          reminder.id === id
            ? { ...reminder, archived: true, archivedAt: new Date().toISOString() }
            : reminder
        )
      );

      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.warn('Unable to trigger haptic feedback', error);
      }
    },
    [setReminders]
  );

  const handleExportReminders = async () => {
    const dataStr = JSON.stringify(reminders, null, 2);
    if (Capacitor.isNativePlatform()) {
      try {
        const fileName = `expiration-reminders-${Date.now()}.json`;
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
      a.download = 'expiration-reminders.json';
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
          setReminders(imported);
          alert('Reminders imported successfully!');
        } else {
          alert('Invalid file format.');
        }
      } catch {
        alert('Failed to import reminders.');
      }
    };
    reader.readAsText(file);
  };

  const openOverlay = () => {
    setIsOverlayOpen(true);
    setActiveReminderId(null);
  };

  const closeOverlay = () => setIsOverlayOpen(false);

  const openDetail = (reminder: ReminderItem) => {
    setActiveReminderId(reminder.id);
    setIsOverlayOpen(false);
  };

  const closeDetail = () => setActiveReminderId(null);

  useEffect(() => {
    overlayOpenRef.current = isOverlayOpen;
  }, [isOverlayOpen]);

  useEffect(() => {
    detailOpenRef.current = Boolean(activeReminderId);
  }, [activeReminderId]);

  useEffect(() => {
    let listener: PluginListenerHandle | undefined;
    let cancelled = false;

    const setup = async () => {
      const handle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (overlayOpenRef.current) {
          setIsOverlayOpen(false);
          return;
        }

        if (detailOpenRef.current) {
          setActiveReminderId(null);
          return;
        }

        if (canGoBack) {
          window.history.back();
        } else {
          CapacitorApp.exitApp();
        }
      });

      if (cancelled) {
        handle.remove();
      } else {
        listener = handle;
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (listener) {
        listener.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'archived') {
      setSelectedCategory('');
    }
  }, [viewMode]);

  return (
    <div className="app-shell">
      <header className="app-header" style={{ position: 'relative' }}>
        <div>
          <p className="eyebrow">Expiration Reminder</p>
          <h1>Keep an eye on freshness</h1>
          <p className="subtitle">
            Track production dates, shelf life, and remaining freshness at a glance.
          </p>
        </div>
        <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 20 }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.7rem',
              color: 'white',
              padding: 0,
              margin: 0,
              lineHeight: 1
            }}
            aria-label="Menu"
            onClick={() => setIsMenuOpen(v => !v)}
          >
            &#x22EE;
          </button>
          {isMenuOpen && (
            <div ref={menuRef} style={{
              position: 'absolute',
              top: 36,
              right: 0,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              minWidth: 160,
              padding: '0.5rem 0',
              display: 'flex',
              flexDirection: 'column',
              fontSize: '1rem',
              fontWeight: 500
            }}>
              <button
                type="button"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '0.75rem 1.25rem',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: '#222',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  borderRadius: 0
                }}
                onClick={() => { handleExportReminders(); setIsMenuOpen(false); }}
              >
                Export Data
              </button>
              <button
                type="button"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '0.75rem 1.25rem',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: '#222',
                  cursor: 'pointer',
                  borderRadius: 0,
                  marginBottom: 0
                }}
                onClick={() => {
                  if (importInputRef.current) importInputRef.current.click();
                  setIsMenuOpen(false);
                }}
              >
                Import Data
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleImportReminders}
              />
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="container">
          <div className="view-switch">
            <button
              type="button"
              className={clsx('view-switch__card', { active: viewMode === 'active' })}
              onClick={() => setViewMode('active')}
            >
              <div>
                <p className="view-switch__label">Active items</p>
                <p className="view-switch__count">{activeReminders.length}</p>
              </div>
            </button>
            <button
              type="button"
              className={clsx('view-switch__card', { active: viewMode === 'archived' })}
              onClick={() => setViewMode('archived')}
            >
              <div>
                <p className="view-switch__label">Archived</p>
                <p className="view-switch__count">{archivedReminders.length}</p>
              </div>
            </button>
          </div>

          {viewMode === 'active' ? (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onChange={setSelectedCategory}
            />
          ) : null}

          <ReminderList
            items={displayedReminders}
            onSelect={openDetail}
            emptyMessage={
              viewMode === 'archived'
                ? 'No archived items yet.'
                : selectedCategory
                  ? 'Nothing in this category yet. Try adding one!'
                  : undefined
            }
          />

          {viewMode === 'active' ? (
            <div className="add-item-row">
              <button type="button" className="add-item-button" onClick={openOverlay}>
                <span aria-hidden="true">+</span>
                <span>Add item</span>
              </button>
            </div>
          ) : null}
        </section>
      </main>

      <AddReminderOverlay
        isOpen={isOverlayOpen}
        onClose={closeOverlay}
        onSubmit={handleAddReminder}
      />

      <ReminderDetailOverlay
        reminder={activeReminder}
        isOpen={Boolean(activeReminder)}
        onClose={closeDetail}
        onUpdate={handleUpdateReminder}
        onDelete={handleDeleteReminder}
        onArchive={handleArchiveReminder}
      />
    </div>
  );
};

const buildNotificationPayload = (items: ReminderItem[]): LocalNotificationSchema[] => {
  const now = new Date();

  return items
    .map((item, index) => {
      if (item.archived) {
        return null;
      }

      const remainingDays = getRemainingDays(item);
      const alertOffset = Math.max(item.shelfLifeDays - 29, 0);
      const alertDate = addDays(new Date(item.productionDate), alertOffset);

      if (alertDate.getTime() <= now.getTime()) {
        if (remainingDays >= 30) {
          return null;
        }

        const trigger = new Date(now.getTime() + INITIAL_DELAY_MS + index * 500);
        return {
          id: index + 1,
          title: `${item.name} is under 30 days`,
          body:
            remainingDays > 0
              ? `${remainingDays} day(s) of shelf life left.`
              : 'This item has expired.',
          schedule: { at: trigger },
          extra: { reminderId: item.id }
        };
      }

      return {
        id: index + 1,
        title: `${item.name} nearing expiration`,
        body: 'Less than 30 days of shelf life remain.',
        schedule: { at: alertDate },
        extra: { reminderId: item.id }
      };
    })
    .filter(Boolean) as LocalNotificationSchema[];
};

export default App;

