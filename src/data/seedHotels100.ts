import { TouristDestination } from '../types';

/**
 * 359 Cambodian hotels, resorts & guesthouses (3.0★–5.0★) — split into lazy chunks (< 600 KB each).
 */
export async function loadSeedHotels100(): Promise<TouristDestination[]> {
  const mods = await Promise.all([
    import('./seedHotelsPart1'),
    import('./seedHotelsPart2')
  ]);
  return mods.flatMap((m) => Object.values(m).flat() as TouristDestination[]);
}
