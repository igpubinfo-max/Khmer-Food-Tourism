/**
 * Trial Win-Back Local Notifications (Android & Web ONLY; strictly skipped on iOS).
 *
 * Schedules two gentle local notifications for a user who activated the 7-Day Free Trial:
 *  - ID 880001 (Day 6, 24h before trial expiry): Friendly heads-up that 1 day remains in their free trial,
 *    plus reassurance that core browsing & maps remain 100% FREE forever.
 *  - ID 880002 (Day 8, 24h after trial expiry): Lets the user know they unlocked the 1-time $0.99 / 30-day
 *    Win-Back offer (or $6.99 / 90-day saver).
 *
 * Isolation guarantee:
 *  - Meal reminders own IDs [710000, 711000). Trial Win-Back owns IDs 880001 & 880002 ONLY.
 *  - Automatically cancelled the moment the user upgrades to any paid Consumer VIP plan or logs out.
 *  - NEVER touches LocalNotifications or displays anything on iOS / iPadOS App Store runtimes.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  isAdminAccount,
  isIosOrIpadAppStoreRuntime,
  isNativeIosApp,
  isUserVipActive,
  type Language,
  type User,
} from '../types/index.ts';

export const TRIAL_DAY6_REMINDER_ID = 880001;
export const TRIAL_DAY8_WINBACK_ID = 880002;
export const TRIAL_WINBACK_CHANNEL_ID = 'vip-trial-updates';
const WEB_SHOWN_KEY = 'kft_trial_winback_web_shown_v1';
const SMALL_ICON = 'ic_stat_meal';
const ICON_COLOR = '#D97706';

export interface PlannedTrialNotification {
  id: typeof TRIAL_DAY6_REMINDER_ID | typeof TRIAL_DAY8_WINBACK_ID;
  kind: 'day6_ending_soon' | 'day8_promo_099';
  at: Date;
  title: string;
  body: string;
}

export function isTrialWinbackNotificationId(id: number): boolean {
  return id === TRIAL_DAY6_REMINDER_ID || id === TRIAL_DAY8_WINBACK_ID;
}

function hasPaidConsumerUpgrade(user: User, nowMs: number): boolean {
  if (user.promo099Used) return true;
  const planId = String(user.activeConsumerPlanId || '').trim();
  if (
    planId === 'consumer_promo_30d' ||
    planId === 'consumer_30d' ||
    planId === 'consumer_90d' ||
    planId === 'consumer_365d'
  ) {
    return true;
  }
  if (!isUserVipActive(user)) return false;
  const ref = String(user.transactionRef || '').trim();
  const isTrial =
    planId === 'trial_7d' ||
    user.vipPlanType === 'trial_7d' ||
    user.vipPlanType === '7d' ||
    ref.startsWith('TRIAL-7D-') ||
    String(user.paymentMethod || '') === 'FREE_TRIAL_7D';
  if (!isTrial) return true;
  const expMs = Date.parse(String(user.subscriptionExpiryDate || user.vipExpiresAt || ''));
  const trialExpMs = Date.parse(String(user.freeTrialExpiresAt || ''));
  return Number.isFinite(expMs) && Number.isFinite(trialExpMs) && expMs > trialExpMs + 12 * 3600_000 && expMs > nowMs;
}

/**
 * Pure planning helper (unit-testable without Capacitor).
 * Returns [] if on iOS, not a trial user, or already upgraded to paid VIP.
 */
export function planTrialWinbackNotifications(params: {
  user?: User | null;
  language: Language;
  nowMs?: number;
  promoPriceUsd?: number;
  skipIosCheckForTest?: boolean;
}): PlannedTrialNotification[] {
  const { user, language } = params;
  const nowMs = params.nowMs ?? Date.now();
  const promoPrice = (params.promoPriceUsd ?? 0.99).toFixed(2);

  if (!params.skipIosCheckForTest && (isNativeIosApp() || isIosOrIpadAppStoreRuntime())) {
    return [];
  }
  if (!user || isAdminAccount(user)) return [];
  if (hasPaidConsumerUpgrade(user, nowMs)) return [];

  const trialExpRaw = user.freeTrialExpiresAt || (user.vipPlanType === 'trial_7d' ? user.subscriptionExpiryDate : '');
  if (!trialExpRaw) return [];
  const trialExpMs = Date.parse(trialExpRaw);
  if (!Number.isFinite(trialExpMs) || trialExpMs <= 0) return [];

  const day6Ms = trialExpMs - 24 * 3600_000; // 1 day before 7d trial ends
  const day8Ms = trialExpMs + 24 * 3600_000; // 1 day after 7d trial ends

  const planned: PlannedTrialNotification[] = [];

  if (day6Ms > nowMs + 60_000) {
    const title =
      language === 'km'
        ? '⏳ សល់ ១ ថ្ងៃទៀតសម្រាប់ការសាកល្បង VIP ឥតគិតថ្លៃ!'
        : language === 'zh'
          ? '⏳ 免费 VIP 试用还剩最后 1 天！'
          : '⏳ 1 day left in your Free VIP Trial!';
    const body =
      language === 'km'
        ? 'សូមរីករាយជាមួយមុខងារ AI ថ្ងៃចុងក្រោយ! (ការមើលម្ហូប ហាង សណ្ឋាគារ និងផែនទី នៅតែ FREE ជារៀងរហូត)'
        : language === 'zh'
          ? '尽情体验最后一天 AI 美食助手！（浏览美食、餐厅、酒店与地图导航永久免费）'
          : 'Enjoy your final day of AI assistant access! (Core food, hotel, tourism & map browsing stays FREE forever)';
    planned.push({
      id: TRIAL_DAY6_REMINDER_ID,
      kind: 'day6_ending_soon',
      at: new Date(day6Ms),
      title,
      body,
    });
  }

  if (day8Ms > nowMs + 60_000) {
    const title =
      language === 'km'
        ? `🎁 កាដូពិសេស $${promoPrice} / 30 ថ្ងៃ សម្រាប់បង!`
        : language === 'zh'
          ? `🎁 专属回归特惠：$${promoPrice} 畅享 30 天 VIP！`
          : `🎁 Special $${promoPrice} / 30-Day VIP Offer Unlocked!`;
    const body =
      language === 'km'
        ? `ការសាកល្បង 7 ថ្ងៃបានបញ្ចប់។ បន្តប្រើ AI VIP ពេញ 30 ថ្ងៃត្រឹមតែ $${promoPrice} (ម្តងគត់) ឬសន្សំ 90 ថ្ងៃ!`
        : language === 'zh'
          ? `7 天试用已结束，立享一次 $${promoPrice}/30 天特惠续订（或选择 90 天省心包）！`
          : `Your 7-day trial ended. Unlock 30 days of VIP AI for just $${promoPrice} (1-time offer) or save with 90 days!`;
    planned.push({
      id: TRIAL_DAY8_WINBACK_ID,
      kind: 'day8_promo_099',
      at: new Date(day8Ms),
      title,
      body,
    });
  }

  return planned;
}

export async function cancelTrialWinbackNotifications(): Promise<void> {
  if (isNativeIosApp() || isIosOrIpadAppStoreRuntime()) return;
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    await LocalNotifications.cancel({
      notifications: [{ id: TRIAL_DAY6_REMINDER_ID }, { id: TRIAL_DAY8_WINBACK_ID }],
    });
  } catch {
    // ignore if plugin unavailable
  }
}

export async function syncTrialWinbackNotifications(params: {
  user?: User | null;
  language: Language;
  promoPriceUsd?: number;
  requestPermissionIfPrompt?: boolean;
}): Promise<number> {
  if (isNativeIosApp() || isIosOrIpadAppStoreRuntime()) return 0;
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 0;

  const plan = planTrialWinbackNotifications({
    user: params.user,
    language: params.language,
    promoPriceUsd: params.promoPriceUsd,
  });

  if (!Capacitor.isNativePlatform() || platform !== 'android') {
    return 0;
  }

  await cancelTrialWinbackNotifications();
  if (plan.length === 0) return 0;

  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'prompt' && params.requestPermissionIfPrompt) {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== 'granted') return 0;

    try {
      await LocalNotifications.createChannel({
        id: TRIAL_WINBACK_CHANNEL_ID,
        name: 'VIP Trial & Promo Updates',
        description: 'Helpful reminders before and after your 7-day free trial',
        importance: 3,
        visibility: 1,
        vibration: false,
      });
    } catch {
      // channel already exists
    }

    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        channelId: TRIAL_WINBACK_CHANNEL_ID,
        smallIcon: SMALL_ICON,
        iconColor: ICON_COLOR,
        autoCancel: true,
        isExactNotification: false,
        isExactMandatory: false,
        schedule: { at: p.at, allowWhileIdle: true },
        extra: { trialWinbackKind: p.kind },
      })),
    });
    return plan.length;
  } catch {
    return 0;
  }
}

/**
 * Web-only gentle check: if a browser user opens the app on Day 6 or after Day 7 expiry (eligible for $0.99),
 * returns a one-time message so they don't miss the offer without OS push permissions.
 */
export function consumeWebTrialWinbackBannerOnce(params: {
  user?: User | null;
  language: Language;
  promoPriceUsd?: number;
  nowMs?: number;
}): string | null {
  if (isNativeIosApp() || isIosOrIpadAppStoreRuntime() || Capacitor.isNativePlatform()) return null;
  const user = params.user;
  if (!user || isAdminAccount(user)) return null;
  const nowMs = params.nowMs ?? Date.now();
  if (hasPaidConsumerUpgrade(user, nowMs)) return null;

  const trialExpRaw = user.freeTrialExpiresAt;
  if (!trialExpRaw) return null;
  const trialExpMs = Date.parse(trialExpRaw);
  if (!Number.isFinite(trialExpMs) || trialExpMs <= 0) return null;

  let stage: 'day6' | 'day8' | null = null;
  if (nowMs >= trialExpMs) stage = 'day8';
  else if (trialExpMs - nowMs <= 36 * 3600_000) stage = 'day6';
  if (!stage) return null;

  const dedupeId = `${user.id}:${stage}:${trialExpRaw.slice(0, 10)}`;
  try {
    const raw = localStorage.getItem(WEB_SHOWN_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(dedupeId)) return null;
    localStorage.setItem(WEB_SHOWN_KEY, JSON.stringify([...seen.slice(-20), dedupeId]));
  } catch {
    return null;
  }

  const price = (params.promoPriceUsd ?? 0.99).toFixed(2);
  if (stage === 'day8') {
    return params.language === 'km'
      ? `🎁 ការសាកល្បង 7 ថ្ងៃបានបញ្ចប់! បងទទួលបានប្រូម៉ូសិនពិសេស $${price} / 30 ថ្ងៃ (ម្តងគត់)`
      : params.language === 'zh'
        ? `🎁 7 天试用已结束！您已解锁 $${price} / 30 天专属特惠`
        : `🎁 Your 7-day trial ended! You unlocked the special $${price} / 30-day VIP offer`;
  }
  return params.language === 'km'
    ? '⏳ សល់ប្រហែល ១ ថ្ងៃទៀតសម្រាប់ការសាកល្បង VIP ឥតគិតថ្លៃ 7 ថ្ងៃរបស់បង!'
    : params.language === 'zh'
      ? '⏳ 您的 7 天免费 VIP 试用还剩约 1 天！'
      : '⏳ About 1 day left in your 7-day Free VIP Trial!';
}

export async function addTrialWinbackTapListener(onTap: () => void): Promise<() => void> {
  if (isNativeIosApp() || isIosOrIpadAppStoreRuntime()) return () => undefined;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return () => undefined;
  try {
    const handle = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const id = event?.notification?.id;
      if (typeof id === 'number' && isTrialWinbackNotificationId(id)) {
        onTap();
      }
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}
