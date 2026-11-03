import type { FoodItem, Language } from '../types';
import { getAuthenticCambodianDishesForMealTime, type CambodianMealTime } from './cambodianMealHabits';
import { isGeneratedDishId } from './generatedDish';
import { getLocalizedFood } from './zhDynamicTranslator';

/**
 * Pure planning logic for the daily meal-time reminders (no Capacitor / no storage here, so it is unit-testable).
 *
 * Why a rolling 7-day plan instead of one repeating notification?
 *  - every reminder can name a DIFFERENT authentic Khmer dish for that meal (a fixed repeating text gets ignored),
 *  - the plan is rebuilt on every app open, so a user who stops using the app is not nagged forever.
 */
export type ReminderSlot = CambodianMealTime;
export const REMINDER_SLOTS: readonly ReminderSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export interface ReminderSlotSetting {
  on: boolean;
  /** Local time, `HH:MM` (24h). */
  time: string;
}

export interface MealReminderSettings {
  enabled: boolean;
  slots: Record<ReminderSlot, ReminderSlotSetting>;
}

/** Typical Cambodian eating rhythm: early breakfast, lunch before the midday heat, light afternoon snack, early dinner. */
export const DEFAULT_REMINDER_SETTINGS: MealReminderSettings = {
  enabled: false,
  slots: {
    breakfast: { on: true, time: '07:00' },
    lunch: { on: true, time: '11:30' },
    snack: { on: false, time: '15:30' },
    dinner: { on: true, time: '17:30' },
  },
};

/** Notification ids owned by this feature live in [BASE, BASE + 1000) so we can cancel exactly ours and nothing else. */
export const REMINDER_ID_BASE = 710000;
export const REMINDER_ID_RANGE = 1000;
export const REMINDER_WINDOW_DAYS = 7;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidReminderTime(t: unknown): t is string {
  return typeof t === 'string' && TIME_RE.test(t);
}

/** Never trust stored data: unknown shape -> defaults, bad time -> that slot's default. */
export function sanitizeReminderSettings(raw: unknown): MealReminderSettings {
  const base = DEFAULT_REMINDER_SETTINGS;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<MealReminderSettings>;
  const slots = {} as Record<ReminderSlot, ReminderSlotSetting>;
  for (const s of REMINDER_SLOTS) {
    const given = (r.slots && typeof r.slots === 'object' ? (r.slots as Record<string, any>)[s] : null) || {};
    slots[s] = {
      on: typeof given.on === 'boolean' ? given.on : base.slots[s].on,
      time: isValidReminderTime(given.time) ? given.time : base.slots[s].time,
    };
  }
  return { enabled: r.enabled === true, slots };
}

export interface PlannedReminder {
  id: number;
  slot: ReminderSlot;
  at: Date;
  title: string;
  body: string;
  foodId: string;
}

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const dayKeyOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const TITLES: Record<ReminderSlot, [string, string, string]> = {
  breakfast: ['🍜 អាហារពេលព្រឹកនេះ ញ៉ាំអ្វីល្អ?', '🍜 Breakfast idea for today', '🍜 今天的早餐推荐'],
  lunch: ['🍛 ម៉ោងបាយថ្ងៃត្រង់ហើយ!', "🍛 It's lunchtime!", '🍛 午餐时间到了！'],
  snack: ['🍮 ម៉ោងញ៉ាំស្រាលៗពេលរសៀល', '🍮 Afternoon snack time', '🍮 下午茶时间'],
  dinner: ['🍲 អាហារពេលល្ងាចនេះ ញ៉ាំអ្វីល្អ?', '🍲 Dinner idea for tonight', '🍲 今晚的晚餐推荐'],
};

export function reminderTitle(slot: ReminderSlot, lang: Language): string {
  const [km, en, zh] = TITLES[slot];
  return lang === 'km' ? km : lang === 'zh' ? zh : en;
}

function reminderBody(name: string, category: string, lang: Language): string {
  const tail = category ? ` (${category})` : '';
  if (lang === 'km') return `ណែនាំ៖ ${name}${tail} — ចុចមើលរូបមន្ត និងព័ត៌មានលម្អិត`;
  if (lang === 'zh') return `推荐：${name}${tail} — 点击查看做法与详情`;
  return `Try: ${name}${tail} — tap for the recipe and details`;
}

export interface PlanInput {
  settings: MealReminderSettings;
  foods: FoodItem[];
  language: Language;
  now?: Date;
  windowDays?: number;
}

/**
 * Build the upcoming reminders. Deterministic for the same inputs. Only future times are returned; a dish is never
 * repeated on the same day or for the same meal on consecutive days.
 */
export function planMealReminders(input: PlanInput): PlannedReminder[] {
  const { language } = input;
  const settings = sanitizeReminderSettings(input.settings);
  if (!settings.enabled) return [];
  const now = input.now ?? new Date();
  const windowDays = Math.max(1, Math.min(14, input.windowDays ?? REMINDER_WINDOW_DAYS));
  const catalog = input.foods.filter((f) => f && f.id && !isGeneratedDishId(f.id));

  const pools = new Map<ReminderSlot, FoodItem[]>();
  for (const slot of REMINDER_SLOTS) {
    if (!settings.slots[slot].on) continue;
    pools.set(slot, getAuthenticCambodianDishesForMealTime(catalog, slot));
  }

  const out: PlannedReminder[] = [];
  const previousDishBySlot = new Map<ReminderSlot, string>();

  for (let offset = 0; offset < windowDays; offset++) {
    const usedToday = new Set<string>();
    REMINDER_SLOTS.forEach((slot, slotIndex) => {
      const cfg = settings.slots[slot];
      const pool = pools.get(slot);
      if (!cfg.on || !pool || pool.length === 0) return;

      const [hh, mm] = cfg.time.split(':').map((x) => parseInt(x, 10));
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hh, mm, 0, 0);
      const dayKey = dayKeyOf(at);

      // Pick the dish first (so the "previous dish" chain stays consistent even for skipped past times).
      let idx = fnv1a(`kft-reminder:${dayKey}:${slot}`) % pool.length;
      for (let tries = 0; tries < pool.length; tries++) {
        const cand = pool[(idx + tries) % pool.length];
        if (!usedToday.has(cand.id) && cand.id !== previousDishBySlot.get(slot)) {
          idx = (idx + tries) % pool.length;
          break;
        }
      }
      const dish = pool[idx];
      usedToday.add(dish.id);
      previousDishBySlot.set(slot, dish.id);

      if (at.getTime() <= now.getTime() + 60_000) return; // already (almost) due: skip, never fire instantly

      const loc = getLocalizedFood(dish, language);
      out.push({
        id: REMINDER_ID_BASE + offset * 10 + slotIndex,
        slot,
        at,
        title: reminderTitle(slot, language),
        body: reminderBody(loc.name || dish.nameKh, loc.category || '', language),
        foodId: dish.id,
      });
    });
  }
  return out;
}

export function isReminderId(id: number): boolean {
  return id >= REMINDER_ID_BASE && id < REMINDER_ID_BASE + REMINDER_ID_RANGE;
}
