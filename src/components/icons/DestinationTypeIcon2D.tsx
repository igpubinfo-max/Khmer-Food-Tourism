import React from 'react';
import type { TouristDestination } from '../../types';
import { resolveDestinationIcon2DKind, type DestinationIcon2DKind } from '../../utils/destinationIconClassifier';

export { resolveDestinationIcon2DKind, type DestinationIcon2DKind };

const KIND_GRADIENTS: Record<DestinationIcon2DKind, string> = {
  temple: 'linear-gradient(145deg, #D97706 0%, #92400E 55%, #451A03 100%)',
  pagoda: 'linear-gradient(145deg, #F59E0B 0%, #B45309 55%, #78350F 100%)',
  waterfall: 'linear-gradient(145deg, #06B6D4 0%, #0284C7 55%, #0C4A6E 100%)',
  cable_car: 'linear-gradient(145deg, #10B981 0%, #047857 55%, #064E3B 100%)',
  diving_coral: 'linear-gradient(145deg, #0EA5E9 0%, #0369A1 55%, #082F49 100%)',
  beach: 'linear-gradient(145deg, #38BDF8 0%, #0284C7 55%, #1E3A8A 100%)',
  mountain: 'linear-gradient(145deg, #059669 0%, #065F46 55%, #022C22 100%)',
  kayak_river: 'linear-gradient(145deg, #14B8A6 0%, #0D9488 55%, #115E59 100%)',
  wildlife_eco: 'linear-gradient(145deg, #22C55E 0%, #15803D 55%, #14532D 100%)',
  golf: 'linear-gradient(145deg, #16A34A 0%, #15803D 55%, #052E16 100%)',
  martial_arts: 'linear-gradient(145deg, #EF4444 0%, #B91C1C 55%, #450A0A 100%)',
  water_park: 'linear-gradient(145deg, #06B6D4 0%, #2563EB 55%, #1E3A8A 100%)',
  horse_riding: 'linear-gradient(145deg, #D97706 0%, #9A3412 55%, #431407 100%)',
  atv_offroad: 'linear-gradient(145deg, #EA580C 0%, #9A3412 55%, #431407 100%)',
  bamboo_train: 'linear-gradient(145deg, #CA8A04 0%, #854D0E 55%, #422006 100%)',
  cycling: 'linear-gradient(145deg, #F97316 0%, #C2410C 55%, #7C2D12 100%)',
  souvenir_craft: 'linear-gradient(145deg, #EC4899 0%, #BE185D 55%, #831843 100%)',
  agro_farm: 'linear-gradient(145deg, #65A30D 0%, #3F6212 55%, #1A2E05 100%)',
  local_market: 'linear-gradient(145deg, #E11D48 0%, #9F1239 55%, #4C0519 100%)',
  museum_palace: 'linear-gradient(145deg, #8B5CF6 0%, #6D28D9 55%, #3B0764 100%)',
  hotel: 'linear-gradient(145deg, #F59E0B 0%, #D97706 55%, #78350F 100%)',
};

export interface DestinationTypeIcon2DProps {
  destination?: Partial<TouristDestination> | null;
  categorySlug?: string;
  className?: string;
}

export const DestinationTypeIcon2D: React.FC<DestinationTypeIcon2DProps> = React.memo(
  ({ destination, categorySlug, className = 'w-14 h-14 rounded-xl' }) => {
    const kind = resolveDestinationIcon2DKind(destination, categorySlug);
    const bgGradient = KIND_GRADIENTS[kind];

    return (
      <div
        data-dest-avatar="default-dest-icon"
        data-dest-icon-kind={kind}
        style={{ background: bgGradient }}
        className={`relative overflow-hidden shadow-xs shrink-0 select-none flex items-center justify-center text-white ${className}`}
      >
        {kind === 'temple' ? (
          <img
            src="/categories/icon_temple_2d.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover scale-[1.06] pointer-events-none select-none"
          />
        ) : (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[82%] h-[82%] drop-shadow-xs"
          aria-hidden="true"
        >

          {kind === 'pagoda' && (
            <>
              <circle cx="48" cy="16" r="6" fill="#FEF08A" fillOpacity="0.85" />
              <path d="M32 9L34 15H30L32 9Z" fill="#FEF08A" />
              <path
                d="M14 25L32 14L50 25H14Z"
                fill="#FDE047"
                stroke="#FFFBEB"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M10 33L32 21L54 33H10Z"
                fill="#FACC15"
                stroke="#FFFBEB"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="16" y="33" width="32" height="13" fill="#FFFBEB" rx="1" />
              <rect x="22" y="35" width="4" height="11" fill="#D97706" />
              <rect x="30" y="35" width="4" height="11" fill="#B45309" />
              <rect x="38" y="35" width="4" height="11" fill="#D97706" />
              <rect x="12" y="46" width="40" height="5" rx="1.5" fill="#FDE68A" />
            </>
          )}

          {kind === 'waterfall' && (
            <>
              <path d="M8 16H22L20 44H8V16ZM42 16H56V44H44L42 16Z" fill="#0F766E" />
              <path d="M22 14H42L46 44H18L22 14Z" fill="#E0F2FE" />
              <path
                d="M27 16V42M32 14V44M37 16V42"
                stroke="#38BDF8"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="23" cy="45" r="4.5" fill="#FFFFFF" fillOpacity="0.92" />
              <circle cx="32" cy="44" r="5.5" fill="#FFFFFF" fillOpacity="0.95" />
              <circle cx="41" cy="45" r="4.5" fill="#FFFFFF" fillOpacity="0.92" />
              <path
                d="M10 52C18 49 26 55 34 52C42 49 48 54 54 52"
                stroke="#BAE6FD"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </>
          )}

          {kind === 'cable_car' && (
            <>
              <path d="M8 22L56 12" stroke="#FEF3C7" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M32 17V25" stroke="#FDE68A" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="32" cy="17" r="2.8" fill="#FBBF24" />
              <rect x="20" y="25" width="24" height="17" rx="4" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="1.8" />
              <rect x="23" y="28" width="7" height="7" rx="1.5" fill="#0F172A" fillOpacity="0.75" />
              <rect x="34" y="28" width="7" height="7" rx="1.5" fill="#0F172A" fillOpacity="0.75" />
              <path d="M6 54L18 39L28 54H6ZM34 54L48 36L58 54H34Z" fill="#A7F3D0" fillOpacity="0.75" />
            </>
          )}

          {kind === 'diving_coral' && (
            <>
              {/* Air bubbles */}
              <circle cx="46" cy="14" r="2.2" fill="#E0F2FE" />
              <circle cx="51" cy="20" r="1.6" fill="#BAE6FD" />
              {/* 2D Scuba Diving Mask & Snorkel Tube */}
              <rect x="12" y="18" width="30" height="15" rx="6" fill="#FDE047" stroke="#FFFFFF" strokeWidth="2" />
              <rect x="15" y="21" width="10" height="9" rx="3" fill="#0284C7" />
              <rect x="29" y="21" width="10" height="9" rx="3" fill="#0284C7" />
              <path
                d="M46 14V34C46 38 42 40 38 40H34"
                stroke="#F97316"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              {/* Coral Reef & Tropical Fish below */}
              <path
                d="M14 54V45C14 42 10 41 10 38M14 48C18 48 20 45 20 42M28 54V44C28 41 32 40 32 37"
                stroke="#FB7185"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path d="M40 48L47 44L47 52L40 48Z" fill="#FDE047" />
              <circle cx="41" cy="48" r="4" fill="#FBBF24" />
            </>
          )}

          {kind === 'golf' && (
            <>
              {/* Sun */}
              <circle cx="18" cy="18" r="5.5" fill="#FDE047" />
              {/* Putting green hill */}
              <path d="M8 48C18 41 44 41 56 48V54H8V48Z" fill="#86EFAC" />
              {/* Golf hole & Flagstick */}
              <ellipse cx="30" cy="46" rx="5.5" ry="2.2" fill="#064E3B" />
              <path d="M30 46V13" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M30 13L46 19L30 25V13Z" fill="#EF4444" stroke="#FEF2F2" strokeWidth="1.2" strokeLinejoin="round" />
              {/* Golf ball on tee */}
              <circle cx="45" cy="41" r="4.2" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.2" />
              <path d="M45 45V49" stroke="#FEF08A" strokeWidth="2.2" strokeLinecap="round" />
            </>
          )}

          {kind === 'martial_arts' && (
            <>
              {/* Championship star/crown */}
              <path d="M24 16L28 11L32 15L36 11L40 16H24Z" fill="#FDE047" />
              {/* Pair of 2D Kun Khmer Boxing Gloves */}
              <path
                d="M14 30C14 23 20 20 26 22C29 23 30 27 29 32L26 40H16L14 30Z"
                fill="#FBBF24"
                stroke="#FFFBEB"
                strokeWidth="1.8"
              />
              <rect x="15" y="40" width="11" height="6" rx="1.5" fill="#FEF3C7" />
              <path
                d="M50 30C50 23 44 20 38 22C35 23 34 27 35 32L38 40H48L50 30Z"
                fill="#F59E0B"
                stroke="#FFFBEB"
                strokeWidth="1.8"
              />
              <rect x="38" y="40" width="11" height="6" rx="1.5" fill="#FEF3C7" />
              {/* Ring ropes */}
              <path d="M10 51H54" stroke="#FDE68A" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {kind === 'water_park' && (
            <>
              <circle cx="48" cy="15" r="5.5" fill="#FDE047" />
              {/* Curving 2D Water Slide */}
              <path
                d="M14 14H26C26 26 42 26 42 38H28C28 30 14 30 14 14Z"
                fill="#FBBF24"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Ladder */}
              <path d="M16 18V40M21 18V40M16 24H21M16 30H21" stroke="#E0F2FE" strokeWidth="1.8" strokeLinecap="round" />
              {/* Splash pool waves */}
              <path
                d="M10 46C18 42 26 49 34 45C42 41 48 48 54 45M14 52C22 49 30 54 38 51C44 49 49 52 52 51"
                stroke="#BAE6FD"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </>
          )}

          {kind === 'horse_riding' && (
            <>
              {/* Golden Horseshoe Frame */}
              <path
                d="M20 46C15 40 15 26 22 19C27 14 37 14 42 19C49 26 49 40 44 46"
                stroke="#FDE68A"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* 2D Horse Head & Mane Silhouette */}
              <path
                d="M25 44V30L22 26L27 21L33 18L36 22L42 27L39 32L33 30V44H25Z"
                fill="#FFFBEB"
              />
              <circle cx="33" cy="24" r="1.5" fill="#78350F" />
              <path d="M14 51H50" stroke="#FCD34D" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {kind === 'atv_offroad' && (
            <>
              <circle cx="48" cy="16" r="5.5" fill="#FDE047" />
              {/* ATV Body & Handlebars */}
              <path d="M22 22H30L33 28H20L22 22Z" fill="#FDE047" />
              <path d="M14 29H48L51 37H12L14 29Z" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
              {/* Big Off-road Wheels */}
              <circle cx="20" cy="41" r="7.5" fill="#1E293B" stroke="#FFFBEB" strokeWidth="2.2" />
              <circle cx="20" cy="41" r="2.8" fill="#FBBF24" />
              <circle cx="44" cy="41" r="7.5" fill="#1E293B" stroke="#FFFBEB" strokeWidth="2.2" />
              <circle cx="44" cy="41" r="2.8" fill="#FBBF24" />
              <path d="M8 52H56" stroke="#FDBA74" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {kind === 'bamboo_train' && (
            <>
              <circle cx="48" cy="16" r="5.5" fill="#FEF08A" />
              {/* Travelers / Umbrella shade on Bamboo Platform */}
              <path d="M20 22L32 15L44 22H20Z" fill="#FDE047" stroke="#FFFBEB" strokeWidth="1.5" />
              <path d="M32 22V34" stroke="#FFFBEB" strokeWidth="2.2" />
              {/* Woven Bamboo Deck (Norry) */}
              <rect x="12" y="34" width="40" height="6" rx="2" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="1.6" />
              {/* Steel Rail Wheels */}
              <circle cx="20" cy="44" r="4.5" fill="#FEF3C7" stroke="#78350F" strokeWidth="2" />
              <circle cx="44" cy="44" r="4.5" fill="#FEF3C7" stroke="#78350F" strokeWidth="2" />
              {/* Railway Track & Sleepers */}
              <path d="M8 50H56M14 50V53M26 50V53M38 50V53M50 50V53" stroke="#FEF08A" strokeWidth="2.2" strokeLinecap="round" />
            </>
          )}

          {kind === 'beach' && (
            <>
              <circle cx="46" cy="18" r="7" fill="#FDE047" />
              <path
                d="M20 44C20 34 23 26 28 19"
                stroke="#FEF3C7"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M28 19C21 17 16 20 14 23M28 19C24 13 18 13 15 15M28 19C33 14 39 16 41 20M28 19C34 19 37 23 38 26"
                stroke="#86EFAC"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path d="M8 46C18 41 32 42 44 47H8Z" fill="#FDE68A" />
              <path
                d="M8 51C16 48 24 53 32 50C40 47 48 53 56 50"
                stroke="#E0F2FE"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </>
          )}

          {kind === 'mountain' && (
            <>
              <circle cx="46" cy="18" r="6.5" fill="#FDE047" />
              <path d="M8 50L25 20L40 50H8Z" fill="#A7F3D0" />
              <path d="M24 50L40 24L56 50H24Z" fill="#6EE7B7" />
              <path d="M25 20L30 29L25 27L20 29L25 20Z" fill="#ECFDF5" />
              <path
                d="M12 22H22M42 32H54"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeOpacity="0.85"
              />
            </>
          )}

          {kind === 'kayak_river' && (
            <>
              <circle cx="48" cy="16" r="5.5" fill="#FDE68A" />
              <path
                d="M12 36C20 43 44 43 52 36L47 31H17L12 36Z"
                fill="#FBBF24"
                stroke="#FFFBEB"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M22 22L42 42" stroke="#FFFBEB" strokeWidth="2.2" strokeLinecap="round" />
              <rect x="19" y="19" width="6" height="4" rx="1" transform="rotate(45 19 19)" fill="#FEF08A" />
              <rect x="41" y="41" width="6" height="4" rx="1" transform="rotate(45 41 41)" fill="#FEF08A" />
              <path
                d="M10 48C18 45 26 51 34 48C42 45 48 51 54 48"
                stroke="#CCFBF1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </>
          )}

          {kind === 'wildlife_eco' && (
            <>
              <circle cx="46" cy="16" r="5.5" fill="#FEF08A" />
              <path
                d="M22 16C14 16 10 23 14 31C18 37 28 37 32 30C35 23 30 16 22 16Z"
                fill="#BBF7D0"
              />
              <path d="M22 22V44" stroke="#FEF3C7" strokeWidth="2.6" strokeLinecap="round" />
              <path
                d="M30 38C36 28 46 28 52 36C46 35 40 37 35 42L30 38Z"
                fill="#FEF9C3"
              />
              <path
                d="M10 50C20 47 32 52 44 49C49 48 52 49 55 50"
                stroke="#DCFCE7"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </>
          )}

          {kind === 'souvenir_craft' && (
            <>
              <path d="M24 14H40L37 21H27L24 14Z" fill="#FDE047" />
              <path
                d="M22 21H42C47 27 47 39 41 46H23C17 39 17 27 22 21Z"
                fill="#FCE7F3"
                stroke="#FDE047"
                strokeWidth="1.8"
              />
              <path d="M20 32H44M20 36H44" stroke="#BE185D" strokeWidth="2.2" />
              <circle cx="32" cy="26" r="2.5" fill="#F59E0B" />
              <path d="M16 51H48" stroke="#FBCFE8" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {kind === 'agro_farm' && (
            <>
              {/* Botanical Spice / Pepper / Coffee Branch & Berries */}
              <path
                d="M18 46C22 34 32 24 46 16"
                stroke="#FEF08A"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M26 34C18 32 14 24 20 18C26 18 30 26 26 34ZM36 26C44 26 48 34 42 40C36 40 32 32 36 26Z"
                fill="#BEF264"
                stroke="#ECFCCB"
                strokeWidth="1.4"
              />
              <circle cx="28" cy="40" r="3.2" fill="#EF4444" />
              <circle cx="35" cy="43" r="3" fill="#FDE047" />
              <circle cx="22" cy="44" r="2.8" fill="#F97316" />
              <path d="M12 52H52" stroke="#D9F99D" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {kind === 'local_market' && (
            <>
              {/* Iconic Central Market Dome & Market Stalls */}
              <path d="M16 28C16 18 23 13 32 13C41 13 48 18 48 28H16Z" fill="#FDE047" stroke="#FFFBEB" strokeWidth="1.6" />
              <path d="M10 34L16 28H48L54 34H10Z" fill="#FB7185" stroke="#FFFBEB" strokeWidth="1.4" />
              <rect x="14" y="34" width="36" height="14" rx="1.5" fill="#FFF1F2" />
              <rect x="20" y="38" width="6" height="10" fill="#BE185D" />
              <rect x="29" y="38" width="6" height="10" fill="#9F1239" />
              <rect x="38" y="38" width="6" height="10" fill="#BE185D" />
              <path d="M10 49H54" stroke="#FDE047" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {kind === 'cycling' && (
            <>
              <circle cx="20" cy="39" r="8.5" stroke="#FEF3C7" strokeWidth="2.6" />
              <circle cx="44" cy="39" r="8.5" stroke="#FEF3C7" strokeWidth="2.6" />
              <path
                d="M20 39L29 25H40L32 39H20ZM29 25L44 39"
                stroke="#FDE047"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M26 21H32M38 19L42 25" stroke="#FFFBEB" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {kind === 'museum_palace' && (
            <>
              <path d="M32 10L36 20H28L32 10Z" fill="#FDE047" />
              <path d="M12 27L32 17L52 27H12Z" fill="#DDD6FE" stroke="#FDE047" strokeWidth="1.5" />
              <rect x="16" y="27" width="32" height="17" fill="#F5F3FF" rx="1" />
              <rect x="21" y="30" width="4" height="14" fill="#6D28D9" />
              <rect x="30" y="30" width="4" height="14" fill="#6D28D9" />
              <rect x="39" y="30" width="4" height="14" fill="#6D28D9" />
              <rect x="12" y="44" width="40" height="5" rx="1.5" fill="#FDE047" />
            </>
          )}

          {kind === 'hotel' && (
            <>
              <rect x="16" y="14" width="32" height="36" rx="3" fill="#FEF3C7" stroke="#FFFBEB" strokeWidth="1.6" />
              <rect x="22" y="20" width="6" height="6" rx="1" fill="#B45309" />
              <rect x="36" y="20" width="6" height="6" rx="1" fill="#B45309" />
              <rect x="22" y="30" width="6" height="6" rx="1" fill="#B45309" />
              <rect x="36" y="30" width="6" height="6" rx="1" fill="#B45309" />
              <rect x="28" y="40" width="8" height="10" rx="1" fill="#78350F" />
            </>
          )}
        </svg>
        )}
      </div>
    );
  }
);
