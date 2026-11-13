import { TouristDestination } from '../types';
import { destPart1 } from './seedDestPart1';
import { destPart2 } from './seedDestPart2';
import { loadRacCambodiaTourDestinations } from './seedRacCambodiaTourDestinations';
import { loadSeedHotels100 } from './seedHotels100';

const baseSeedDestinations: TouristDestination[] = [...destPart1, ...destPart2];

export const initial100Destinations: TouristDestination[] = [
  ...baseSeedDestinations,
];

let extendedLoadedPromise: Promise<TouristDestination[]> | null = null;
let hasAppendedExtendedToSeed = false;

/**
 * Lazily loads the 1,168 RAC Cambodia archaeological/eco sites and 359 directory hotels
 * after initial first paint (~250ms idle) so mobile devices skip parsing ~5.85 MB of JS synchronously at cold boot.
 */
export function loadExtendedDestinationsAndHotels(): Promise<TouristDestination[]> {
  if (!extendedLoadedPromise) {
    extendedLoadedPromise = Promise.all([
      loadRacCambodiaTourDestinations(),
      loadSeedHotels100(),
    ]).then(([racList, hotelList]) => {
      const extended: TouristDestination[] = [
        ...(racList || []),
        ...(hotelList || []),
      ];
      if (!hasAppendedExtendedToSeed && extended.length > 0) {
        hasAppendedExtendedToSeed = true;
        const existingIds = new Set(initial100Destinations.map((d) => d.id));
        for (const item of extended) {
          if (item && item.id && !existingIds.has(item.id)) {
            initial100Destinations.push(item);
            existingIds.add(item.id);
          }
        }
      }
      return extended;
    });
  }
  return extendedLoadedPromise;
}
