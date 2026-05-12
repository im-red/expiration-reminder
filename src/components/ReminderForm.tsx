import React, { useEffect, useMemo, useState } from 'react';
import { IonList, IonItem, IonInput, IonButton, IonText } from '@ionic/react';
import { ReminderFormValues } from '../models/reminder';

interface ReminderFormProps {
  defaultValues?: ReminderFormValues;
  onSubmit: (values: ReminderFormValues) => Promise<void> | void;
  submitLabel?: string;
  selectedCategory?: string;
}

const ReminderForm: React.FC<ReminderFormProps> = ({
  defaultValues,
  onSubmit,
  submitLabel = 'Save reminder',
  selectedCategory,
}) => {
  const getTodayLocal = () => {
    const d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  };

  const [name, setName] = useState(defaultValues?.name ?? '');
  const [category, setCategory] = useState(defaultValues?.category ?? (selectedCategory ?? ''));
  const [productionDate, setProductionDate] = useState(defaultValues?.productionDate ?? '');
  const [purchaseDate, setPurchaseDate] = useState<string | undefined>(
    defaultValues?.purchaseDate ?? (defaultValues ? undefined : getTodayLocal())
  );
  const [shelfLifeDays, setShelfLifeDays] = useState(defaultValues?.shelfLifeDays?.toString() ?? '');
  const [price, setPrice] = useState(defaultValues?.price?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const maxDate = getTodayLocal();

  useEffect(() => {
    if (!defaultValues) return;
    setName(defaultValues.name);
    setCategory(defaultValues.category ?? '');
    setProductionDate(defaultValues.productionDate ?? '');
    setPurchaseDate(defaultValues.purchaseDate ?? undefined);
    setShelfLifeDays(defaultValues.shelfLifeDays?.toString() ?? '');
    setPrice(defaultValues.price?.toString() ?? '');
  }, [defaultValues]);

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!shelfLifeDays) return true;
    const life = Number(shelfLifeDays);
    return Number.isFinite(life) && life > 0;
  }, [name, shelfLifeDays]);

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Please fill in all fields with valid information.');
      return;
    }

    setError(null);

    await onSubmit({
      name: name.trim(),
      category: category.trim(),
      productionDate: productionDate || undefined,
      purchaseDate: purchaseDate || getTodayLocal(),
      shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : undefined,
      price: price ? Number(price) : undefined
    });

    if (!defaultValues) {
      setName('');
      setCategory('');
      setProductionDate('');
      setPurchaseDate(getTodayLocal());
      setShelfLifeDays('');
      setPrice('');
    }
  };

  return (
    <>
      <IonList className="edge-to-edge">
        <IonItem>
          <IonInput
            label="Name"
            labelPlacement="stacked"
            placeholder="Homemade kombucha"
            value={name}
            onIonInput={e => setName(e.detail.value ?? '')}
            required
          />
        </IonItem>

        <IonItem>
          <IonInput
            label="Category (optional)"
            labelPlacement="stacked"
            placeholder="Dairy / Meal prep / etc."
            value={category}
            onIonInput={e => setCategory(e.detail.value ?? '')}
          />
        </IonItem>

        <IonItem>
          <IonInput
            label="Production date"
            labelPlacement="stacked"
            type="date"
            value={productionDate}
            onIonInput={e => setProductionDate(e.detail.value ?? '')}
            max={maxDate}
          />
        </IonItem>

        <IonItem>
          <IonInput
            label="Purchase date (optional)"
            labelPlacement="stacked"
            type="date"
            value={purchaseDate ?? ''}
            onIonInput={e => setPurchaseDate(e.detail.value ?? '')}
            max={maxDate}
          />
        </IonItem>

        <IonItem>
          <IonInput
            label="Shelf life (days) (optional)"
            labelPlacement="stacked"
            type="number"
            min={1}
            placeholder="30"
            value={shelfLifeDays}
            onIonInput={e => setShelfLifeDays(e.detail.value ?? '')}
          />
        </IonItem>

        <IonItem>
          <IonInput
            label="Price (optional)"
            labelPlacement="stacked"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={price}
            onIonInput={e => setPrice(e.detail.value ?? '')}
          />
        </IonItem>
      </IonList>

      {error && (
        <IonText color="danger" className="ion-padding-horizontal">
          <p>{error}</p>
        </IonText>
      )}

      <div>
        <IonButton expand="block" onClick={handleSubmit} disabled={!isValid}>
          {submitLabel}
        </IonButton>
      </div>
    </>
  );
};

export default ReminderForm;