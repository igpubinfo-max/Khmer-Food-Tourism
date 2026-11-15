import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WelcomeSlides } from './welcome/WelcomeSlides';
import { openNearMeModal } from '../utils/nearMeNavigation';

// Existing storage keys: DO NOT rename (they are already stored on users' devices).
export const WELCOME_SESSION_KEY = 'kft_welcome_shown_session_v3';
export const WELCOME_LOCAL_KEY = 'kft_welcome_shown_v3';

export type WelcomeTargetSection = 'home' | 'food' | 'tourism' | 'profile';
export type WelcomeTargetAction =
  | 'home'
  | 'food'
  | 'tourism'
  | 'favorites'
  | 'map'
  | 'ai_assistant'
  | 'healthy'
  | 'what_to_eat'
  | 'discover_places'
  | 'scan_qr';

interface WelcomeScreenModalProps {
  onComplete: (targetSection?: WelcomeTargetSection) => void;
}

/**
 * Angkor Wat & AI Robot Welcome Screen shown once per app session:
 * - Language selection (ខ្មែរ | EN | 中文)
 * - App Logo & Title (រសជាតិ និងទេសចរណ៍កម្ពុជា / Cambodia Flavors & Tourism)
 * - 4 Feature Tiles (ម្ហូបខ្មែរ, ទេសចរណ៍, ចំណូលចិត្ត, ផែនទី)
 * - AI Food & Travel Assistant bar + 3 Quick Actions (សុខភាព និងអាហារូបត្ថម្ភ, មុខម្ហូបគួរឱ្យចង់ញ៉ាំថ្ងៃនេះ, ស្វែងរកទីកន្លែងដើរលេងសម្រាប់ថ្ងៃនេះ)
 * - "ចាប់ផ្តើមប្រើប្រាស់ >" CTA button + "ប្រើបានទោះគ្មានអ៊ីនធឺណិត" offline badge
 */
export const WelcomeScreenModal: React.FC<WelcomeScreenModalProps> = ({ onComplete }) => {
  const {
    language,
    setLanguage,
    setActiveTab,
    setIsWhatToEatModalOpen,
    setIsNearMeModalOpen,
  } = useApp();
  const [isExiting, setIsExiting] = useState(false);

  const handleProceed = (action: WelcomeTargetAction = 'home') => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, 'true');
      localStorage.setItem(WELCOME_LOCAL_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setTimeout(() => {
      if (action === 'food') {
        onComplete('food');
        setActiveTab('food');
      } else if (action === 'tourism' || action === 'discover_places') {
        onComplete('tourism');
        setActiveTab('tourism');
      } else if (action === 'favorites') {
        onComplete('profile');
        setActiveTab('profile');
      } else if (action === 'map') {
        onComplete('home');
        openNearMeModal(setIsNearMeModalOpen);
      } else if (action === 'ai_assistant') {
        onComplete('home');
        (window as any).__kft_wte_mode = 'assistant';
        setIsWhatToEatModalOpen(true);
      } else if (action === 'healthy') {
        onComplete('home');
        (window as any).__kft_wte_open_health = true;
        setIsWhatToEatModalOpen(true);
      } else if (action === 'what_to_eat') {
        onComplete('home');
        (window as any).__kft_wte_mode = 'picks';
        setIsWhatToEatModalOpen(true);
      } else if (action === 'scan_qr') {
        onComplete('home');
        (window as any).__kft_wte_open_camera = true;
        setIsWhatToEatModalOpen(true);
      } else {
        onComplete('home');
      }
    }, 120);
  };

  return (
    <div
      className={`fixed inset-0 z-[120] bg-[#12151C] font-khmer transition-opacity duration-200 motion-reduce:transition-none ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <WelcomeSlides
        language={language}
        onLanguage={setLanguage}
        onFinish={(action) => handleProceed(action || 'home')}
      />
    </div>
  );
};
