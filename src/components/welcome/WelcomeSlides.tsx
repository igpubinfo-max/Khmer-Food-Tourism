import React, { useRef, useState } from 'react';
import type { Language } from '../../types';
import { WELCOME_SLIDES, WELCOME_LABELS } from './welcomeContent';
import { WelcomeTopBar } from './WelcomeTopBar';

interface Props {
  language: Language;
  onLanguage: (lang: Language) => void;
  onFinish: () => void;
}

const SWIPE_THRESHOLD = 50;

/** First-time intro: 3 full-bleed photo slides, swipeable, with dots and one big gold-orange button. */
export const WelcomeSlides: React.FC<Props> = ({ language, onLanguage, onFinish }) => {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);
  const last = index === WELCOME_SLIDES.length - 1;

  const go = (i: number) => setIndex(Math.max(0, Math.min(WELCOME_SLIDES.length - 1, i)));
  const next = () => (last ? onFinish() : go(index + 1));

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, locked: null };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.locked = Math.abs(dx) > Math.abs(dy);
    if (s.locked) {
      // rubber-band at the edges
      const atEdge = (index === 0 && dx > 0) || (last && dx < 0);
      setDragX(atEdge ? dx * 0.25 : dx);
    }
  };
  const endDrag = () => {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (s?.locked) {
      if (dragX <= -SWIPE_THRESHOLD) go(index + 1);
      else if (dragX >= SWIPE_THRESHOLD) go(index - 1);
    }
    setDragX(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-slate-950 select-none"
      role="region"
      aria-roledescription="carousel"
      aria-label={WELCOME_LABELS.appName[language]}
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => dragging && endDrag()}
    >
      {/* Slide track */}
      <div
        className={`flex h-full w-full ${dragging ? '' : 'transition-transform duration-300 ease-out motion-reduce:transition-none'}`}
        style={{ transform: `translateX(calc(${-index * 100}% + ${dragX}px))` }}
      >
        {WELCOME_SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="relative h-full w-full shrink-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${WELCOME_SLIDES.length}`}
            aria-hidden={i !== index}
          >
            <img
              src={slide.image}
              alt=""
              width={slide.imageWidth}
              height={slide.imageHeight}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: slide.objectPosition }}
            />
            {/* Strong gradients so text stays readable on any photo */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none" />

            <div
              className="absolute inset-x-0 bottom-0 px-6 text-white"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 200px)' }}
            >
              <h2
                className={`font-extrabold leading-snug ${language === 'km' ? 'font-moul text-2xl' : 'text-3xl'}`}
                style={{ textShadow: '0 2px 14px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.9)' }}
              >
                {slide.headline[language]}
              </h2>
              <p
                className="mt-2 text-base font-medium text-white/95 leading-relaxed"
                style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
              >
                {slide.sub[language]}
              </p>
            </div>
          </div>
        ))}
      </div>

      <WelcomeTopBar language={language} onLanguage={onLanguage} onSkip={onFinish} skipLabel={WELCOME_LABELS.skip[language]} />

      {/* Bottom controls: dots + ONE big button */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 px-6 flex flex-col items-center gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        <div className="flex items-center justify-center" role="tablist" aria-label="Slides">
          {WELCOME_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1} / ${WELCOME_SLIDES.length}`}
              onClick={() => go(i)}
              className="w-11 h-11 flex items-center justify-center cursor-pointer"
            >
              <span
                className={`block h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  i === index ? 'w-7 bg-amber-400' : 'w-2.5 bg-white/55'
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="w-full max-w-sm min-h-[56px] rounded-full bg-gradient-to-r from-[#f6c343] via-[#f08c2b] to-[#e05326] hover:brightness-105 active:scale-[0.98] transition motion-reduce:transition-none text-white text-lg font-extrabold tracking-wide shadow-[0_10px_26px_rgba(224,83,38,0.45)] cursor-pointer"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
        >
          {last ? WELCOME_LABELS.start[language] : WELCOME_LABELS.next[language]}
        </button>
      </div>
    </div>
  );
};
