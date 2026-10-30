import React from 'react';
import { Plus, Edit2, Trash2, Store } from 'lucide-react';
import type { Language, Restaurant } from '../../types';
import { tr } from '../../utils/i18n';
import { SectionHeader } from './SectionHeader';
import { FALLBACK_IMG } from './homeUtils';

interface Props {
  language: Language;
  shops: Restaurant[];
  usedStores: number;
  totalStores: number;
  onManage: (shopId: string) => void;
  onAdd: () => void;
  onDelete?: (shopId: string) => void;
}

/** "My shop" panel for active VIP members: clean list, one primary action. */
export const MyShopPanel: React.FC<Props> = ({ language, shops, usedStores, totalStores, onManage, onAdd, onDelete }) => {
  return (
    <section className="space-y-3">
      <SectionHeader
        icon={Store}
        title={tr(language, 'ហាងរបស់ខ្ញុំ', 'My Shop', '我的店铺')}
        subtitle={tr(language, `${usedStores}/${totalStores} ហាង`, `${usedStores} of ${totalStores} shop slots used`, `已使用 ${usedStores}/${totalStores} 个店铺名额`)}
      />

      {shops.length === 0 ? (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/70 border border-dashed border-amber-300/70 dark:border-amber-400/30 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {tr(
              language,
              'ចុះបញ្ជីហាងរបស់អ្នក ដើម្បីឱ្យអតិថិជនស្វែងរកឃើញ និងតាមដានស្ថិតិអ្នកទស្សនា',
              'Add your shop so customers can discover it and you can track visitor stats.',
              '添加您的店铺，让顾客更容易发现，并查看访客统计。'
            )}
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="min-h-[46px] px-5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-sm font-extrabold inline-flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {tr(language, 'បន្ថែមហាងរបស់ខ្ញុំ', 'Add my shop', '添加我的店铺')}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-sm"
            >
              <img
                src={shop.photoUrl || FALLBACK_IMG}
                alt={shop.nameKh}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMG;
                }}
                className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-200 dark:bg-slate-700"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {language === 'km' ? shop.nameKh : shop.nameEn || shop.nameKh}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tr(
                    language,
                    `${shop.menuItems?.length || 0} / 20 មុខម្ហូបក្នុងម៉ឺនុយ`,
                    `${shop.menuItems?.length || 0} / 20 menu items`,
                    `菜单 ${shop.menuItems?.length || 0} / 20 项`
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onManage(shop.id)}
                  className="min-h-[40px] px-3 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {tr(language, 'គ្រប់គ្រង', 'Manage', '管理')}
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(shop.id)}
                    aria-label={tr(language, 'លុបហាង', 'Delete shop', '删除店铺')}
                    className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 flex items-center justify-center active:scale-95 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
