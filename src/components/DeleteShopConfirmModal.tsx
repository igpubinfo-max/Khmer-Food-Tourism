import React from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { tr } from '../utils/i18n';

export const DeleteShopConfirmModal: React.FC = () => {
  const {
    pendingDeleteRestaurant,
    confirmDeleteRestaurant,
    cancelDeleteRestaurant,
    language,
  } = useApp();

  if (!pendingDeleteRestaurant) return null;

  const isKm = language === 'km';
  const shopName = isKm
    ? pendingDeleteRestaurant.nameKh || pendingDeleteRestaurant.nameEn
    : pendingDeleteRestaurant.nameEn || pendingDeleteRestaurant.nameKh;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={cancelDeleteRestaurant}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-rose-200 dark:border-rose-800/80 p-5 sm:p-6 text-center transform animate-scale-up font-khmer relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={cancelDeleteRestaurant}
          className="absolute top-3.5 right-3.5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mb-1.5 leading-snug">
          {tr(
            language,
            'តើអ្នកពិតជាចង់លុបហាងនេះមែនទេ? (Are you sure you want to delete this shop?)',
            'Are you sure you want to delete this shop?',
            '确定要删除这家店铺吗？ (Are you sure you want to delete this shop?)'
          )}
        </h3>

        {/* Target Shop Preview */}
        <div className="my-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 text-left">
          <img
            src={pendingDeleteRestaurant.photoUrl || '/Shop/rest-1.jpg'}
            alt={shopName}
            className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/Shop/rest-1.jpg';
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {shopName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              📍 {pendingDeleteRestaurant.addressKh || pendingDeleteRestaurant.provinceKh}
            </p>
          </div>
        </div>

        {/* Permanent Deletion Warning */}
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800/80 text-left mb-5 space-y-1">
          <p className="text-xs font-extrabold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>
              {tr(
                language,
                'ការព្រមាន៖ ការលុបនេះគឺជាអចិន្ត្រៃយ៍!',
                'Warning: Deletion is permanent and cannot be undone!',
                '警告：删除操作是永久性的，无法撤销！'
              )}
            </span>
          </p>
          <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
            {tr(
              language,
              'ទិន្នន័យហាង មុខម្ហូប និងរូបភាពនៃហាងនេះនឹងត្រូវលុបចេញជាអចិន្ត្រៃយ៍ពីប្រព័ន្ធ និងគ្រប់ឧបករណ៍ទាំងអស់ ហើយមិនអាចស្តារឡើងវិញបានទេ។',
              'This shop, its menu items, and photos will be permanently removed across all sessions and devices and cannot be undone.',
              '该店铺及其菜品和照片将从所有设备和会话中永久移除，且无法恢复。'
            )}
          </p>
        </div>

        {/* Action Buttons: Cancel & Confirm Delete */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={cancelDeleteRestaurant}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <span>{tr(language, 'បោះបង់ (Cancel)', 'Cancel', '取消 (Cancel)')}</span>
          </button>

          <button
            type="button"
            onClick={confirmDeleteRestaurant}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md transition active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>{tr(language, 'បញ្ជាក់លុប (Confirm Delete)', 'Confirm Delete', '确认删除 (Confirm Delete)')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
