import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;
let savedBodyPosition = '';
let savedBodyTop = '';
let savedBodyLeft = '';
let savedBodyRight = '';
let savedBodyWidth = '';
let savedBodyOverflow = '';
let savedHtmlOverflow = '';

/**
 * Locks background page scrolling while a modal is open.
 * Works on Android, iOS, and desktop without layout jumps or scroll-position changes.
 * Ref-counted so nested or transitioning modals safely restore scrolling only when the last one closes.
 */
export function useBodyScrollLock(locked = true): void {
  useEffect(() => {
    if (!locked || typeof window === 'undefined' || typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;

    if (lockCount === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
      savedBodyPosition = body.style.position;
      savedBodyTop = body.style.top;
      savedBodyLeft = body.style.left;
      savedBodyRight = body.style.right;
      savedBodyWidth = body.style.width;
      savedBodyOverflow = body.style.overflow;
      savedHtmlOverflow = html.style.overflow;

      body.style.position = 'fixed';
      body.style.top = `-${savedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        const y = savedScrollY;
        body.style.position = savedBodyPosition;
        body.style.top = savedBodyTop;
        body.style.left = savedBodyLeft;
        body.style.right = savedBodyRight;
        body.style.width = savedBodyWidth;
        body.style.overflow = savedBodyOverflow;
        html.style.overflow = savedHtmlOverflow;
        window.scrollTo(0, y);
      }
    };
  }, [locked]);
}
