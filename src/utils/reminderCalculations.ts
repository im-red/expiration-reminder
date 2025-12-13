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

export const getRemainingDays = (reminder: ReminderItem) => {
  if (
    typeof reminder.shelfLifeDays === 'undefined' ||
    reminder.shelfLifeDays === null ||
    !reminder.productionDate
  ) {
    return Number.POSITIVE_INFINITY;
  }
  return reminder.shelfLifeDays - getElapsedDays(reminder.productionDate);
};

export const formatRemainingLife = (remainingDays: number) => {
  if (!Number.isFinite(remainingDays)) {
    return '';
  }
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
  shelfLifeDays?: number
) => {
  if (typeof shelfLifeDays === 'undefined' || shelfLifeDays === null) {
    return 100;
  }

  if (shelfLifeDays <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (remainingDays / shelfLifeDays) * 100));
};

export const sortByRemainingLife = (a: ReminderItem, b: ReminderItem) =>
  getRemainingDays(a) - getRemainingDays(b);

export const sortByPrice = (a: ReminderItem, b: ReminderItem) =>
  (b.price ?? 0) - (a.price ?? 0);

export const sortByName = (a: ReminderItem, b: ReminderItem) =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase());

export const sortByShelfLife = (a: ReminderItem, b: ReminderItem) =>
  (a.shelfLifeDays ?? Number.POSITIVE_INFINITY) - (b.shelfLifeDays ?? Number.POSITIVE_INFINITY);

export const sortByProductionDate = (a: ReminderItem, b: ReminderItem) =>
  (b.productionDate ? new Date(b.productionDate).getTime() : 0) -
  (a.productionDate ? new Date(a.productionDate).getTime() : 0);

export const sortByPurchaseDate = (a: ReminderItem, b: ReminderItem) =>
  // Handle undefined purchaseDate: treat undefined as older than any date (so it sorts last)
  (b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0) -
  (a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0);

export const sortByWastedAt = (a: ReminderItem, b: ReminderItem) =>
  (b.wastedAt ? new Date(b.wastedAt).getTime() : 0) -
  (a.wastedAt ? new Date(a.wastedAt).getTime() : 0);

export const sortByConsumedAt = (a: ReminderItem, b: ReminderItem) =>
  (b.consumedAt ? new Date(b.consumedAt).getTime() : 0) -
  (a.consumedAt ? new Date(a.consumedAt).getTime() : 0);

export const addDays = (date: Date, days: number) => {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
};

