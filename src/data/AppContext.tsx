import { createContext, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import useLocalStorageState from '../hooks/useLocalStorageState';
import { ReminderItem, ReminderFormValues } from '../models/reminder';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
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
} from '../util/reminderCalculations';

const STORAGE_KEY = 'expiration-reminder:items';
const SORT_KEY = 'expiration-reminder:sort';
const INITIAL_DELAY_MS = 2000;

export type ActiveSort = 'remaining' | 'price' | 'name' | 'shelfLife' | 'productionDate' | 'purchaseDate';
export type WastedSort = 'wastedAt' | 'price' | 'name';
export type ConsumedSort = 'consumedAt' | 'price' | 'name';
export type SortState = {
  active: { key: ActiveSort; dir: 'asc' | 'desc' };
  wasted: { key: WastedSort; dir: 'asc' | 'desc' };
  consumed: { key: ConsumedSort; dir: 'asc' | 'desc' };
};

interface AppContextType {
  reminders: ReminderItem[];
  sortState: SortState;
  setSortState: React.Dispatch<React.SetStateAction<SortState>>;
  addReminder: (values: ReminderFormValues) => Promise<void>;
  updateReminder: (id: string, updates: Partial<ReminderItem>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  activeReminders: ReminderItem[];
  wastedReminders: ReminderItem[];
  consumedReminders: ReminderItem[];
  sortRemindersByKey: (items: ReminderItem[], key: string, dir: 'asc' | 'desc') => ReminderItem[];
  replaceReminders: (newReminders: ReminderItem[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useLocalStorageState<ReminderItem[]>(
    STORAGE_KEY,
    []
  );

  const [sortState, setSortState] = useLocalStorageState<SortState>(
    SORT_KEY,
    {
      active: { key: 'remaining', dir: 'asc' },
      wasted: { key: 'wastedAt', dir: 'desc' },
      consumed: { key: 'consumedAt', dir: 'desc' }
    } as SortState
  );

  // Migration logic
  useEffect(() => {
    setReminders(prev => {
      let needsMigration = false;
      const migrated = prev.map(reminder => {
        let updated = { ...reminder };
        if (typeof updated.category === 'undefined') {
          updated.category = '';
          needsMigration = true;
        }
        if ((updated as any).archived) {
          updated.wasted = true;
          updated.wastedAt = (updated as any).archivedAt ?? null;
          needsMigration = true;
        }
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

    const isOldShape = typeof (sortState as any)?.active === 'string';
    if (isOldShape) {
      setSortState((prev: any) => ({
        active: { key: prev.active ?? 'remaining', dir: 'asc' },
        wasted: { key: prev.wasted ?? 'wastedAt', dir: 'desc' },
        consumed: { key: prev.consumed ?? 'consumedAt', dir: 'desc' }
      }));
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

  const addReminder = useCallback(async (values: ReminderFormValues) => {
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

  const updateReminder = useCallback(async (id: string, updates: Partial<ReminderItem>) => {
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
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, []);

  const activeReminders = useMemo(
    () => reminders.filter(reminder => !reminder.wasted && !reminder.consumed),
    [reminders]
  );

  const wastedReminders = useMemo(
    () => reminders.filter(reminder => reminder.wasted),
    [reminders]
  );

  const consumedReminders = useMemo(
    () => reminders.filter(reminder => reminder.consumed),
    [reminders]
  );

  const sortRemindersByKey = useCallback((items: ReminderItem[], key: string, dir: 'asc' | 'desc') => {
    const copy = [...items];
    let result: ReminderItem[] = copy;
    switch (key) {
      case 'remaining': result = copy.sort(sortByRemainingLife); break;
      case 'price': result = copy.sort(sortByPrice); break;
      case 'name': result = copy.sort(sortByName); break;
      case 'shelfLife': result = copy.sort(sortByShelfLife); break;
      case 'productionDate': result = copy.sort(sortByProductionDate); break;
      case 'purchaseDate': result = copy.sort(sortByPurchaseDate); break;
      case 'wastedAt': result = copy.sort(sortByWastedAt); break;
      case 'consumedAt': result = copy.sort(sortByConsumedAt); break;
      default: result = copy;
    }
    return dir === 'asc' ? result : result.reverse();
  }, []);

  const replaceReminders = useCallback((newReminders: ReminderItem[]) => {
    setReminders(newReminders);
  }, [setReminders]);

  return (
    <AppContext.Provider value={{
      reminders,
      sortState,
      setSortState,
      addReminder,
      updateReminder,
      deleteReminder,
      activeReminders,
      wastedReminders,
      consumedReminders,
      sortRemindersByKey,
      replaceReminders
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};