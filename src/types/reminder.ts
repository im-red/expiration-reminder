export interface ReminderFormValues {
  name: string;
  category: string;
  productionDate: string;
  shelfLifeDays: number;
}

export interface ReminderItem extends ReminderFormValues {
  id: string;
  archived: boolean;
  archivedAt?: string | null;
}

export type ReminderUpdate = Partial<Omit<ReminderItem, 'id'>>;

export interface ReminderFilter {
  category: string;
}

