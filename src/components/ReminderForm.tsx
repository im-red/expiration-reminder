import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ReminderFormValues } from '../types/reminder';

interface ReminderFormProps {
  defaultValues?: ReminderFormValues;
  onSubmit: (values: ReminderFormValues) => Promise<void> | void;
  submitLabel?: string;
  title?: string;
  subtitle?: string;
}

const ReminderForm = ({
  defaultValues,
  onSubmit,
  submitLabel = 'Save reminder',
  title,
  subtitle
}: ReminderFormProps) => {
  const [name, setName] = useState(defaultValues?.name ?? '');
  const [category, setCategory] = useState(defaultValues?.category ?? '');
  const [productionDate, setProductionDate] = useState(
    defaultValues?.productionDate ?? ''
  );
  const [shelfLifeDays, setShelfLifeDays] = useState(
    defaultValues?.shelfLifeDays?.toString() ?? ''
  );
  const [price, setPrice] = useState(defaultValues?.price?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const todayLocal = new Date();
  const maxDate = todayLocal.getFullYear() + '-' +
    String(todayLocal.getMonth() + 1).padStart(2, '0') + '-' +
    String(todayLocal.getDate()).padStart(2, '0');

  useEffect(() => {
    if (!defaultValues) {
      return;
    }

    setName(defaultValues.name);
    setCategory(defaultValues.category ?? '');
    setProductionDate(defaultValues.productionDate);
    setShelfLifeDays(defaultValues.shelfLifeDays.toString());
    setPrice(defaultValues.price?.toString() ?? '');
  }, [defaultValues]);

  const isValid = useMemo(() => {
    if (!name.trim() || !productionDate || !shelfLifeDays) {
      return false;
    }

    const life = Number(shelfLifeDays);
    return Number.isFinite(life) && life > 0;
  }, [name, productionDate, shelfLifeDays]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValid) {
      setError('Please fill in all fields with valid information.');
      return;
    }

    setError(null);

    await onSubmit({
      name: name.trim(),
      category: category.trim(),
      productionDate,
      shelfLifeDays: Number(shelfLifeDays),
      price: price ? Number(price) : undefined
    });

    if (!defaultValues) {
      setName('');
      setCategory('');
      setProductionDate('');
      setShelfLifeDays('');
      setPrice('');
    }
  };

  const heading = title ?? (defaultValues ? 'Edit reminder' : 'Add reminder');
  const helperText =
    subtitle ??
    (defaultValues
      ? 'Update the freshness metadata below.'
      : 'Enter the production date and shelf life to start tracking.');

  return (
    <form className="card reminder-form" onSubmit={handleSubmit}>
      <div className="card-header">
        <h2>{heading}</h2>
        <p>{helperText}</p>
      </div>

      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Homemade kombucha"
          value={name}
          onChange={event => setName(event.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="category">Category (optional)</label>
        <input
          id="category"
          name="category"
          type="text"
          placeholder="Dairy / Meal prep / etc."
          value={category}
          onChange={event => setCategory(event.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="productionDate">Production date</label>
        <input
          id="productionDate"
          name="productionDate"
          type="date"
          value={productionDate}
          onChange={event => setProductionDate(event.target.value)}
          max={maxDate}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="shelfLifeDays">Shelf life (days)</label>
        <input
          id="shelfLifeDays"
          name="shelfLifeDays"
          type="number"
          min={1}
          placeholder="10"
          value={shelfLifeDays}
          onChange={event => setShelfLifeDays(event.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="price">Price (optional)</label>
        <input
          id="price"
          name="price"
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={price}
          onChange={event => setPrice(event.target.value)}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="btn-primary" type="submit" disabled={!isValid}>
        {submitLabel}
      </button>
    </form>
  );
};

export default ReminderForm;

