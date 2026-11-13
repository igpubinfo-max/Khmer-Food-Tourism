// Cambodia Flavors & Tourism - Strictly Verified Cambodia Restaurant & Food Shop Directory (200 Verified Shops)
// Rebuilt & Audited — 100% Verified Cambodia GPS Coordinates, Bundled Local Shop Photos & Canonical Google Maps Links
import { Restaurant } from '../types';
import { restPart1 } from './seedRestPart1';
import { restPart2 } from './seedRestPart2';

export const initial100Restaurants: Restaurant[] = [...restPart1, ...restPart2];
