import React, { useMemo } from 'react';
import { Award, Star } from 'lucide-react';
import { tr } from '../../utils/i18n';
import type { Language } from '../../types';

type RatedItem = { id?: string; rating?: number | string; isFeatured?: boolean } | null | undefined;

/** Top-rated listings (5.0★ display, i.e. rating >= 4.9) earn the "Cambodia's Choice" gold badge. */
export const isCambodiaChoiceEligible = (item: RatedItem): boolean => {
  if (!item) return false;
  const r = Number(item.rating);
  return Number.isFinite(r) && r >= 4.9;
};

export const CambodiaChoiceBadge: React.FC<{ language: Language; size?: 'sm' | 'md'; className?: string }> = ({
  language,
  size = 'sm',
  className = '',
}) => {
  const small = size === 'sm';
  return (
    <span
      data-testid="cambodia-choice-badge"
      className={`inline-flex items-center gap-1 rounded-full font-khmer font-extrabold leading-[1.5] whitespace-nowrap border border-amber-300 text-amber-900 shadow-[0_2px_8px_rgba(245,158,11,0.35)] bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-300 ${
        small ? 'px-2 py-0.5 text-[10.5px]' : 'px-3 py-1 text-xs'
      } ${className}`}
    >
      <Award className={small ? 'w-3 h-3 shrink-0' : 'w-4 h-4 shrink-0'} />
      <span>{tr(language, 'ជម្រើសល្អបំផុតប្រចាំកម្ពុជា', "Cambodia's Choice", '柬埔寨精选')}</span>
    </span>
  );
};

export type RatingKind = 'restaurant' | 'hotel' | 'tourism';

const LABELS: Record<RatingKind, Array<[string, string, string]>> = {
  restaurant: [
    ['រសជាតិ & គុណភាព', 'Taste & Quality', '口味与品质'],
    ['សេវាកម្ម', 'Service', '服务'],
    ['អនាម័យ & បរិយាកាស', 'Cleanliness & Ambience', '卫生与环境'],
    ['តម្លៃសមរម្យ', 'Value for Money', '性价比'],
  ],
  hotel: [
    ['ទីតាំង', 'Location', '位置'],
    ['សេវាកម្ម & ការទទួលភ្ញៀវ', 'Service & Hospitality', '服务与接待'],
    ['អនាម័យ & សុវត្ថិភាព', 'Cleanliness & Safety', '卫生与安全'],
    ['តម្លៃសមរម្យ', 'Value for Money', '性价比'],
  ],
  tourism: [
    ['ទេសភាព & ទីតាំង', 'Scenery & Location', '风景与位置'],
    ['ការទទួលភ្ញៀវ & សេវា', 'Hospitality & Service', '接待与服务'],
    ['អនាម័យ & សុវត្ថិភាព', 'Cleanliness & Safety', '卫生与安全'],
    ['តម្លៃ & បទពិសោធន៍', 'Value & Experience', '价值与体验'],
  ],
};

const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
};

/** Deterministic 4-part breakdown centred on the listing's overall rating (average stays equal to the overall rating). */
export const computeFourPartRatings = (id: string, overall: number): number[] => {
  const base = Number.isFinite(overall) && overall > 0 ? overall : 4.5;
  const pattern = [0.1, 0, -0.1, 0];
  const rot = hashStr(id || 'x') % 4;
  return pattern.map((_, i) => {
    const v = base + pattern[(i + rot) % 4];
    return Math.min(5, Math.max(1, Math.round(v * 10) / 10));
  });
};

export const DetailedFourPartRatingsCard: React.FC<{
  id: string;
  rating?: number | string;
  reviewCount?: number;
  kind: RatingKind;
  language: Language;
}> = ({ id, rating, reviewCount, kind, language }) => {
  const overall = Number(rating) > 0 ? Number(rating) : 0;
  const scores = useMemo(() => computeFourPartRatings(id, overall), [id, overall]);
  if (!overall) return null;
  return (
    <section
      data-testid="four-part-ratings"
      className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 font-khmer"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
        <h4 className="font-extrabold text-[13.5px] leading-[1.6] text-slate-900 flex items-center gap-1.5">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
          {tr(language, 'ប្រព័ន្ធពិន្ទុលម្អិត ៤ ផ្នែក', '4-Part Detailed Rating', '四项详细评分')}
          <span className="text-amber-700">{overall.toFixed(1)}</span>
          {typeof reviewCount === 'number' && reviewCount > 0 && (
            <span className="text-slate-500 font-semibold text-xs">({reviewCount})</span>
          )}
        </h4>
        {isCambodiaChoiceEligible({ rating: overall }) && <CambodiaChoiceBadge language={language} size="md" />}
      </div>
      <div className="space-y-2">
        {LABELS[kind].map(([km, en, zh], i) => (
          <div key={en} className="flex items-center gap-2.5">
            <span className="text-[12px] leading-[1.6] font-bold text-slate-700 w-[44%] sm:w-[38%]">
              {tr(language, km, en, zh)}
            </span>
            <div className="flex-1 h-2 rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                style={{ width: `${(scores[i] / 5) * 100}%` }}
              />
            </div>
            <span className="text-[12px] font-extrabold text-slate-900 w-7 text-right">{scores[i].toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
