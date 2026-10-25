import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WelcomeSlides } from './welcome/WelcomeSlides';
import { WelcomeSplash } from './welcome/WelcomeSplash';

// Existing storage keys: DO NOT rename (they are already stored on users' devices).
export const WELCOME_SESSION_KEY = 'kft_welcome_shown_session_v3';
export const WELCOME_LOCAL_KEY = 'kft_welcome_shown_v3';

export type WelcomeTargetSection = 'home';

interface WelcomeScreenModalProps {
  onComplete: (targetSection?: WelcomeTargetSection) => void;
}

const hasSeenIntroBefore = (): boolean => {
  try {
    return localStorage.getItem(WELCOME_LOCAL_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * First-time users: swipeable 3-slide intro.
 * Returning users (WELCOME_LOCAL_KEY === 'true'): a ~1.2s splash (tap to skip), then straight into the app.
 */
export const WelcomeScreenModal: React.FC<WelcomeScreenModalProps> = ({ onComplete }) => {
  const { language, setLanguage } = useApp();
  const [isReturning] = useState<boolean>(hasSeenIntroBefore);
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
      {isReturning ? (
        <WelcomeSplash language={language} onDone={() => handleProceed('home')} />
      ) : (
        <WelcomeSlides language={language} onLanguage={setLanguage} onFinish={() => handleProceed('home')} />
      )}
    </div>
  );
};
