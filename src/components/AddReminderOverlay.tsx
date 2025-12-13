import { useEffect } from 'react';
import ReminderForm from './ReminderForm';
import { ReminderFormValues } from '../types/reminder';

interface AddReminderOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ReminderFormValues) => Promise<void> | void;
  selectedCategory?: string;
}

const AddReminderOverlay = ({ isOpen, onClose, onSubmit, selectedCategory }: AddReminderOverlayProps) => {
  console.log('selectedCategory', selectedCategory);
  useEffect(() => {
    console.log('isOpen changed:', isOpen);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (values: ReminderFormValues) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <div className="overlay">
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="overlay-panel">
        <div className="overlay-header">
          <button type="button" className="overlay-back" onClick={onClose}>
            &lt; Back
          </button>
        </div>
        <ReminderForm
          onSubmit={handleSubmit}
          submitLabel="Add reminder"
          title="Add reminder"
          subtitle="Capture the basics so we can track freshness for you."
          selectedCategory={selectedCategory}
        />
      </div>
    </div>
  );
};

export default AddReminderOverlay;

