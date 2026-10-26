import React, { useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  /** Seconds for one full loop. */
  durationSec?: number;
  className?: string;
}

/**
 * Slow, continuous right-to-left auto-scroll (marquee). Content is rendered twice for a seamless loop.
 * Pauses while the user touches/hovers, when scrolled off-screen, or when the page/tab is hidden;
 * disabled under prefers-reduced-motion (falls back to manual swipe).
 */
export const AutoMarquee: React.FC<Props> = ({ children, durationSec = 40, className = '' }) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          setInView(entries[0].isIntersecting);
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const isPaused = !inView || !pageVisible;

  return (
    <div ref={viewportRef} className={`kft-marquee-viewport -mx-4 overflow-hidden ${className}`}>
      <div
        className={`kft-marquee-track flex w-max gap-3 px-4 ${isPaused ? 'kft-marquee-paused' : ''}`}
        style={{ animationDuration: `${durationSec}s` }}
      >
        <div className="flex gap-3 shrink-0">{children}</div>
        <div className="flex gap-3 shrink-0" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
};
