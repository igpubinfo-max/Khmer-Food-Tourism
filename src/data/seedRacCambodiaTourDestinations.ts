import { TouristDestination } from '../types';

/**
 * 1168 Authentic Cambodian Tourist Destinations — split into 9 lazy chunks (each < 600 KB)
 * so the main bundle stays tiny. Loaded on demand after first paint.
 */
export async function loadRacCambodiaTourDestinations(): Promise<TouristDestination[]> {
  const mods = await Promise.all([
    import('./seedRacPart1'),
    import('./seedRacPart2'),
    import('./seedRacPart3'),
    import('./seedRacPart4'),
    import('./seedRacPart5'),
    import('./seedRacPart6'),
    import('./seedRacPart7'),
    import('./seedRacPart8'),
    import('./seedRacPart9')
  ]);
  return mods.flatMap((m) => Object.values(m).flat() as TouristDestination[]);
}
