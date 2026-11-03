import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { organizeAndDeduplicateFoods } from '../../types';
import { tr } from '../../utils/i18n';
import {
  MEAL_REMINDER_CHANGED_EVENT,
  MEAL_REMINDER_RESCHEDULED_EVENT,
  disableMealReminders,
  enableMealReminders,
  getExactAlarmState,
  getNextScheduledReminder,
  getReminderPermission,
  getReminderSettings,
  isReminderSupported,
  openExactAlarmSettings,
  saveReminderSettings,
  sendTestReminder,
  type ExactAlarmState,
  type NextReminder,
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

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Opt-in panel for regular meal-time reminders (native app only; renders nothing on the web).
 * The OS permission is requested only when the user taps "Turn on" — never at launch.
 */
const MealReminderPanelInner: React.FC = () => {
  const { language, foods, showToast } = useApp();
  const supported = isReminderSupported();
  const catalog = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);
  const [settings, setSettings] = useState<MealReminderSettings>(() => getReminderSettings());
  const [permission, setPermission] = useState<ReminderPermission>(() => (getReminderSettings().enabled ? 'granted' : 'prompt'));
  const [exactState, setExactState] = useState<ExactAlarmState>('unsupported');
  const [next, setNext] = useState<NextReminder | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    const [p, e, n] = await Promise.all([getReminderPermission(), getExactAlarmState(), getNextScheduledReminder()]);
    setPermission(p);
    setExactState(e);
    setNext(n);
  }, []);

  useEffect(() => {
    if (!supported) return;
    let alive = true;
    const safeRefresh = () => {
      if (alive) void refreshStatus();
    };
    safeRefresh();
    const onSettings = () => setSettings(getReminderSettings());
    window.addEventListener(MEAL_REMINDER_CHANGED_EVENT, onSettings);
    window.addEventListener(MEAL_REMINDER_RESCHEDULED_EVENT, safeRefresh);
    // The user may come back from the system settings screen (exact alarms / notifications) -> re-check.
    const onVisible = () => {
      if (document.visibilityState === 'visible') safeRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.removeEventListener(MEAL_REMINDER_CHANGED_EVENT, onSettings);
      window.removeEventListener(MEAL_REMINDER_RESCHEDULED_EVENT, safeRefresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [supported, refreshStatus]);

  if (!supported) return null;

  // If the user revoked the OS permission after enabling, reflect that honestly instead of showing a dead switch.
  const active = settings.enabled && permission === 'granted';

  const onEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await enableMealReminders(catalog, language);
      await refreshStatus();
      if (res.ok) {
        setSettings(getReminderSettings());
        setExpanded(true);
        showToast(
          tr(language, '🔔 បានបើកការរំលឹកទទួលទានអាហារទៀងទាត់!', '🔔 Regular meal reminders are on!', '🔔 已开启规律用餐提醒！'),
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
      showToast(tr(language, 'បានបិទការរំលឹកទទួលទានអាហារ', 'Meal reminders turned off', '已关闭用餐提醒'), 'info');
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await sendTestReminder(catalog, language);
      showToast(
        ok
          ? tr(language, '🔔 បានផ្ញើការរំលឹកសាកល្បង — សូមពិនិត្យរបារជូនដំណឹង', '🔔 Test reminder sent — check your notification shade', '🔔 已发送测试提醒，请查看通知栏')
          : tr(language, 'មិនអាចផ្ញើការរំលឹកសាកល្បងបានទេ សូមពិនិត្យការអនុញ្ញាតជូនដំណឹង', 'Could not send the test reminder — check notification permission', '无法发送测试提醒，请检查通知权限'),
        ok ? 'success' : 'warning'
      );
    } finally {
      setBusy(false);
    }
  };

  const onExactAlarm = async () => {
    // The system screen opens; when the user returns, the app-resume handler rebuilds the plan (now exact) and this
    // panel refreshes its status automatically.
    await openExactAlarmSettings();
  };

  const updateSlot = (slot: ReminderSlot, patch: Partial<{ on: boolean; time: string }>) => {
    if (patch.time !== undefined && !isValidReminderTime(patch.time)) return;
    const nextSettings: MealReminderSettings = {
      ...settings,
      slots: { ...settings.slots, [slot]: { ...settings.slots[slot], ...patch } },
    };
    setSettings(saveReminderSettings(nextSettings));
  };

  const slotName = (s: ReminderSlot) => {
    const m = SLOT_META[s];
    return tr(language, m.km, m.en, m.zh);
  };

  const describeNext = (n: NextReminder): string => {
    const now = new Date();
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.round((startOf(n.at) - startOf(now)) / 86_400_000);
    const day =
      dayDiff <= 0
        ? tr(language, 'ថ្ងៃនេះ', 'today', '今天')
        : dayDiff === 1
          ? tr(language, 'ថ្ងៃស្អែក', 'tomorrow', '明天')
          : `${pad2(n.at.getDate())}/${pad2(n.at.getMonth() + 1)}`;
    return `${day} ${pad2(n.at.getHours())}:${pad2(n.at.getMinutes())}${n.slot ? ` • ${slotName(n.slot)}` : ''}`;
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => void onEnable()}
        disabled={busy}
        data-testid="meal-reminder-enable"
        className="w-full min-h-[36px] flex items-center gap-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/15 dark:bg-emerald-400/10 border border-emerald-500/40 px-2.5 py-1 text-left active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
      >
        <span className="text-base shrink-0" aria-hidden="true">🔔</span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold text-[#064E3B] dark:text-emerald-200 leading-snug">
          {permission === 'denied' && settings.enabled
            ? tr(language, 'ការជូនដំណឹងត្រូវបានបិទក្នុង Settings — ចុចព្យាយាមម្តងទៀត', 'Notifications blocked in Settings — tap to retry', '通知已被关闭 — 点击重试')
            : tr(language, 'ការរំលឹកទទួលទានអាហារទៀងទាត់', 'Regular meal reminders', '规律用餐提醒')}
        </span>
        <span className="shrink-0 px-3 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">
          {busy ? '…' : tr(language, 'បើក', 'Turn on', '开启')}
        </span>
      </button>
    );
  }

  const timesSummary = REMINDER_SLOTS.filter((s) => settings.slots[s].on)
    .map((s) => settings.slots[s].time)
    .join(' · ');

  return (
    <div data-testid="meal-reminder-panel" className="rounded-xl border border-emerald-500/40 bg-emerald-600/10 dark:bg-emerald-400/10">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full min-h-[36px] flex items-center gap-2 px-2.5 py-1 text-left cursor-pointer"
      >
        <span className="text-base shrink-0" aria-hidden="true">🔔</span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold text-[#064E3B] dark:text-emerald-200 leading-snug">
          {tr(language, 'ការរំលឹកទទួលទានអាហារទៀងទាត់', 'Regular meal reminders', '规律用餐提醒')}
        </span>
        <span className="shrink-0 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
          {timesSummary || tr(language, 'មិនទាន់ជ្រើស', 'None', '未选择')}
        </span>
        <ChevronDown className={`w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2">
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

          {/* Truth from the OS: when is the next reminder REALLY scheduled? */}
          <p data-testid="meal-reminder-next" className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            ⏰{' '}
            {next
              ? tr(language, `ការរំលឹកបន្ទាប់៖ ${describeNext(next)}`, `Next reminder: ${describeNext(next)}`, `下一次提醒：${describeNext(next)}`)
              : tr(language, 'មិនទាន់មានការរំលឹកដែលបានកំណត់ទេ', 'No reminder is scheduled yet', '尚无已安排的提醒')}
          </p>

          {exactState === 'denied' && (
            <p className="text-[10.5px] leading-snug text-amber-800 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-400/10 rounded-lg px-2 py-1">
              {tr(
                language,
                'ទូរស័ព្ទអាចពន្យារការរំលឹកខ្លះៗ (ប៉ុន្មាននាទី)។ ចុច «ទៀងម៉ោង» ដើម្បីអនុញ្ញាតឱ្យរោទ៍ត្រង់នាទីដែលបានកំណត់។',
                'Your phone may delay reminders by a few minutes. Tap “On-time” to let them ring on the exact minute.',
                '手机可能会将提醒延迟几分钟。点击“准时”即可让提醒在设定的分钟准时响起。'
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onTest()}
              disabled={busy}
              data-testid="meal-reminder-test"
              className="flex-1 min-w-[120px] min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
            >
              🔔 {tr(language, 'សាកល្បងឥឡូវនេះ', 'Test now', '立即测试')}
            </button>
            {exactState === 'denied' && (
              <button
                type="button"
                onClick={() => void onExactAlarm()}
                data-testid="meal-reminder-exact"
                className="flex-1 min-w-[120px] min-h-[40px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition cursor-pointer"
              >
                ⏱ {tr(language, 'ទៀងម៉ោង', 'On-time', '准时')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void onDisable()}
              disabled={busy}
              className="flex-1 min-w-[120px] min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer disabled:opacity-60"
            >
              {tr(language, 'បិទការរំលឹកទាំងអស់', 'Turn off all', '全部关闭')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const MealReminderPanel = React.memo(MealReminderPanelInner);
