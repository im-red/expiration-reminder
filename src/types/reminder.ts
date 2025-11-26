export interface ReminderFormValues {
  name: string;
  category: string;
  productionDate: string;
  shelfLifeDays: number;
  price?: number;
}

export interface ReminderItem extends ReminderFormValues {
  id: string;
  wasted: boolean;
  wastedAt?: string | null;
  consumed: boolean;
  consumedAt?: string | null;
}

export type ReminderUpdate = Partial<Omit<ReminderItem, 'id'>>;

export interface ReminderFilter {
  category: string;
}

