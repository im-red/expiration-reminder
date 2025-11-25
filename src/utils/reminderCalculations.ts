import { ReminderItem } from '../types/reminder';

export const MS_IN_DAY = 1000 * 60 * 60 * 24;

export const getElapsedDays = (date: string) => {
  const producedAt = new Date(date);
  const elapsedMs = Date.now() - producedAt.getTime();
  return Math.max(0, Math.ceil(elapsedMs / MS_IN_DAY));
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

