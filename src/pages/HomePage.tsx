import React, { useState, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonActionSheet,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { add, swapVertical, timeOutline, alertCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { useApp, ActiveSort, WastedSort, ConsumedSort } from '../data/AppContext';
import CategoryFilter from '../components/CategoryFilter';
import ReminderList from '../components/ReminderList';
import AddReminderOverlay from '../components/AddReminderOverlay';
import ReminderDetailOverlay from '../components/ReminderDetailOverlay';
import { ReminderItem } from '../models/reminder';
import clsx from 'clsx';
import './HomePage.scss';

const VIEW_MODES = ['active', 'consumed', 'wasted'] as const;
type ViewMode = typeof VIEW_MODES[number];

const HomePage: React.FC = () => {
  const {
    activeReminders,
    wastedReminders,
    consumedReminders,
    sortState,
    setSortState,
    sortRemindersByKey,
  } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  const filteredActiveReminders = useMemo(() => {
    if (!selectedCategory) return activeReminders;
    return activeReminders.filter(r => r.category === selectedCategory);
  }, [activeReminders, selectedCategory]);

  const filteredWastedReminders = useMemo(() => {
    if (!selectedCategory) return wastedReminders;
    return wastedReminders.filter(r => r.category === selectedCategory);
  }, [wastedReminders, selectedCategory]);

  const filteredConsumedReminders = useMemo(() => {
    if (!selectedCategory) return consumedReminders;
    return consumedReminders.filter(r => r.category === selectedCategory);
  }, [consumedReminders, selectedCategory]);

  const categories = useMemo(() => {
    let source: ReminderItem[] = [];
    if (viewMode === 'active') source = activeReminders;
    else if (viewMode === 'wasted') source = wastedReminders;
    else if (viewMode === 'consumed') source = consumedReminders;
    const unique = Array.from(
      new Set(source.map(r => r.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return unique;
  }, [viewMode, activeReminders, wastedReminders, consumedReminders]);

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

  const getSortOptions = () => {
    if (viewMode === 'active') {
      return [
        { key: 'remaining', text: 'Remaining life', handler: () => handleSortSelect('remaining') },
        { key: 'price', text: 'Price', handler: () => handleSortSelect('price') },
        { key: 'name', text: 'Name', handler: () => handleSortSelect('name') },
        { key: 'shelfLife', text: 'Shelf life', handler: () => handleSortSelect('shelfLife') },
        { key: 'productionDate', text: 'Production date', handler: () => handleSortSelect('productionDate') },
        { key: 'purchaseDate', text: 'Purchase date', handler: () => handleSortSelect('purchaseDate') },
      ];
    }
    if (viewMode === 'wasted') {
      return [
        { key: 'wastedAt', text: 'Wasted date', handler: () => handleSortSelect('wastedAt') },
        { key: 'price', text: 'Price', handler: () => handleSortSelect('price') },
        { key: 'name', text: 'Name', handler: () => handleSortSelect('name') },
      ];
    }
    return [
      { key: 'consumedAt', text: 'Consumed date', handler: () => handleSortSelect('consumedAt') },
      { key: 'price', text: 'Price', handler: () => handleSortSelect('price') },
      { key: 'name', text: 'Name', handler: () => handleSortSelect('name') },
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
    return current?.text ?? 'Sort';
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

  const totalPrice = useMemo(() => {
    return displayedReminders.reduce((sum, r) => sum + (r.price ?? 0), 0);
  }, [displayedReminders]);

  const activeReminder = useMemo(
    () => displayedReminders.find(r => r.id === activeReminderId) ?? null,
    [activeReminderId, displayedReminders]
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Expiration Reminder</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Expiration Reminder</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="view-switch">
          <IonCard
            button
            className={clsx('view-switch__card', { active: viewMode === 'active' })}
            onClick={() => { setViewMode('active'); setSelectedCategory(''); }}
          >
            <IonCardContent>
              <div className="view-switch__content">
                <IonIcon icon={timeOutline} className="view-switch__icon" />
                <span className="view-switch__count">{activeReminders.length}</span>
              </div>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className={clsx('view-switch__card', { active: viewMode === 'consumed' })}
            onClick={() => { setViewMode('consumed'); setSelectedCategory(''); }}
          >
            <IonCardContent>
              <div className="view-switch__content">
                <IonIcon icon={checkmarkCircleOutline} className="view-switch__icon" />
                <span className="view-switch__count">{consumedReminders.length}</span>
              </div>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className={clsx('view-switch__card', { active: viewMode === 'wasted' })}
            onClick={() => { setViewMode('wasted'); setSelectedCategory(''); }}
          >
            <IonCardContent>
              <div className="view-switch__content">
                <IonIcon icon={alertCircleOutline} className="view-switch__icon" />
                <span className="view-switch__count">{wastedReminders.length}</span>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        {(viewMode !== 'active' || categories.length > 0) && (
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onChange={setSelectedCategory}
          />
        )}

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
          onSelect={r => setActiveReminderId(r.id)}
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

        {viewMode === 'active' && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => setIsOverlayOpen(true)}>
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}

        <IonActionSheet
          isOpen={isSortSheetOpen}
          onDidDismiss={() => setIsSortSheetOpen(false)}
          header="Sort by"
          buttons={[
            ...getSortOptions().map(opt => ({
              text: opt.text + (opt.key === getCurrentSortKey() ? ' ✓' : ''),
              handler: opt.handler
            })),
            { text: 'Cancel', role: 'cancel' }
          ]}
        />

        <AddReminderOverlay
          isOpen={isOverlayOpen}
          onClose={() => setIsOverlayOpen(false)}
          selectedCategory={selectedCategory}
        />

        <ReminderDetailOverlay
          reminder={activeReminder}
          isOpen={Boolean(activeReminder)}
          onClose={() => setActiveReminderId(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default HomePage;