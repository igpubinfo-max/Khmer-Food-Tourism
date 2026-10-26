import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Seconds for one full loop. */
  durationSec?: number;
  className?: string;
}

/**
 * Slow, continuous right-to-left auto-scroll (marquee). Content is rendered twice for a seamless loop.
 * Pauses while the user touches/hovers; disabled under prefers-reduced-motion (falls back to manual swipe).
 */
export const AutoMarquee: React.FC<Props> = ({ children, durationSec = 40, className = '' }) => (
  <div className={`kft-marquee-viewport -mx-4 overflow-hidden ${className}`}>
    <div className="kft-marquee-track flex w-max gap-3 px-4" style={{ animationDuration: `${durationSec}s` }}>
      <div className="flex gap-3 shrink-0">{children}</div>
      <div className="flex gap-3 shrink-0" aria-hidden="true">{children}</div>
    </div>
  </div>
);
