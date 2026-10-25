import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WelcomeSlides } from './welcome/WelcomeSlides';

// Existing storage keys: DO NOT rename (they are already stored on users' devices).
export const WELCOME_SESSION_KEY = 'kft_welcome_shown_session_v3';
export const WELCOME_LOCAL_KEY = 'kft_welcome_shown_v3';

export type WelcomeTargetSection = 'home';

interface WelcomeScreenModalProps {
  onComplete: (targetSection?: WelcomeTargetSection) => void;
}

/**
 * Single Angkor Wat Welcome Screen shown once per app session, featuring:
 * - Language selection (KM | EN | 中)
 * - "Works Offline — No Internet Required" badge
 * - One clear "Get Started" button
 */
export const WelcomeScreenModal: React.FC<WelcomeScreenModalProps> = ({ onComplete }) => {
  const { language, setLanguage } = useApp();
  const [isExiting, setIsExiting] = useState(false);

  const handleProceed = (targetSection: WelcomeTargetSection = 'home') => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, 'true');
      localStorage.setItem(WELCOME_LOCAL_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setTimeout(() => {
      onComplete(targetSection);
    }, 120);
  };

  return (
    <div
      className={`fixed inset-0 z-[120] bg-slate-950 font-khmer transition-opacity duration-200 motion-reduce:transition-none ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <WelcomeSlides language={language} onLanguage={setLanguage} onFinish={() => handleProceed('home')} />
    </div>
  );
};
