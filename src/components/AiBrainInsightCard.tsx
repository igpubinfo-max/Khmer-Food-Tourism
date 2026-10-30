import React from 'react';
import { ChefHat, Crown, Lock, ShieldAlert } from 'lucide-react';
import type { FoodItem, Language } from '../types';
import { tr } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { allergenLabel, allergyFootnote, type AiBrainInsight, type AllergenId } from '../services/aiFoodBrain';

interface Props {
  insight: AiBrainInsight;
  language: Language;
  /** Show the picked dishes inside the card (hide when the parent already renders them). */
  showDishes?: boolean;
  onPickFood?: (food: FoodItem) => void;
  onChip: (query: string) => void;
  onUpgrade: () => void;
}

const MODE_STYLE: Record<AiBrainInsight['mode'], string> = {
  bridge: 'from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-slate-800 dark:to-teal-950/30 border-emerald-300/70 dark:border-emerald-700/50',
  mood: 'from-sky-50 via-white to-emerald-50 dark:from-sky-950/30 dark:via-slate-800 dark:to-emerald-950/30 border-sky-300/70 dark:border-sky-700/50',
  discover: 'from-violet-50 via-white to-amber-50 dark:from-violet-950/30 dark:via-slate-800 dark:to-amber-950/20 border-violet-300/70 dark:border-violet-700/50',
  drink: 'from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/40 dark:via-slate-800 dark:to-rose-950/30 border-amber-400/70 dark:border-amber-600/50',
  blocked: 'from-rose-50 via-white to-slate-50 dark:from-rose-950/30 dark:via-slate-800 dark:to-slate-900 border-rose-300/70 dark:border-rose-800/50',
};

const ALLERGEN_ICON: Record<AllergenId, string> = {
  peanut: '🥜',
  shellfish: '🦐',
  fish: '🐟',
  egg: '🥚',
  soy: '🫘',
  sesame: '🌱',
  raw: '⚠️',
};

/**
 * Renders the "AI brain" answer: headline, why, per-dish reasons, allergen flags,
 * a surprise, practical/safety tips and one-tap follow-ups.
 */
export const AiBrainInsightCard: React.FC<Props> = ({
  insight,
  language,
  showDishes = true,
  onPickFood,
  onChip,
  onUpgrade,
}) => {
  const hasAllergens = insight.dishes.some((d) => d.allergens.length > 0);

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-3.5 space-y-3 font-khmer ${MODE_STYLE[insight.mode]}`}
    >
      {/* Headline */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-slate-700/70 border border-black/5 dark:border-white/10 flex items-center justify-center text-2xl shrink-0 shadow-xs">
          {insight.emoji}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">{insight.headline}</h4>
          {insight.explanation && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">{insight.explanation}</p>
          )}
        </div>
      </div>

      {/* Safety note */}
      {insight.safetyNote && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{insight.safetyNote}</span>
        </div>
      )}

      {/* VIP lock (drink-pairing menu) */}
      {insight.vipLock && (
        <div className="p-3 rounded-xl bg-slate-900 text-amber-100 border border-amber-400/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <Lock className="w-4 h-4 text-amber-300" />
            <span>{tr(language, 'ម៉ឺនុយពិសេសសម្រាប់សមាជិក VIP', 'Special menu for VIP members', 'VIP 会员专属特别菜单')}</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-100/90">
            {tr(
              language,
              `AI បានរកឃើញម្ហូបក្លែមពិតៗ ${insight.pairingCount ?? 0} មុខ ដែលផ្គួបស្រាបៀរ ឬស្រា។ ដំឡើង VIP ដើម្បីមើលបញ្ជីពេញ។`,
              `AI found ${insight.pairingCount ?? 0} genuine drinking dishes that pair with beer or liquor. Upgrade to VIP to unlock the full list.`,
              `AI 找到了 ${insight.pairingCount ?? 0} 道适合佐啤酒/烈酒的地道下酒菜。升级 VIP 即可查看完整名单。`
            )}
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{tr(language, 'ដំឡើង VIP', 'Get VIP', '升级 VIP')}</span>
          </button>
        </div>
      )}

      {/* Dishes */}
      {showDishes && insight.dishes.length > 0 && (
        <div className="space-y-2">
          {insight.dishes.map(({ food, reason, allergens }) => {
            const loc = getLocalizedFood(food, language);
            return (
              <div
                key={food.id}
                onClick={() => onPickFood?.(food)}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-500 flex items-start gap-2.5 cursor-pointer transition shadow-2xs"
              >
                <img
                  src={food.photoUrl}
                  alt={loc.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-200 select-none"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">{loc.name}</div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed mt-0.5">💡 {reason}</p>
                  {allergens.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {allergens.map((a) => (
                        <span
                          key={a}
                          className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-[11px] font-bold"
                        >
                          {ALLERGEN_ICON[a]} {allergenLabel(a, language)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 text-[11px] font-bold shrink-0 flex items-center gap-1">
                  <ChefHat className="w-3 h-3" />
                  <span>{tr(language, 'រូបមន្ត', 'Recipe', '食谱')}</span>
                </span>
              </div>
            );
          })}
          {hasAllergens && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">🥜 {allergyFootnote(language)}</p>
          )}
        </div>
      )}

      {/* Surprise */}
      {insight.surprise && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 dark:from-amber-950/40 dark:via-slate-800 dark:to-amber-950/30 border border-amber-300/70 dark:border-amber-700/50">
          <div className="text-xs font-extrabold text-amber-800 dark:text-amber-300 mb-0.5">✨ {insight.surprise.title}</div>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{insight.surprise.text}</p>
        </div>
      )}

      {/* Tips */}
      {insight.tips.length > 0 && (
        <ul className="space-y-1">
          {insight.tips.map((tip, i) => (
            <li key={i} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex gap-1.5">
              <span className="shrink-0">💡</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      {insight.drinkDisclaimer && (
        <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 leading-relaxed">🔞 {insight.drinkDisclaimer}</p>
      )}

      {/* Follow-ups */}
      {insight.followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {insight.followUps.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChip(c.query)}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-700 transition cursor-pointer active:scale-95"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
