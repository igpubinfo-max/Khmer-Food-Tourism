import { useEffect } from 'react';

let lockCount = 0;
let savedMainOverflowY = '';

/**
 * Locks background scrolling of the single App Shell scroll container (#kft-main-scroll)
 * while any modal is open. Avoids mutating body.style.position = 'fixed' or window.scrollTo,
 * preventing viewport reflows, layout jumps, and header/bottom-nav jitter on Android WebView.
 */
export function useBodyScrollLock(locked = true): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const body = document.body;
    const getMainScroll = () => document.getElementById('kft-main-scroll');

    if (!locked) {
      if (lockCount <= 0) {
        lockCount = 0;
        body.classList.remove('kft-modal-open');
        const mainEl = getMainScroll();
        if (mainEl && mainEl.style.overflowY === 'hidden') {
          mainEl.style.overflowY = savedMainOverflowY;
        }
      }
      return;
    }

    if (lockCount === 0) {
      body.classList.add('kft-modal-open');
      const mainEl = getMainScroll();
      if (mainEl) {
        savedMainOverflowY = mainEl.style.overflowY;
        mainEl.style.overflowY = 'hidden';
      }
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        body.classList.remove('kft-modal-open');
        const mainEl = getMainScroll();
        if (mainEl) {
          mainEl.style.overflowY = savedMainOverflowY;
        }
      }
    };
  }, [locked]);
}
