import { useEffect, useState, useCallback } from 'react';
import type { FoodItem, Language } from '../types';
import { detectDishProvince, DISH_PROVINCES } from './foodFilters';

/**
 * Cambodian Food Passport: dishes the user marked "I tried it".
 * Stored ONLY under the new key `kft_v3_food_passport`. Never touches existing keys.
 */
export const FOOD_PASSPORT_KEY = 'kft_v3_food_passport';
const CHANGE_EVENT = 'kft:passport-changed';

export interface PassportStamp {
  foodId: string;
  stampedAt: string; // ISO date
}

function read(): PassportStamp[] {
  try {
    const raw = localStorage.getItem(FOOD_PASSPORT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.foodId === 'string');
  } catch {
    return [];
  }
}

function write(stamps: PassportStamp[]) {
  try {
    localStorage.setItem(FOOD_PASSPORT_KEY, JSON.stringify(stamps));
  } catch {
    // storage full / unavailable: ignore (stamp simply isn't saved)
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getPassportStamps(): PassportStamp[] {
  return read();
}

export function isStamped(foodId: string): boolean {
  return read().some((s) => s.foodId === foodId);
}

/** Toggle a stamp. Returns true when the dish is now stamped. */
export function togglePassportStamp(foodId: string): boolean {
  const stamps = read();
  const exists = stamps.some((s) => s.foodId === foodId);
  if (exists) {
    write(stamps.filter((s) => s.foodId !== foodId));
    return false;
  }
  write([...stamps, { foodId, stampedAt: new Date().toISOString() }]);
  return true;
}

/** React hook: live list of stamped dish ids. */
export function useFoodPassport() {
  const [stamps, setStamps] = useState<PassportStamp[]>(() => read());
  useEffect(() => {
    const refresh = () => setStamps(read());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const has = useCallback((id: string) => stamps.some((s) => s.foodId === id), [stamps]);
  return { stamps, has, count: stamps.length };
}

// ---------------- Levels & badges ----------------
export interface PassportLevel {
  min: number;
  emoji: string;
  titleKh: string;
  titleEn: string;
  titleZh: string;
}

export const PASSPORT_LEVELS: PassportLevel[] = [
  { min: 0, emoji: '🍚', titleKh: 'អ្នកថ្មីថ្មោង', titleEn: 'Rice Rookie', titleZh: '美食新手' },
  { min: 5, emoji: '🥢', titleKh: 'អ្នកភ្លក់ម្ហូប', titleEn: 'Curious Taster', titleZh: '好奇尝鲜者' },
  { min: 15, emoji: '🍜', titleKh: 'អ្នកស្វែងរកម្ហូប', titleEn: 'Flavor Explorer', titleZh: '风味探索家' },
  { min: 30, emoji: '🔥', titleKh: 'អ្នកជំនាញម្ហូបខ្មែរ', titleEn: 'Khmer Food Pro', titleZh: '高棉美食达人' },
  { min: 60, emoji: '👑', titleKh: 'ម្ចាស់ម្ហូបខ្មែរ', titleEn: 'Khmer Food Master', titleZh: '高棉美食大师' },
];

export function getPassportLevel(count: number): { level: PassportLevel; next: PassportLevel | null } {
  let level = PASSPORT_LEVELS[0];
  for (const l of PASSPORT_LEVELS) if (count >= l.min) level = l;
  const next = PASSPORT_LEVELS.find((l) => l.min > count) ?? null;
  return { level, next };
}

export interface PassportBadge {
  id: string;
  emoji: string;
  titleKh: string;
  titleEn: string;
  titleZh: string;
  have: number;
  total: number;
  unlocked: boolean;
}

const CATEGORY_BADGES: Array<{ slug: string; emoji: string; titleKh: string; titleEn: string; titleZh: string }> = [
  { slug: 'soup', emoji: '🍲', titleKh: 'អ្នកស្វែងរកសម្ល', titleEn: 'Soup Explorer', titleZh: '汤品探索者' },
  { slug: 'noodles', emoji: '🍜', titleKh: 'អ្នកប្រមាញ់មី/គុយទាវ', titleEn: 'Noodle Hunter', titleZh: '面条猎人' },
  { slug: 'grilled', emoji: '🔥', titleKh: 'អ្នកស្រលាញ់ម្ហូបអាំង', titleEn: 'Grill Master', titleZh: '烧烤达人' },
  { slug: 'dessert', emoji: '🍮', titleKh: 'អ្នកស្រលាញ់បង្អែម', titleEn: 'Sweet Tooth', titleZh: '甜品爱好者' },
];

/** A badge unlocks after tasting 3 dishes of a category (or all of it if it has fewer than 3). */
export function getPassportBadges(foods: FoodItem[], stamps: PassportStamp[]): PassportBadge[] {
  const stamped = new Set(stamps.map((s) => s.foodId));
  const badges: PassportBadge[] = [];

  for (const def of CATEGORY_BADGES) {
    const inCat = foods.filter((f) => f.categorySlug === def.slug);
    if (inCat.length === 0) continue;
    const have = inCat.filter((f) => stamped.has(f.id)).length;
    const need = Math.min(3, inCat.length);
    badges.push({ id: `cat-${def.slug}`, emoji: def.emoji, titleKh: def.titleKh, titleEn: def.titleEn, titleZh: def.titleZh, have, total: need, unlocked: have >= need });
  }

  // Province badges: 2 stamped dishes linked to a province (by name/description) unlock it.
  const byProvince = new Map<string, { total: number; have: number }>();
  for (const f of foods) {
    const pid = detectDishProvince(f);
    if (!pid) continue;
    const cur = byProvince.get(pid) ?? { total: 0, have: 0 };
    cur.total += 1;
    if (stamped.has(f.id)) cur.have += 1;
    byProvince.set(pid, cur);
  }
  for (const p of DISH_PROVINCES) {
    const cur = byProvince.get(p.id);
    if (!cur) continue;
    const need = Math.min(2, cur.total);
    badges.push({
      id: `prov-${p.id}`,
      emoji: '📍',
      titleKh: `${p.kh} អ្នកស្វែងរក`,
      titleEn: `${p.en} Explorer`,
      titleZh: `${p.zh}美食探索者`,
      have: cur.have,
      total: need,
      unlocked: cur.have >= need,
    });
  }
  return badges;
}

export function badgeTitle(b: PassportBadge, lang: Language): string {
  return lang === 'km' ? b.titleKh : lang === 'zh' ? b.titleZh : b.titleEn;
}
export function levelTitle(l: PassportLevel, lang: Language): string {
  return lang === 'km' ? l.titleKh : lang === 'zh' ? l.titleZh : l.titleEn;
}
