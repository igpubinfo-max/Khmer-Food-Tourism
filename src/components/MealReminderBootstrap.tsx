import { useEffect, useMemo, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useApp } from '../context/AppContext';
import { organizeAndDeduplicateFoods } from '../types';
import {
  addReminderTapListener,
  isReminderSupported,
  rescheduleMealReminders,
  MEAL_REMINDER_CHANGED_EVENT,
} from '../services/mealReminderService';

/**
 * Invisible controller for the meal-time reminders (native app only):
 *  - rebuilds the rolling 7-day plan on app open, when the app returns to the foreground, when the language or
 *    catalog changes, and when the user edits the reminder settings;
 *  - opens the suggested dish when the user taps a reminder.
 * It renders nothing and does no work on the web.
 */
export const MealReminderBootstrap: React.FC = () => {
  const { foods, language, setSelectedFood } = useApp();
  const catalog = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);
  const latest = useRef({ catalog, language, setSelectedFood });
  latest.current = { catalog, language, setSelectedFood };
  const pendingFoodId = useRef<string | null>(null);

  // (Re)schedule: debounced so startup work is never delayed and bursts collapse into one run.
  const lastScheduledAtRef = useRef(0);
  useEffect(() => {
    if (!isReminderSupported() || catalog.length === 0) return;
    const run = (force = false) => {
      if (!force && Date.now() - lastScheduledAtRef.current < 30 * 60 * 1000) return;
      lastScheduledAtRef.current = Date.now();
      void rescheduleMealReminders(latest.current.catalog, latest.current.language);
    };
    const timer = setTimeout(() => run(true), 2500);

    let removeAppListener: (() => void) | null = null;
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) run(false);
    })
      .then((h) => {
        removeAppListener = () => void h.remove();
      })
      .catch(() => undefined);

    const onSettingsChanged = () => run(true);
    window.addEventListener(MEAL_REMINDER_CHANGED_EVENT, onSettingsChanged);

    return () => {
      clearTimeout(timer);
      removeAppListener?.();
      window.removeEventListener(MEAL_REMINDER_CHANGED_EVENT, onSettingsChanged);
    };
    // Only the size of the catalog matters for planning; identity changes would just cause redundant runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.length, language]);

  // Tap on a reminder -> open that dish (kept until the catalog is available on a cold start).
  // Registered once; the latest catalog / setter are read through a ref so the listener is never re-created.
  useEffect(() => {
    if (!isReminderSupported()) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    void addReminderTapListener((foodId) => {
      const food = latest.current.catalog.find((f) => f.id === foodId);
      if (food) latest.current.setSelectedFood(food);
      else pendingFoodId.current = foodId;
    }).then((off) => {
      if (cancelled) off();
      else unsubscribe = off;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const id = pendingFoodId.current;
    if (!id || catalog.length === 0) return;
    const food = catalog.find((f) => f.id === id);
    if (food) {
      pendingFoodId.current = null;
      latest.current.setSelectedFood(food);
    }
  }, [catalog]);

  return null;
};
