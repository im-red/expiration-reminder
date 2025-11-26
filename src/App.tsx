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
  ReminderItem
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
const VIEW_MODES = ['active', 'wasted', 'consumed'] as const;
type ViewMode = typeof VIEW_MODES[number];

const App = () => {
  const [reminders, setReminders] = useLocalStorageState<ReminderItem[]>(
    STORAGE_KEY,
    []
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const overlayOpenRef = useRef(isOverlayOpen);
  const detailOpenRef = useRef(Boolean(activeReminderId));
  const menuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReminders(prev => {
      let needsMigration = false;
      const migrated = prev.map(reminder => {
        let updated = { ...reminder };
        // Migrate category
        if (typeof updated.category === 'undefined') {
          updated.category = '';
          needsMigration = true;
        }
        // Migrate wasted/consumed from archived
        if ((updated as any).archived) {
          updated.wasted = true;
          updated.wastedAt = (updated as any).archivedAt ?? null;
          needsMigration = true;
        }
        // Ensure wasted/consumed/price fields exist
        if (typeof updated.wasted === 'undefined') {
          updated.wasted = false;
          needsMigration = true;
        }
        if (typeof updated.wastedAt === 'undefined') {
          updated.wastedAt = null;
          needsMigration = true;
        }
        if (typeof updated.consumed === 'undefined') {
          updated.consumed = false;
          needsMigration = true;
        }
        if (typeof updated.consumedAt === 'undefined') {
          updated.consumedAt = null;
          needsMigration = true;
        }
        if (typeof updated.price === 'undefined') {
          updated.price = undefined;
          needsMigration = true;
        }
        return updated;
      });
      return needsMigration ? migrated : prev;
    });
  }, []);

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
    () => sortedReminders.filter(reminder => !reminder.wasted && !reminder.consumed),
    [sortedReminders]
  );

  const wastedReminders = useMemo(
    () => sortedReminders.filter(reminder => reminder.wasted),
    [sortedReminders]
  );

  const consumedReminders = useMemo(
    () => sortedReminders.filter(reminder => reminder.consumed),
    [sortedReminders]
  );

  const filteredActiveReminders = useMemo(() => {
    if (!selectedCategory) {
      return activeReminders;
    }
    return activeReminders.filter(reminder => reminder.category === selectedCategory);
  }, [activeReminders, selectedCategory]);

  const filteredWastedReminders = useMemo(() => {
    if (!selectedCategory) return wastedReminders;
    return wastedReminders.filter(reminder => reminder.category === selectedCategory);
  }, [wastedReminders, selectedCategory]);

  const filteredConsumedReminders = useMemo(() => {
    if (!selectedCategory) return consumedReminders;
    return consumedReminders.filter(reminder => reminder.category === selectedCategory);
  }, [consumedReminders, selectedCategory]);

  // Only show categories for current state
  const categories = useMemo(() => {
    let source: ReminderItem[] = [];
    if (viewMode === 'active') source = activeReminders;
    else if (viewMode === 'wasted') source = wastedReminders;
    else if (viewMode === 'consumed') source = consumedReminders;
    const unique = Array.from(
      new Set(source.map(reminder => reminder.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return unique;
  }, [viewMode, activeReminders, wastedReminders, consumedReminders]);

  let displayedReminders: ReminderItem[] = [];
  if (viewMode === 'active') displayedReminders = filteredActiveReminders;
  else if (viewMode === 'wasted') displayedReminders = filteredWastedReminders;
  else if (viewMode === 'consumed') displayedReminders = filteredConsumedReminders;

  // Price sum
  const totalPrice = useMemo(() => {
    return displayedReminders.reduce((sum, r) => sum + (r.price ?? 0), 0);
  }, [displayedReminders]);

  const activeReminder = useMemo(
    () => reminders.find(reminder => reminder.id === activeReminderId) ?? null,
    [activeReminderId, reminders]
  );

  const handleAddReminder = useCallback(async (values: ReminderFormValues) => {
    const newReminder: ReminderItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      ...values,
      category: values.category ?? '',
      wasted: false,
      wastedAt: null,
      consumed: false,
      consumedAt: null,
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
    scheduleReminderNotifications(reminders.filter(reminder => !reminder.wasted && !reminder.consumed));
  }, [reminders, scheduleReminderNotifications]);

  const handleUpdateReminder = useCallback(
    async (id: string, updates: Partial<ReminderItem>) => {
      setReminders(prev =>
        prev.map(reminder =>
          reminder.id === id ? { ...reminder, ...updates } : reminder
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
    console.log('Importing file:', file);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          setReminders(imported);
          console.log('Reminders imported:', imported);
          alert('Reminders imported successfully!');
        } else {
          console.error('Invalid file format:', imported);
          alert('Invalid file format.');
        }
      } catch (err) {
        console.error('Failed to import reminders:', err);
        alert('Failed to import reminders.');
      }
    };
    reader.onerror = err => {
      console.error('File read error:', err);
      alert('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const openOverlay = () => {
    setIsOverlayOpen(true);
    setActiveReminderId(null);
  };

  const closeOverlay = () => setIsOverlayOpen(false);

  // Allow item state modification in all views
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
    if (viewMode !== 'active') {
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
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportReminders}
          />
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
                  console.log('Importing file', importInputRef.current);
                  if (importInputRef.current) importInputRef.current.click();
                  setIsMenuOpen(false);
                }}
              >
                Import Data
              </button>
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
                <p className="view-switch__label">Active</p>
                <p className="view-switch__count">{activeReminders.length}</p>
              </div>
            </button>
            <button
              type="button"
              className={clsx('view-switch__card', { active: viewMode === 'wasted' })}
              onClick={() => setViewMode('wasted')}
            >
              <div>
                <p className="view-switch__label">Wasted</p>
                <p className="view-switch__count">{wastedReminders.length}</p>
              </div>
            </button>
            <button
              type="button"
              className={clsx('view-switch__card', { active: viewMode === 'consumed' })}
              onClick={() => setViewMode('consumed')}
            >
              <div>
                <p className="view-switch__label">Consumed</p>
                <p className="view-switch__count">{consumedReminders.length}</p>
              </div>
            </button>
          </div>

          {viewMode !== 'active' || categories.length ? (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onChange={setSelectedCategory}
            />
          ) : null}
          <div style={{ fontWeight: 600, fontSize: '0.8rem'}}>
            {`Total price: ￥${totalPrice.toFixed(2)}`}
          </div>
          <ReminderList
            items={displayedReminders}
            onSelect={openDetail}
            emptyMessage={
              viewMode === 'wasted'
                ? 'No wasted items yet.'
                : viewMode === 'consumed'
                  ? 'No consumed items yet.'
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
      />
    </div>
  );
};

const buildNotificationPayload = (items: ReminderItem[]): LocalNotificationSchema[] => {
  const now = new Date();

  return items
    .map((item, index) => {
      if (item.wasted || item.consumed) {
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

