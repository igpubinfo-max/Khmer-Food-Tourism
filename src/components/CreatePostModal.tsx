import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Image, MapPin, Tag, Plus, Send } from 'lucide-react';
import { tr } from '../utils/i18n';

export const CreatePostModal: React.FC = () => {
  const { 
    isAddPostModalOpen, setIsAddPostModalOpen, 
    addPost, language, currentUser, setIsAuthModalOpen 
  } = useApp();

  const [titleKh, setTitleKh] = useState('');
  const [descriptionKh, setDescriptionKh] = useState('');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80');
  const [categoryTag, setCategoryTag] = useState('ម្ហូបខ្មែរ');
  const [locationName, setLocationName] = useState('រាជធានីភ្នំពេញ');

  if (!isAddPostModalOpen) return null;

  const samplePhotos = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    addPost(
      titleKh || tr(language, 'ចែករំលែកបទពិសោធន៍ម្ហូប និងដំណើរកម្សាន្ត', 'Sharing food & travel experience', '分享美食与旅游体验'),
      descriptionKh,
      photoUrl,
      categoryTag,
      locationName
    );

    setIsAddPostModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#047857] flex items-center justify-between bg-[#064E3B] text-white">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-200" />
            <h2 className="font-moul text-sm sm:text-base text-white">
              {tr(language, 'ចែករំលែកការបង្ហោះថ្មី', 'Share New Post', '发布新动态')}
            </h2>
          </div>
          <button
            onClick={() => setIsAddPostModalOpen(false)}
            className="p-1 rounded-full text-emerald-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
          {/* Title */}
          <div>
            <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
              {tr(language, 'ចំណងជើងការបង្ហោះ *', 'Post Title *', '动态标题 *')}
            </label>
            <input
              type="text"
              required
              value={titleKh}
              onChange={(e) => setTitleKh(e.target.value)}
              placeholder={tr(
                language,
                'ឧទាហរណ៍៖ អាហារពេលល្ងាចដ៏ឈ្ងុយឆ្ងាញ់នៅមាត់ស្ទឹងបាត់ដំបង!',
                'e.g. Delicious dinner by the Battambang river!',
                '例如：在马德望河畔享用美味晚餐！'
              )}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-[#059669] text-[#0F172A] dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
              {tr(language, 'ការពិពណ៌នា / រូបមន្ត / ការចែករំលែក *', 'Description / Recipe / Experience *', '详细描述 / 食谱做法 / 体验分享 *')}
            </label>
            <textarea
              rows={3}
              required
              value={descriptionKh}
              onChange={(e) => setDescriptionKh(e.target.value)}
              placeholder={tr(
                language,
                'សរសេររៀបរាប់ពីរសជាតិអាហារ របៀបចម្អិន ឬបទពិសោធន៍ដើរលេង...',
                'Share the food taste, cooking recipe, or travel story...',
                '写下美食风味、烹饪做法或旅行心得...'
              )}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-[#059669] resize-none text-[#0F172A] dark:text-white"
            />
          </div>

          {/* Tag & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                <Tag className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
                {tr(language, 'ស្លាកប្រធានបទ', 'Category Tag', '分类标签')}
              </label>
              <select
                value={categoryTag}
                onChange={(e) => setCategoryTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-[#059669] text-[#0F172A] dark:text-white font-khmer"
              >
                <option value="ម្ហូបខ្មែរ">{tr(language, 'ម្ហូបខ្មែរ (Khmer Food)', 'Khmer Food', '高棉美食 (Khmer Food)')}</option>
                <option value="រូបមន្តម្ហូប">{tr(language, 'រូបមន្តម្ហូប (Cooking Recipe)', 'Cooking Recipe', '烹饪食谱 (Cooking Recipe)')}</option>
                <option value="ហាងអាហារឆ្ងាញ់">{tr(language, 'ហាងអាហារឆ្ងាញ់ (Food Review)', 'Food Review', '探店点评 (Food Review)')}</option>
                <option value="ដំណើរកម្សាន្ត">{tr(language, 'ដំណើរកម្សាន្ត (Travel / Tour)', 'Travel / Tour', '旅游打卡 (Travel / Tour)')}</option>
                <option value="គ្រឿងសមុទ្រ">{tr(language, 'គ្រឿងសមុទ្រ (Seafood)', 'Seafood', '海鲜美食 (Seafood)')}</option>
                <option value="បង្អែម & ភេសជ្ជៈ">{tr(language, 'បង្អែម & ភេសជ្ជៈ (Dessert & Drink)', 'Dessert & Drink', '甜品与饮品 (Dessert & Drink)')}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
                {tr(language, 'ទីតាំង / ខេត្ត', 'Location / Province', '所在地点 / 省份')}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder={tr(language, 'រាជធានីភ្នំពេញ, សៀមរាប...', 'Phnom Penh, Siem Reap...', '金边市, 暹粒省...')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-[#059669] text-[#0F172A] dark:text-white"
              />
            </div>
          </div>

          {/* Photo URL & Presets */}
          <div>
            <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
              <Image className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
              {tr(language, 'រូបភាពដែលត្រូវបង្ហោះ (Photo URL)', 'Photo URL', '配图链接 (Photo URL)')}
            </label>
            <input
              type="url"
              required
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-[#059669] mb-2 text-[#0F172A] dark:text-white font-mono text-[11px]"
            />

            <p className="text-[10px] text-slate-400 mb-1">
              {tr(language, 'ជ្រើសរើសរូបភាពគំរូស្អាតៗ៖', 'Or choose a photo from presets:', '或从精选预设配图中选择：')}
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {samplePhotos.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setPhotoUrl(url)}
                  className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                    photoUrl === url ? 'border-[#059669] ring-2 ring-emerald-300' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="preset" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {tr(language, 'បង្ហោះទៅកាន់សហគមន៍', 'Publish to Community Feed', '发布到社区动态')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
