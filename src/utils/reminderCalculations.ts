import { ReminderItem } from '../types/reminder';

export const MS_IN_DAY = 1000 * 60 * 60 * 24;

export const getElapsedDays = (date: string) => {
  // Support both 'YYYY-MM-DD' and 'YYYY/MM/DD' formats
  const [year, month, day] = date.split(/[-\/]/).map(Number);
  const producedAt = new Date(year, month - 1, day, 0, 0, 0, 0);
  const elapsedMs = Date.now() - producedAt.getTime();
  // console.log('date:', date, 'producedAt:', producedAt, 'now:', new Date(), 'elapsedMs:', elapsedMs, 'elapsedDays:', Math.floor(elapsedMs / MS_IN_DAY));
  return Math.max(0, Math.floor(elapsedMs / MS_IN_DAY));
};

export const getRemainingDays = (reminder: ReminderItem) =>
  reminder.shelfLifeDays - getElapsedDays(reminder.productionDate);

export const formatRemainingLife = (remainingDays: number) => {
  if (remainingDays <= 0) {
    return 'Expired';
  }

  if (remainingDays === 1) {
    return '1 day left';
  }

  return `${remainingDays} days left`;
};

export const computeRemainingPercent = (
  remainingDays: number,
  shelfLifeDays: number
) => {
  if (shelfLifeDays <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (remainingDays / shelfLifeDays) * 100));
};

export const sortByRemainingLife = (a: ReminderItem, b: ReminderItem) =>
  getRemainingDays(a) - getRemainingDays(b);

export const addDays = (date: Date, days: number) => {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
};

