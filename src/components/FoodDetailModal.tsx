import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Heart, Clock, Users, Flame, ChefHat, 
  Share2, CheckCircle2, Circle, Volume2, Sparkles, Send
} from 'lucide-react';

export const FoodDetailModal: React.FC = () => {
  const { selectedFood, setSelectedFood, language, isBookmarked, toggleBookmark, showToast } = useApp();
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!selectedFood) return null;

  const bookmarked = isBookmarked(selectedFood.id);

  const toggleIngredient = (index: number) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Text to Speech for Khmer Recipe
  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      showToast(language === 'km' ? 'កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រសម្លេងអានទេ' : 'Speech synthesis not supported', 'warning');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = language === 'km'
      ? `${selectedFood.nameKh}។ ${selectedFood.descriptionKh}។ គ្រឿងផ្សំរួមមាន៖ ${selectedFood.ingredients.map(i => i.nameKh).join(', ')}។`
      : `${selectedFood.nameEn}. ${selectedFood.descriptionEn}. Ingredients include: ${selectedFood.ingredients.map(i => i.nameEn).join(', ')}.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = language === 'km' ? 'km-KH' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    showToast(language === 'km' ? 'កំពុងអានព័ត៌មានមុខម្ហូប...' : 'Reading recipe audio...', 'info');
  };

  // Social Sharing
  const handleShareTelegram = () => {
    const text = encodeURIComponent(`សូមមើលមុខម្ហូបខ្មែរឆ្ងាញ់ៗ៖ ${selectedFood.nameKh} (${selectedFood.nameEn})\n${selectedFood.descriptionKh}`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast(language === 'km' ? 'បានចម្លងតំណភ្ជាប់រួចរាល់!' : 'Link copied to clipboard!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-lg h-[90vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => {
              if (isSpeaking) window.speechSynthesis.cancel();
              setSelectedFood(null);
            }}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white shadow pointer-events-auto transition active:scale-90"
            title="បិទ"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Audio Reader */}
            <button
              onClick={handleSpeak}
              className={`p-2.5 rounded-full backdrop-blur-md shadow transition active:scale-90 ${
                isSpeaking ? 'bg-amber-500 text-white animate-pulse' : 'bg-black/50 hover:bg-black/70 text-white'
              }`}
              title="ស្តាប់សម្លេងអានរូបមន្ត"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Bookmark */}
            <button
              onClick={() => toggleBookmark(selectedFood.id)}
              className={`p-2.5 rounded-full backdrop-blur-md shadow transition active:scale-90 ${
                bookmarked ? 'bg-rose-500 text-white' : 'bg-black/50 hover:bg-black/70 text-white'
              }`}
              title="រក្សាទុក"
            >
              <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 no-scrollbar pb-6">
          {/* Hero Image */}
          <div className="relative h-64 sm:h-72 w-full bg-stone-800">
            <img 
              src={selectedFood.photoUrl} 
              alt={selectedFood.nameKh}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Bottom info inside hero */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-amber-950 shadow mb-2 inline-block">
                {language === 'km' ? selectedFood.categoryKh : selectedFood.categoryEn}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-moul leading-snug drop-shadow">
                {language === 'km' ? selectedFood.nameKh : selectedFood.nameEn}
              </h2>
              <p className="text-xs text-amber-200/90 font-medium">
                {language === 'km' ? selectedFood.nameEn : selectedFood.nameKh}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Meta Rating & Category Bar (No Prices) */}
            <div className="flex items-center justify-between p-3.5 bg-amber-50/80 dark:bg-stone-800/80 rounded-2xl border border-amber-200/60 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-amber-600 text-white font-bold text-xs font-khmer">
                  {language === 'km' ? selectedFood.categoryKh : selectedFood.categoryEn}
                </span>
                <span className="text-xs text-stone-500 font-khmer">
                  {language === 'km' ? 'មុខម្ហូបខ្មែរប្រពៃណី' : 'Traditional Khmer Recipe'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-700 shadow-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  ★ {selectedFood.rating} <span className="font-normal text-stone-400">({selectedFood.reviewCount})</span>
                </span>
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                <Clock className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                <p className="text-[10px] text-stone-400">{language === 'km' ? 'ចម្អិន' : 'Cook'}</p>
                <p className="text-xs font-bold text-stone-700 dark:text-stone-200">{selectedFood.cookTime}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                <Users className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                <p className="text-[10px] text-stone-400">{language === 'km' ? 'ចំណុះ' : 'Serves'}</p>
                <p className="text-xs font-bold text-stone-700 dark:text-stone-200">{selectedFood.servings}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                <Flame className="w-4 h-4 mx-auto text-orange-600 mb-1" />
                <p className="text-[10px] text-stone-400">{language === 'km' ? 'ថាមពល' : 'Energy'}</p>
                <p className="text-xs font-bold text-stone-700 dark:text-stone-200">{selectedFood.calories} cal</p>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                <ChefHat className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <p className="text-[10px] text-stone-400">{language === 'km' ? 'កម្រិត' : 'Level'}</p>
                <p className="text-xs font-bold text-stone-700 dark:text-stone-200">
                  {selectedFood.difficulty === 'easy' ? 'ងាយ' : selectedFood.difficulty === 'medium' ? 'មធ្យម' : 'ជំនាញ'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {language === 'km' ? 'អំពីមុខម្ហូបនេះ' : 'About this Dish'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50/70 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800">
                {language === 'km' ? selectedFood.descriptionKh : selectedFood.descriptionEn}
              </p>
            </div>

            {/* Ingredients Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                  {language === 'km' ? 'គ្រឿងផ្សំចាំបាច់' : 'Ingredients Needed'}
                </h3>
                <span className="text-[11px] text-stone-400">
                  {Object.values(checkedIngredients).filter(Boolean).length} / {selectedFood.ingredients.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedFood.ingredients.map((ing, idx) => {
                  const isChecked = !!checkedIngredients[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleIngredient(idx)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition border text-xs ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 line-through opacity-70'
                          : 'bg-white dark:bg-stone-800 border-stone-200/80 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                        <span className="font-medium">{language === 'km' ? ing.nameKh : ing.nameEn}</span>
                      </div>
                      <span className="font-semibold text-stone-500 dark:text-stone-400 text-[11px]">{ing.amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step Cooking Directions */}
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-2.5">
                {language === 'km' ? 'របៀបធ្វើ និងវិធីចម្អិនតាមលំដាប់' : 'Step-by-Step Instructions'}
              </h3>

              <div className="space-y-3">
                {selectedFood.steps.map((st) => (
                  <div 
                    key={st.stepNumber}
                    className="p-3.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {st.stepNumber}
                      </span>
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-normal pt-0.5">
                        {language === 'km' ? st.instructionKh : st.instructionEn}
                      </p>
                    </div>

                    {st.tipKh && (
                      <div className="ml-8 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 text-[11px] text-amber-800 dark:text-amber-300">
                        💡 {st.tipKh}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Social Share Bar */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
              <p className="text-xs font-semibold text-stone-500 mb-2.5 text-center">
                {language === 'km' ? 'ចែករំលែកមុខម្ហូបនេះទៅកាន់មិត្តភក្តិ' : 'Share this recipe with friends'}
              </p>
              
              <div className="flex items-center justify-center gap-3">
                {/* Telegram */}
                <button
                  onClick={handleShareTelegram}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] text-white text-xs font-bold shadow hover:brightness-105"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram
                </button>

                {/* Facebook */}
                <button
                  onClick={handleShareFacebook}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold shadow hover:brightness-105"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Facebook
                </button>

                {/* Copy link */}
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-medium border border-stone-300 dark:border-stone-600 hover:bg-stone-200"
                >
                  {language === 'km' ? 'ចម្លងតំណ' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
