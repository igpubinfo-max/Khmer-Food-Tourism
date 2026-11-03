import type { FoodItem, Language } from '../types';
import { isGeneratedDishId, hasRenderablePhoto } from './generatedDish';
import {
  getPassportBadges,
  getPassportLevel,
  type PassportBadge,
  type PassportLevel,
  type PassportStamp,
} from './foodPassport';

/**
 * Daily-habit helpers: visit streak, shared "Dish of the Day" and the "next goal" nudge.
 *
 * Storage: ONE new, tiny key (`kft_v3_daily_streak`). It never reads or writes accounts, photos, bookmarks,
 * wishlists or any vault key, so it is safe across app updates (same rule as the Food Passport).
 * All logic is pure / deterministic where possible so it can be unit-tested without a browser.
 */
export const DAILY_STREAK_KEY = 'kft_v3_daily_streak';
export const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 30, 60, 100, 365];

export interface StreakState {
  /** Consecutive days the app was opened (today included). */
  current: number;
  longest: number;
  /** Local calendar day of the last visit, `YYYY-MM-DD`. */
  lastDay: string;
  /** Total distinct days the app was opened. */
  totalDays: number;
}

export interface StreakUpdate {
  state: StreakState;
  isNewDay: boolean;
  /** Set only on the visit that reaches a milestone (3, 7, 14, 30 ...). */
  milestone: number | null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local calendar day key (the user's own midnight, not UTC). */
export function toLocalDayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Whole days from `a` to `b` (both `YYYY-MM-DD`). Uses UTC math so DST / month ends never skew it. */
export function dayDiff(a: string, b: string): number {
  const parse = (k: string) => {
    const [y, m, d] = k.split('-').map((x) => parseInt(x, 10));
    return Date.UTC(y, (m || 1) - 1, d || 1);
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

/** Pure streak transition. A missed day resets to 1; a clock moved backwards never destroys progress. */
export function computeNextStreak(prev: StreakState | null, today: string): StreakUpdate {
  if (!prev || !prev.lastDay) {
    return { state: { current: 1, longest: 1, lastDay: today, totalDays: 1 }, isNewDay: true, milestone: null };
  }
  const diff = dayDiff(prev.lastDay, today);
  if (diff <= 0) {
    return { state: prev, isNewDay: false, milestone: null };
  }
  const current = diff === 1 ? prev.current + 1 : 1;
  const state: StreakState = {
    current,
    longest: Math.max(prev.longest, current),
    lastDay: today,
    totalDays: prev.totalDays + 1,
  };
  return {
    state,
    isNewDay: true,
    milestone: diff === 1 && STREAK_MILESTONES.includes(current) ? current : null,
  };
}

function readStreak(): StreakState | null {
  try {
    const raw = localStorage.getItem(DAILY_STREAK_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StreakState>;
    if (!p || typeof p.lastDay !== 'string') return null;
    return {
      current: Math.max(1, Number(p.current) || 1),
      longest: Math.max(1, Number(p.longest) || 1),
      lastDay: p.lastDay,
      totalDays: Math.max(1, Number(p.totalDays) || 1),
    };
  } catch {
    return null;
  }
}

export function getDailyStreak(): StreakState | null {
  return readStreak();
}

/** Record today's visit (idempotent within a day). Never throws. */
export function touchDailyStreak(now: Date = new Date()): StreakUpdate {
  const update = computeNextStreak(readStreak(), toLocalDayKey(now));
  if (update.isNewDay) {
    try {
      localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify(update.state));
    } catch {
      // storage unavailable: streak simply is not persisted
    }
  }
  return update;
}

/* ------------------------------- Dish of the Day ------------------------------- */

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * One dish per calendar day, identical for everyone who has the same catalog, so people can talk about it
 * ("did you see today's dish?"). Input order never matters (sorted by id first).
 */
export function pickDishOfTheDay(foods: FoodItem[], dayKey: string = toLocalDayKey()): FoodItem | null {
  const eligible = foods
    .filter((f) => f && f.id && f.nameKh && !isGeneratedDishId(f.id) && hasRenderablePhoto(f.photoUrl))
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  if (eligible.length === 0) return null;
  return eligible[fnv1a(`kft-dish-of-the-day:${dayKey}`) % eligible.length];
}

/* --------------------------------- Next goal ---------------------------------- */

export type NextGoal =
  | { kind: 'badge'; badge: PassportBadge; remaining: number }
  | { kind: 'level'; next: PassportLevel; remaining: number }
  | { kind: 'complete' };

/** The closest reachable reward: a badge that is nearly unlocked, or the next level. */
export function getNextGoal(foods: FoodItem[], stamps: PassportStamp[]): NextGoal {
  const count = stamps.length;
  const { next } = getPassportLevel(count);
  const levelRemaining = next ? next.min - count : Infinity;

  let bestBadge: PassportBadge | null = null;
  for (const b of getPassportBadges(foods, stamps)) {
    if (b.unlocked || b.have <= 0) continue;
    const rem = b.total - b.have;
    if (!bestBadge || rem < bestBadge.total - bestBadge.have) bestBadge = b;
  }
  const badgeRemaining = bestBadge ? bestBadge.total - bestBadge.have : Infinity;

  if (bestBadge && badgeRemaining <= levelRemaining) {
    return { kind: 'badge', badge: bestBadge, remaining: badgeRemaining };
  }
  if (next) return { kind: 'level', next, remaining: levelRemaining };
  return { kind: 'complete' };
}

/* ---------------------------------- Sharing ----------------------------------- */

export function buildPassportShareText(
  lang: Language,
  opts: { count: number; total: number; levelTitle: string; streak: number }
): string {
  const { count, total, levelTitle, streak } = opts;
  const streakKm = streak > 1 ? ` • ${streak} ថ្ងៃជាប់ៗគ្នា` : '';
  const streakEn = streak > 1 ? ` • ${streak}-day streak` : '';
  const streakZh = streak > 1 ? ` • 连续 ${streak} 天` : '';
  if (lang === 'km') {
    return `ខ្ញុំបានភ្លក់ម្ហូបខ្មែរ ${count}/${total} មុខ ហើយ! កម្រិត៖ ${levelTitle}${streakKm}\nមកសាកល្បងជាមួយខ្ញុំក្នុង «រសជាតិ និងទេសចរណ៍កម្ពុជា»។`;
  }
  if (lang === 'zh') {
    return `我已品尝 ${count}/${total} 道高棉美食！等级：${levelTitle}${streakZh}\n来「柬埔寨风味与旅游」和我一起探索吧。`;
  }
  return `I've tasted ${count}/${total} Khmer dishes! Level: ${levelTitle}${streakEn}\nJoin me on "Cambodia Flavors & Tourism".`;
}
