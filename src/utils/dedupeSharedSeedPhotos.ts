import type { TouristDestination } from '../types';

const SEED_PHOTO_RE = /^\/destinations\/dest-(\d+)\.jpg/i;

/**
 * Several seed destinations point at the same /destinations/dest-N.jpg, so a photo can show the
 * wrong place. Only the place whose id is `dest-N` (the photo's real owner) keeps `dest-N.jpg`;
 * every other place gets an empty photoUrl, which the UI already renders as the category icon.
 * If no place owns the file, the first place that uses it keeps it.
 * Photos outside /destinations/ (admin uploads, remote URLs) are never touched.
 */
export function dedupeSharedSeedPhotos(list: TouristDestination[]): TouristDestination[] {
  const ownerByPhoto = new Map<string, string>();
  const firstUserByPhoto = new Map<string, string>();
  const photoKey = (url?: string) => {
    const m = SEED_PHOTO_RE.exec((url || '').trim());
    return m ? `/destinations/dest-${m[1]}.jpg` : '';
  };

  for (const d of list) {
    const key = photoKey(d.photoUrl);
    if (!key) continue;
    if (!firstUserByPhoto.has(key)) firstUserByPhoto.set(key, d.id);
    if (key === `/destinations/${d.id}.jpg`) ownerByPhoto.set(key, d.id);
  }

  const keeper = (key: string) => ownerByPhoto.get(key) ?? firstUserByPhoto.get(key);

  return list.map((d) => {
    const key = photoKey(d.photoUrl);
    const dropMain = Boolean(key) && keeper(key) !== d.id;
    const gallery = d.galleryPhotos?.filter((g) => {
      const gk = photoKey(g);
      return !gk || keeper(gk) === d.id;
    });
    const galleryChanged = gallery && gallery.length !== d.galleryPhotos!.length;
    if (!dropMain && !galleryChanged) return d;
    return {
      ...d,
      photoUrl: dropMain ? '' : d.photoUrl,
      ...(gallery ? { galleryPhotos: gallery } : {}),
    };
  });
}
