import { SplashScreen } from '@capacitor/splash-screen';
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
import SettingsPage from './components/SettingsPage';
import AboutPage from './components/AboutPage';
import AddReminderOverlay from './components/AddReminderOverlay';
import ReminderDetailOverlay from './components/ReminderDetailOverlay';
import CategoryFilter from './components/CategoryFilter';
import useAppVersion from './hooks/useAppVersion';
import useLocalStorageState from './hooks/useLocalStorageState';
import {
  addDays,
  getRemainingDays,
  sortByRemainingLife,
  sortByPrice,
  sortByName,
  sortByShelfLife,
  sortByProductionDate,
  sortByPurchaseDate,
  sortByWastedAt,
  sortByConsumedAt
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
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'about'>('main');
  const SORT_KEY = 'expiration-reminder:sort';
  type ActiveSort = 'remaining' | 'price' | 'name' | 'shelfLife' | 'productionDate' | 'purchaseDate';
  type WastedSort = 'wastedAt' | 'price' | 'name';
  type ConsumedSort = 'consumedAt' | 'price' | 'name';
  type SortState = {
    active: { key: ActiveSort; dir: 'asc' | 'desc' };
    wasted: { key: WastedSort; dir: 'asc' | 'desc' };
    consumed: { key: ConsumedSort; dir: 'asc' | 'desc' };
  };

  const [sortState, setSortState] = useLocalStorageState<SortState>(
    SORT_KEY,
    {
      active: { key: 'remaining', dir: 'asc' },
      wasted: { key: 'wastedAt', dir: 'desc' },
      consumed: { key: 'consumedAt', dir: 'desc' }
    } as SortState
  );

  // Migrate older sort state shape (where active/wasted/consumed were string values) to new object shape with dir
  useEffect(() => {
    // Hide splash screen once the app component is mounted
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (err) {
        console.warn('Error hiding splash screen', err);
      }
    };
    hideSplash();

    // @ts-ignore - runtime shape check
    const isOldShape = typeof (sortState as any)?.active === 'string';
    if (isOldShape) {
      setSortState((prev: any) => ({
        active: { key: prev.active ?? 'remaining', dir: 'asc' },
        wasted: { key: prev.wasted ?? 'wastedAt', dir: 'desc' },
        consumed: { key: prev.consumed ?? 'consumedAt', dir: 'desc' }
      }));
    }
  }, []);
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

  const allReminders = reminders;

  const activeReminders = useMemo(
    () => allReminders.filter(reminder => !reminder.wasted && !reminder.consumed),
    [allReminders]
  );

  const wastedReminders = useMemo(
    () => allReminders.filter(reminder => reminder.wasted),
    [allReminders]
  );

  const consumedReminders = useMemo(
    () => allReminders.filter(reminder => reminder.consumed),
    [allReminders]
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

  const sortRemindersByKey = (items: ReminderItem[], key: string, dir: 'asc' | 'desc') => {
    const copy = [...items];
    let result: ReminderItem[] = copy;
    switch (key) {
      case 'remaining':
        result = copy.sort(sortByRemainingLife);
        break;
      case 'price':
        result = copy.sort(sortByPrice);
        break;
      case 'name':
        result = copy.sort(sortByName);
        break;
      case 'shelfLife':
        result = copy.sort(sortByShelfLife);
        break;
      case 'productionDate':
        result = copy.sort(sortByProductionDate);
        break;
      case 'purchaseDate':
        result = copy.sort(sortByPurchaseDate);
        break;
      case 'wastedAt':
        result = copy.sort(sortByWastedAt);
        break;
      case 'consumedAt':
        result = copy.sort(sortByConsumedAt);
        break;
      default:
        result = copy;
    }
    return dir === 'asc' ? result : result.reverse();
  };

  const handleSortSelect = (key: string) => {
    setSortState(prev => {
      if (viewMode === 'active') {
        const isSameKey = prev.active.key === key;
        return {
          ...prev,
          active: {
            key: key as ActiveSort,
            dir: isSameKey ? (prev.active.dir === 'asc' ? 'desc' : 'asc') : prev.active.dir
          }
        };
      }
      if (viewMode === 'wasted') {
        const isSameKey = prev.wasted.key === key;
        return {
          ...prev,
          wasted: {
            key: key as WastedSort,
            dir: isSameKey ? (prev.wasted.dir === 'asc' ? 'desc' : 'asc') : prev.wasted.dir
          }
        };
      }
      const isSameKey = prev.consumed.key === key;
      return {
        ...prev,
        consumed: {
          key: key as ConsumedSort,
          dir: isSameKey ? (prev.consumed.dir === 'asc' ? 'desc' : 'asc') : prev.consumed.dir
        }
      };
    });
    setIsSortSheetOpen(false);
  };

  const getSortOptions = (): { key: string; label: string }[] => {
    if (viewMode === 'active') {
      return [
        { key: 'remaining', label: 'Remaining life' },
        { key: 'price', label: 'Price' },
        { key: 'name', label: 'Name' },
        { key: 'shelfLife', label: 'Shelf life' },
        { key: 'productionDate', label: 'Production date' },
        { key: 'purchaseDate', label: 'Purchase date' },
      ];
    }
    if (viewMode === 'wasted') {
      return [
        { key: 'wastedAt', label: 'Wasted date' },
        { key: 'price', label: 'Price' },
        { key: 'name', label: 'Name' },
      ];
    }
    return [
      { key: 'consumedAt', label: 'Consumed date' },
      { key: 'price', label: 'Price' },
      { key: 'name', label: 'Name' },
    ];
  };

  const getCurrentSortKey = () => {
    if (viewMode === 'active') return sortState.active.key;
    if (viewMode === 'wasted') return sortState.wasted.key;
    return sortState.consumed.key;
  };

  const getCurrentSortLabel = () => {
    const options = getSortOptions();
    const current = options.find(opt => opt.key === getCurrentSortKey());
    return current?.label ?? 'Sort';
  };

  let displayedReminders: ReminderItem[] = [];
  if (viewMode === 'active') {
    displayedReminders = sortRemindersByKey(
      filteredActiveReminders,
      sortState.active.key,
      sortState.active.dir
    );
  } else if (viewMode === 'wasted') {
    displayedReminders = sortRemindersByKey(
      filteredWastedReminders,
      sortState.wasted.key,
      sortState.wasted.dir
    );
  } else if (viewMode === 'consumed') {
    displayedReminders = sortRemindersByKey(
      filteredConsumedReminders,
      sortState.consumed.key,
      sortState.consumed.dir
    );
  }

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

  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    let listener: PluginListenerHandle | undefined;
    let cancelled = false;

    const setup = async () => {
      const handle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (currentViewRef.current === 'about') {
          setCurrentView('settings');
          return;
        }

        if (currentViewRef.current === 'settings') {
          setCurrentView('main');
          return;
        }

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

  const { fullString: versionString } = useAppVersion();

  return (
    <div className="app-shell">
      {isMenuOpen && <div className="side-menu-backdrop" onClick={() => setIsMenuOpen(false)} />}
      <div ref={menuRef} className={`side-menu ${isMenuOpen ? 'side-menu--open' : ''}`}>
        <div className="side-menu-header">
          <h2>Menu</h2>
          <button
            type="button"
            className="side-menu-close"
            onClick={() => setIsMenuOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="side-menu-content">
          <button
            type="button"
            className="side-menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              handleExportReminders();
            }}
          >
            📤 Export Data
          </button>
          <button
            type="button"
            className="side-menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              if (importInputRef.current) importInputRef.current.click();
            }}
          >
            📥 Import Data
          </button>
          <div className="side-menu-divider" />
          <button
            type="button"
            className="side-menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              setCurrentView('settings');
            }}
          >
            ⚙️ Settings
          </button>
        </div>
        <div className="side-menu-footer">
          {versionString}
        </div>
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden-input"
        onChange={handleImportReminders}
      />
      <header className="app-header">
        <button
          type="button"
          className="menu-trigger-btn"
          aria-label="Menu"
          onClick={() => setIsMenuOpen(v => !v)}
          style={{ flexShrink: 0, width: '44px', height: '44px' }}
        >
          ☰
        </button>
        <div className="header-title">
          <h1>Expiration Reminder</h1>
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
          <div className="sort-controls">
            <div className="total-price">
              {`Total price: ￥${totalPrice.toFixed(2)}`}
            </div>
            <div className="sort-controls__right">
              <button
                type="button"
                className="sort-btn"
                onClick={() => setIsSortSheetOpen(true)}
              >
                <span>{getCurrentSortLabel()}</span>
                <span className="sort-btn__arrow">
                  {(viewMode === 'active' ? sortState.active.dir : viewMode === 'wasted' ? sortState.wasted.dir : sortState.consumed.dir) === 'asc' ? '▲' : '▼'}
                </span>
              </button>
            </div>
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
        selectedCategory={selectedCategory}
      />

      <ReminderDetailOverlay
        reminder={activeReminder}
        isOpen={Boolean(activeReminder)}
        onClose={closeDetail}
        onUpdate={handleUpdateReminder}
        onDelete={handleDeleteReminder}
      />

      {isSortSheetOpen && (
        <div className="action-sheet-overlay">
          <div className="action-sheet-backdrop" onClick={() => setIsSortSheetOpen(false)} />
          <div className="action-sheet">
            <div className="action-sheet__handle" />
            <div className="action-sheet__header">
              <h3>Sort by</h3>
            </div>
            <div className="action-sheet__content">
              {getSortOptions().map(option => (
                <button
                  key={option.key}
                  type="button"
                  className={clsx('action-sheet__item', {
                    'action-sheet__item--active': option.key === getCurrentSortKey()
                  })}
                  onClick={() => handleSortSelect(option.key)}
                >
                  <span>{option.label}</span>
                  {option.key === getCurrentSortKey() && (
                    <span className="action-sheet__check">
                      {(viewMode === 'active' ? sortState.active.dir : viewMode === 'wasted' ? sortState.wasted.dir : sortState.consumed.dir) === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="action-sheet__footer">
              <button
                type="button"
                className="action-sheet__cancel"
                onClick={() => setIsSortSheetOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'settings' && (
        <SettingsPage
          onBack={() => setCurrentView('main')}
          onViewAbout={() => setCurrentView('about')}
        />
      )}

      {currentView === 'about' && (
        <AboutPage onBack={() => setCurrentView('settings')} />
      )}
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
      if (typeof item.shelfLifeDays === 'undefined' || !item.productionDate) {
        return null;
      }
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

