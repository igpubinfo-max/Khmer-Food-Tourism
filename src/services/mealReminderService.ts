import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { FoodItem, Language } from '../types';
import {
  DEFAULT_REMINDER_SETTINGS,
  REMINDER_ID_BASE,
  REMINDER_ID_RANGE,
  isReminderId,
  planMealReminders,
  sanitizeReminderSettings,
  type MealReminderSettings,
} from '../utils/mealReminderPlan';

/**
 * Daily meal-time reminders (Capacitor Local Notifications). Everything stays on the device:
 * settings live under ONE new key and no personal data is sent anywhere.
 *
 * Rules that keep this feature respectful:
 *  - the OS permission is asked only when the user turns reminders on (never at launch),
 *  - reminders are inexact (battery friendly) and never open the system "Alarms & reminders" screen,
 *  - a rolling 7-day plan is rebuilt on each app open, so inactive users stop receiving reminders.
 */
export const MEAL_REMINDER_SETTINGS_KEY = 'kft_v3_meal_reminders';
export const MEAL_REMINDER_CHANGED_EVENT = 'kft:meal-reminders-changed';
export const MEAL_REMINDER_CHANNEL_ID = 'meal-reminders';
const SMALL_ICON = 'ic_stat_meal';
const ICON_COLOR = '#064E3B';

export type ReminderPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function isReminderSupported(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getReminderSettings(): MealReminderSettings {
  try {
    const raw = localStorage.getItem(MEAL_REMINDER_SETTINGS_KEY);
    return raw ? sanitizeReminderSettings(JSON.parse(raw)) : sanitizeReminderSettings(DEFAULT_REMINDER_SETTINGS);
  } catch {
    return sanitizeReminderSettings(DEFAULT_REMINDER_SETTINGS);
  }
}

export function saveReminderSettings(settings: MealReminderSettings): MealReminderSettings {
  const clean = sanitizeReminderSettings(settings);
  try {
    localStorage.setItem(MEAL_REMINDER_SETTINGS_KEY, JSON.stringify(clean));
  } catch {
    // storage unavailable: settings simply are not persisted
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MEAL_REMINDER_CHANGED_EVENT));
  return clean;
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!isReminderSupported()) return 'unsupported';
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return 'granted';
    if (display === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unsupported';
  }
}

async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!isReminderSupported()) return 'unsupported';
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

async function ensureChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: MEAL_REMINDER_CHANNEL_ID,
      name: 'Meal reminders • ការរំលឹកម្ហូប',
      description: 'Daily Khmer meal-time dish suggestions',
      importance: 3,
      visibility: 1,
      vibration: false,
    });
  } catch {
    // channel already exists / not supported: scheduling still works with the default channel
  }
}

async function cancelOwnedReminders(): Promise<void> {
  try {
    const { notifications } = await LocalNotifications.getPending();
    const mine = notifications.filter((n) => isReminderId(n.id)).map((n) => ({ id: n.id }));
    if (mine.length > 0) await LocalNotifications.cancel({ notifications: mine });
  } catch {
    // nothing pending / plugin unavailable
  }
}

// Serialize (re)scheduling so app-open + resume + settings edits can never interleave cancel/schedule calls.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Rebuild the pending reminders from the saved settings. Returns how many were scheduled.
 * Safe to call at any time (no-op on web, when disabled, or when the OS permission is not granted).
 */
export function rescheduleMealReminders(
  foods: FoodItem[],
  language: Language,
  now: Date = new Date()
): Promise<number> {
  return enqueue(async () => {
    if (!isReminderSupported()) return 0;
    const settings = getReminderSettings();
    await cancelOwnedReminders();
    if (!settings.enabled) return 0;
    if ((await getReminderPermission()) !== 'granted') return 0;

    const plan = planMealReminders({ settings, foods, language, now });
    if (plan.length === 0) return 0;
    await ensureChannel();
    try {
      await LocalNotifications.schedule({
        notifications: plan.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          channelId: MEAL_REMINDER_CHANNEL_ID,
          smallIcon: SMALL_ICON,
          iconColor: ICON_COLOR,
          autoCancel: true,
          // Inexact on purpose: no SCHEDULE_EXACT_ALARM prompt, better battery, a few minutes of drift is fine for meals.
          isExactNotification: false,
          schedule: { at: p.at, allowWhileIdle: true },
          extra: { foodId: p.foodId, slot: p.slot },
        })),
      });
      return plan.length;
    } catch {
      return 0;
    }
  });
}

export interface EnableResult {
  ok: boolean;
  reason?: 'denied' | 'unsupported';
}

/** Turn reminders on (asks for the OS permission now, in context) and schedule them. */
export async function enableMealReminders(foods: FoodItem[], language: Language): Promise<EnableResult> {
  if (!isReminderSupported()) return { ok: false, reason: 'unsupported' };
  let permission = await getReminderPermission();
  if (permission !== 'granted') permission = await requestReminderPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };
  saveReminderSettings({ ...getReminderSettings(), enabled: true });
  await rescheduleMealReminders(foods, language);
  return { ok: true };
}

export async function disableMealReminders(): Promise<void> {
  saveReminderSettings({ ...getReminderSettings(), enabled: false });
  await enqueue(() => cancelOwnedReminders());
}

/** Calls `handler` with the dish id when the user taps a reminder. Returns an unsubscribe function. */
export async function addReminderTapListener(handler: (foodId: string) => void): Promise<() => void> {
  if (!isReminderSupported()) return () => undefined;
  try {
    const handle = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const id = event?.notification?.id;
      const foodId = event?.notification?.extra?.foodId;
      if (typeof id === 'number' && isReminderId(id) && typeof foodId === 'string' && foodId) handler(foodId);
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}

export { REMINDER_ID_BASE, REMINDER_ID_RANGE };
