import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { organizeAndDeduplicateFoods } from '../../types';
import { tr } from '../../utils/i18n';
import {
  MEAL_REMINDER_CHANGED_EVENT,
  disableMealReminders,
  enableMealReminders,
  getReminderPermission,
  getReminderSettings,
  isReminderSupported,
  saveReminderSettings,
  type ReminderPermission,
} from '../../services/mealReminderService';
import {
  REMINDER_SLOTS,
  isValidReminderTime,
  type MealReminderSettings,
  type ReminderSlot,
} from '../../utils/mealReminderPlan';

const SLOT_META: Record<ReminderSlot, { emoji: string; km: string; en: string; zh: string }> = {
  breakfast: { emoji: '🍜', km: 'ពេលព្រឹក', en: 'Breakfast', zh: '早餐' },
  lunch: { emoji: '🍛', km: 'ថ្ងៃត្រង់', en: 'Lunch', zh: '午餐' },
  snack: { emoji: '🍮', km: 'រសៀល', en: 'Snack', zh: '下午茶' },
  dinner: { emoji: '🍲', km: 'ពេលល្ងាច', en: 'Dinner', zh: '晚餐' },
};

/**
 * Opt-in panel for daily meal-time reminders (native app only; renders nothing on the web).
 * The OS permission is requested only when the user taps "Turn on" — never at launch.
 */
const MealReminderPanelInner: React.FC = () => {
  const { language, foods, showToast } = useApp();
  const supported = isReminderSupported();
  const catalog = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);
  const [settings, setSettings] = useState<MealReminderSettings>(() => getReminderSettings());
  const [permission, setPermission] = useState<ReminderPermission>(() => (getReminderSettings().enabled ? 'granted' : 'prompt'));
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let alive = true;
    void getReminderPermission().then((p) => alive && setPermission(p));
    const refresh = () => setSettings(getReminderSettings());
    window.addEventListener(MEAL_REMINDER_CHANGED_EVENT, refresh);
    return () => {
      alive = false;
      window.removeEventListener(MEAL_REMINDER_CHANGED_EVENT, refresh);
    };
  }, [supported]);

  if (!supported) return null;

  // If the user revoked the OS permission after enabling, reflect that honestly instead of showing a dead switch.
  const active = settings.enabled && permission === 'granted';

  const onEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await enableMealReminders(catalog, language);
      setPermission(await getReminderPermission());
      if (res.ok) {
        setSettings(getReminderSettings());
        setExpanded(true);
        showToast(
          tr(
            language,
            '🔔 បានបើកការរំលឹកម្ហូបតាមម៉ោងញ៉ាំ!',
            '🔔 Meal reminders are on!',
            '🔔 已开启用餐提醒！'
          ),
          'success'
        );
      } else {
        showToast(
          tr(
            language,
            'សូមអនុញ្ញាតការជូនដំណឹង ក្នុង Settings របស់ទូរស័ព្ទ → កម្មវិធី → ការជូនដំណឹង',
            'Please allow notifications in your phone Settings → Apps → Notifications',
            '请在手机“设置 → 应用 → 通知”中允许通知'
          ),
          'warning'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const onDisable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await disableMealReminders();
      setSettings(getReminderSettings());
      setExpanded(false);
      showToast(tr(language, 'បានបិទការរំលឹកម្ហូប', 'Meal reminders turned off', '已关闭用餐提醒'), 'info');
    } finally {
      setBusy(false);
    }
  };

  const updateSlot = (slot: ReminderSlot, patch: Partial<{ on: boolean; time: string }>) => {
    if (patch.time !== undefined && !isValidReminderTime(patch.time)) return;
    const next: MealReminderSettings = {
      ...settings,
      slots: { ...settings.slots, [slot]: { ...settings.slots[slot], ...patch } },
    };
    setSettings(saveReminderSettings(next));
  };

  const slotName = (s: ReminderSlot) => {
    const m = SLOT_META[s];
    return tr(language, m.km, m.en, m.zh);
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => void onEnable()}
        disabled={busy}
        data-testid="meal-reminder-enable"
        className="w-full flex items-center gap-3 rounded-2xl bg-emerald-600/10 hover:bg-emerald-600/15 dark:bg-emerald-400/10 border border-emerald-500/40 px-3 py-2.5 text-left active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
      >
        <span className="text-xl shrink-0" aria-hidden="true">🔔</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold text-[#064E3B] dark:text-emerald-200 leading-snug">
            {tr(language, 'រំលឹកម្ហូបតាមម៉ោងញ៉ាំរបស់ខ្មែរ', 'Khmer meal-time reminders', '高棉用餐时间提醒')}
          </span>
          <span className="block text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
            {permission === 'denied' && settings.enabled
              ? tr(
                  language,
                  'ការជូនដំណឹងត្រូវបានបិទក្នុង Settings ទូរស័ព្ទ — ចុចដើម្បីព្យាយាមម្តងទៀត',
                  'Notifications are blocked in phone Settings — tap to retry',
                  '手机设置中通知已被关闭 — 点击重试'
                )
              : tr(
                  language,
                  'ទទួលបានការណែនាំម្ហូបពេលព្រឹក ថ្ងៃត្រង់ ល្ងាច • បិទបានគ្រប់ពេល',
                  'A dish idea at breakfast, lunch and dinner • turn off anytime',
                  '早、中、晚推荐一道美食 • 随时可关闭'
                )}
          </span>
        </span>
        <span className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">
          {busy ? '…' : tr(language, 'បើក', 'Turn on', '开启')}
        </span>
      </button>
    );
  }

  const summary = REMINDER_SLOTS.filter((s) => settings.slots[s].on)
    .map((s) => `${slotName(s)} ${settings.slots[s].time}`)
    .join(' • ');

  return (
    <div data-testid="meal-reminder-panel" className="rounded-2xl border border-emerald-500/40 bg-emerald-600/10 dark:bg-emerald-400/10">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
      >
        <span className="text-xl shrink-0" aria-hidden="true">🔔</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold text-[#064E3B] dark:text-emerald-200 leading-snug">
            {tr(language, 'ការរំលឹកម្ហូបកំពុងដំណើរការ', 'Meal reminders are on', '用餐提醒已开启')}
          </span>
          <span className="block text-[11px] text-slate-600 dark:text-slate-300 truncate">
            {summary || tr(language, 'មិនទាន់ជ្រើសរើសពេលណាទេ', 'No meals selected', '尚未选择用餐时段')}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {REMINDER_SLOTS.map((slot) => {
            const cfg = settings.slots[slot];
            return (
              <div key={slot} className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={cfg.on}
                  aria-label={slotName(slot)}
                  onClick={() => updateSlot(slot, { on: !cfg.on })}
                  className={`relative w-11 h-6 rounded-full shrink-0 transition cursor-pointer ${cfg.on ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfg.on ? 'translate-x-5' : ''}`} />
                </button>
                <span className="flex-1 min-w-0 text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">
                  <span aria-hidden="true">{SLOT_META[slot].emoji}</span> {slotName(slot)}
                </span>
                <input
                  type="time"
                  value={cfg.time}
                  disabled={!cfg.on}
                  onChange={(e) => updateSlot(slot, { time: e.target.value })}
                  aria-label={`${slotName(slot)} time`}
                  className="min-h-[40px] px-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono disabled:opacity-40"
                />
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => void onDisable()}
            disabled={busy}
            className="w-full min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer disabled:opacity-60"
          >
            {tr(language, 'បិទការរំលឹកទាំងអស់', 'Turn off all reminders', '关闭全部提醒')}
          </button>
        </div>
      )}
    </div>
  );
};

export const MealReminderPanel = React.memo(MealReminderPanelInner);
