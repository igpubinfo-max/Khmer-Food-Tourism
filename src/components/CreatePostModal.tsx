import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Image, MapPin, Tag, Plus, Send } from 'lucide-react';

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
      titleKh || (language === 'km' ? 'ចែករំលែកបទពិសោធន៍ម្ហូប និងដំណើរកម្សាន្ត' : 'Sharing food & travel experience'),
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
        className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-amber-900 text-amber-50">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-300" />
            <h2 className="font-moul text-sm sm:text-base text-amber-200">
              {language === 'km' ? 'ចែករំលែកការបង្ហោះថ្មី' : 'Share New Post'}
            </h2>
          </div>
          <button
            onClick={() => setIsAddPostModalOpen(false)}
            className="p-1 rounded-full text-amber-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
          {/* Title */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              {language === 'km' ? 'ចំណងជើងការបង្ហោះ *' : 'Post Title *'}
            </label>
            <input
              type="text"
              required
              value={titleKh}
              onChange={(e) => setTitleKh(e.target.value)}
              placeholder="ឧទាហរណ៍៖ អាហារពេលល្ងាចដ៏ឈ្ងុយឆ្ងាញ់នៅមាត់ស្ទឹងបាត់ដំបង!"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              {language === 'km' ? 'ការពិពណ៌នា / រូបមន្ត / ការចែករំលែក *' : 'Description / Recipe / Experience *'}
            </label>
            <textarea
              rows={3}
              required
              value={descriptionKh}
              onChange={(e) => setDescriptionKh(e.target.value)}
              placeholder="សរសេររៀបរាប់ពីរសជាតិអាហារ របៀបចម្អិន ឬបទពិសោធន៍ដើរលេង..."
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Tag & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                <Tag className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                {language === 'km' ? 'ស្លាកប្រធានបទ' : 'Category Tag'}
              </label>
              <select
                value={categoryTag}
                onChange={(e) => setCategoryTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              >
                <option value="ម្ហូបខ្មែរ">ម្ហូបខ្មែរ (Khmer Food)</option>
                <option value="រូបមន្តម្ហូប">រូបមន្តម្ហូប (Cooking Recipe)</option>
                <option value="ហាងអាហារឆ្ងាញ់">ហាងអាហារឆ្ងាញ់ (Food Review)</option>
                <option value="ដំណើរកម្សាន្ត">ដំណើរកម្សាន្ត (Travel / Tour)</option>
                <option value="គ្រឿងសមុទ្រ">គ្រឿងសមុទ្រ (Seafood)</option>
                <option value="បង្អែម & ភេសជ្ជៈ">បង្អែម & ភេសជ្ជៈ (Dessert & Drink)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
                {language === 'km' ? 'ទីតាំង / ខេត្ត' : 'Location / Province'}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="រាជធានីភ្នំពេញ, សៀមរាប..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Photo URL & Presets */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              <Image className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
              {language === 'km' ? 'រូបភាពដែលត្រូវបង្ហោះ (Photo URL)' : 'Photo URL'}
            </label>
            <input
              type="url"
              required
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 mb-2"
            />

            <p className="text-[10px] text-stone-400 mb-1">
              {language === 'km' ? 'ជ្រើសរើសរូបភាពគំរូស្អាតៗ៖' : 'Or choose a photo from presets:'}
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {samplePhotos.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setPhotoUrl(url)}
                  className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                    photoUrl === url ? 'border-amber-500 ring-2 ring-amber-300' : 'border-transparent opacity-75 hover:opacity-100'
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
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {language === 'km' ? 'បង្ហោះទៅកាន់សហគមន៍' : 'Publish to Community Feed'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
