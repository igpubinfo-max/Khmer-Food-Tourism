import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Kept for prop compatibility; native touch scroll uses 0% idle CPU/GPU. */
  durationSec?: number;
  className?: string;
}

/**
 * Hardware-accelerated horizontal touch scroller.
 * Renders children once (cutting DOM nodes & image decoders in half) and eliminates
 * continuous 60fps marquee translation that caused mobile GPU overheating.
 */
export const AutoMarquee: React.FC<Props> = ({ children, className = '' }) => {
  return (
    <div className={`kft-marquee-viewport kft-hscroll -mx-2.5 min-[360px]:-mx-3.5 sm:-mx-5 overflow-x-auto no-scrollbar ${className}`}>
      <div className="flex w-max gap-3 px-2.5 min-[360px]:px-3.5 sm:px-5">
        {children}
      </div>
    </div>
  );
};
