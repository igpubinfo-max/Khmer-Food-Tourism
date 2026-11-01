#!/usr/bin/env node
/**
 * scripts/verify_restaurant_locations.mjs
 *
 * Fast, deterministic Node verification script with a strict 15s hard timeout.
 * Validates 100% of restaurants in `src/data/seedRestaurants.ts` for:
 *  1. Non-empty bilingual names (`nameKh`, `nameEn`) & street/municipality addresses (`addressKh`, `addressEn`, `provinceKh`, `provinceEn`)
 *  2. Strict Cambodia GPS bounds (`9.8 <= latitude <= 14.8`, `102.3 <= longitude <= 107.7`, never `0, 0`)
 *  3. Zero unverified / placeholder / `locationNeedsReview: true` records
 *  4. Official `googlePlaceId` format validation (never fake `ChIJ...` strings)
 *  5. Canonical Google Maps navigation `mapUrl` matching exact `(latitude, longitude)` pin
 *  6. Zero duplicates by `id`, `googlePlaceId`, normalized Khmer/English name, and GPS proximity (< 35m with similar name)
 *  7. 100% Province-to-Coordinate consistency (every shop's GPS falls strictly inside its declared province bounding box)
 *  8. Storefront photo integrity (zero `/foods/` or `/restaurants/` cross-assigned images; existing `/Shop/` files verified on disk)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isValidCambodiaGps,
  findProvinceDefinition,
  isCoordinateInsideProvinceBbox,
  haversineMeters,
  isValidOfficialPlaceId,
  normalizeShopNameKey,
  areShopNamesSimilar,
} from './lib/cambodiaProvinceBounds.mjs';

// Hard 15-second timeout guarantee (never hangs)
const hardTimeout = setTimeout(() => {
  console.error('[FATAL TIMEOUT] verify_restaurant_locations.mjs exceeded 15s limit.');
  process.exit(1);
}, 15000);
hardTimeout.unref();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SEED_RESTAURANTS_PATH = path.join(ROOT_DIR, 'src', 'data', 'seedRestaurants.ts');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const GENERIC_SINGLE_WORD_NAMES = new Set([
  'restaurant',
  'restaurants',
  'cafe',
  'café',
  'coffee',
  'bakery',
  'food',
  'shop',
  'bar',
  'unnamed',
  'unknown',
  'ភោជនីយដ្ឋាន',
  'ហាងបាយ',
  'ហាងកាហ្វេ',
  'កាហ្វេ',
]);

function parseSeedRestaurants() {
  if (!fs.existsSync(SEED_RESTAURANTS_PATH)) {
    throw new Error(`Missing file: ${SEED_RESTAURANTS_PATH}`);
  }
  const src = fs.readFileSync(SEED_RESTAURANTS_PATH, 'utf8');
  const startIdx = src.indexOf('= [');
  const endIdx = src.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Failed to locate `initial100Restaurants` JSON array in seedRestaurants.ts');
  }
  return JSON.parse(src.slice(startIdx + 2, endIdx + 1));
}

function validateCanonicalMapUrl(mapUrl, lat, lng, googlePlaceId) {
  if (typeof mapUrl !== 'string' || !mapUrl.trim()) {
    return 'Empty mapUrl';
  }
  let parsed;
  try {
    parsed = new URL(mapUrl);
  } catch {
    return `Invalid URL syntax: ${mapUrl}`;
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('google.com')) {
    return `Non-Google Maps HTTPS URL: ${mapUrl}`;
  }
  if (!parsed.pathname.startsWith('/maps/search')) {
    return `Expected canonical /maps/search/?api=1&query=... path, got: ${parsed.pathname}`;
  }
  if (parsed.searchParams.get('api') !== '1') {
    return `Missing api=1 query param in ${mapUrl}`;
  }
  const query = parsed.searchParams.get('query') || '';
  const parts = query.split(',').map((s) => Number(s.trim()));
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return `Invalid query=<lat>,<lng> coordinates in ${mapUrl}`;
  }
  if (Math.abs(parts[0] - lat) > 0.00005 || Math.abs(parts[1] - lng) > 0.00005) {
    return `mapUrl coordinates (${parts[0]}, ${parts[1]}) do not match record GPS (${lat}, ${lng})`;
  }
  if (googlePlaceId) {
    const qpid = parsed.searchParams.get('query_place_id');
    if (qpid && qpid !== googlePlaceId) {
      return `query_place_id (${qpid}) mismatches googlePlaceId (${googlePlaceId})`;
    }
  }
  return null;
}

function main() {
  const startMs = Date.now();
  console.log('====================================================================');
  console.log(' Strict Cambodia Restaurant & Shop Location Verification Audit');
  console.log('====================================================================');

  const restaurants = parseSeedRestaurants();
  if (!Array.isArray(restaurants) || restaurants.length < 200) {
    console.error(`[FAIL] seedRestaurants.ts contains ${restaurants?.length || 0} restaurants (expected >= 200)!`);
    process.exit(1);
  }

  const errors = [];
  const seenIds = new Map();
  const seenPlaceIds = new Map();
  const seenNormNameEn = new Map();
  const seenNormNameKh = new Map();
  const provinceCounts = {};

  for (let idx = 0; idx < restaurants.length; idx++) {
    const r = restaurants[idx];
    const label = `[#${idx + 1} ${r?.id || 'NO_ID'} "${r?.nameEn || ''}"]`;

    // 1. Mandatory ID & Bilingual Names / Addresses
    if (!r || typeof r !== 'object') {
      errors.push(`${label} Invalid restaurant object`);
      continue;
    }
    if (typeof r.id !== 'string' || !r.id.trim()) {
      errors.push(`${label} Missing id`);
    }
    for (const field of ['nameKh', 'nameEn', 'addressKh', 'addressEn', 'provinceKh', 'provinceEn']) {
      const val = r[field];
      if (typeof val !== 'string' || val.trim().length < 2) {
        errors.push(`${label} Missing or empty mandatory field '${field}'`);
      } else if (/[?]{2,}|\uFFFD/.test(val)) {
        errors.push(`${label} Mojibake/corrupted characters in '${field}': ${val}`);
      }
    }

    if (GENERIC_SINGLE_WORD_NAMES.has(String(r.nameEn || '').trim().toLowerCase())) {
      errors.push(`${label} Generic placeholder nameEn: "${r.nameEn}"`);
    }
    if (GENERIC_SINGLE_WORD_NAMES.has(String(r.nameKh || '').trim().toLowerCase())) {
      errors.push(`${label} Generic placeholder nameKh: "${r.nameKh}"`);
    }

    // Address must include street/district/municipality detail, not just the province name alone
    if (
      String(r.addressEn || '').trim().toLowerCase() ===
      String(r.provinceEn || '').trim().toLowerCase()
    ) {
      errors.push(`${label} addressEn is province-only without street/district: "${r.addressEn}"`);
    }

    // 2. Strict Verification Flags
    if (r.isVerified !== true) {
      errors.push(`${label} Expected isVerified === true, got ${r.isVerified}`);
    }
    if (r.paymentStatus !== 'verified') {
      errors.push(`${label} Expected paymentStatus === 'verified', got '${r.paymentStatus}'`);
    }
    if (r.locationNeedsReview === true) {
      errors.push(`${label} Unverified record still has locationNeedsReview: true`);
    }
    if (r.locationVerificationStatus !== 'verified') {
      errors.push(
        `${label} Expected locationVerificationStatus === 'verified', got '${r.locationVerificationStatus}'`
      );
    }
    if (!r.phone || typeof r.phone !== 'string' || r.phone.trim().length < 8) {
      errors.push(`${label} Missing or invalid phone: "${r.phone}"`);
    }
    if (typeof r.rating !== 'number' || r.rating <= 0) {
      errors.push(`${label} Missing or invalid rating: ${r.rating}`);
    }

    // 3. Strict Cambodia GPS Coordinates
    if (!isValidCambodiaGps(r.latitude, r.longitude)) {
      errors.push(
        `${label} Invalid or out-of-Cambodia GPS coordinates: (${r.latitude}, ${r.longitude})`
      );
    }

    // 4. Province-to-Coordinate Bounding-Box Consistency
    const provEnDef = findProvinceDefinition(r.provinceEn);
    const provKhDef = findProvinceDefinition(r.provinceKh);
    if (!provEnDef) {
      errors.push(`${label} Unrecognized provinceEn: "${r.provinceEn}"`);
    } else if (!provKhDef || provKhDef.provinceEn !== provEnDef.provinceEn) {
      errors.push(
        `${label} Mismatched provinceKh ("${r.provinceKh}") vs provinceEn ("${r.provinceEn}")`
      );
    } else if (!isCoordinateInsideProvinceBbox(r.latitude, r.longitude, provEnDef)) {
      errors.push(
        `${label} GPS (${r.latitude}, ${r.longitude}) falls OUTSIDE declared province '${provEnDef.provinceEn}' bbox [${provEnDef.bbox.join(', ')}]`
      );
    } else {
      provinceCounts[provEnDef.provinceEn] = (provinceCounts[provEnDef.provinceEn] || 0) + 1;
    }

    // 5. Official Google Place ID (when present) & Canonical Google Maps URL
    if (r.googlePlaceId !== undefined && r.googlePlaceId !== null && r.googlePlaceId !== '') {
      if (!isValidOfficialPlaceId(r.googlePlaceId)) {
        errors.push(`${label} Fake or malformed googlePlaceId: "${r.googlePlaceId}"`);
      }
      if (seenPlaceIds.has(r.googlePlaceId)) {
        errors.push(
          `${label} Duplicate googlePlaceId "${r.googlePlaceId}" (also on ${seenPlaceIds.get(r.googlePlaceId)})`
        );
      } else {
        seenPlaceIds.set(r.googlePlaceId, r.id);
      }
    }

    const mapErr = validateCanonicalMapUrl(r.mapUrl, r.latitude, r.longitude, r.googlePlaceId);
    if (mapErr) {
      errors.push(`${label} Invalid mapUrl: ${mapErr}`);
    }

    // 6. Storefront Photo Integrity
    for (const imgField of ['photoUrl', 'profileImage']) {
      const u = r[imgField] || '';
      if (typeof u !== 'string' || u.trim().length === 0) {
        errors.push(`${label} Empty ${imgField} (all 200 restaurants must have a real photo)`);
      } else {
        if (u.startsWith('/foods/') || u.startsWith('/restaurants/')) {
          errors.push(`${label} Forbidden dish/broken path in ${imgField}: "${u}"`);
        }
        if (u.startsWith('/Shop/')) {
          const diskPath = path.join(PUBLIC_DIR, u.replace(/^\//, ''));
          if (!fs.existsSync(diskPath) || fs.statSync(diskPath).size < 1024) {
            errors.push(`${label} Missing or empty storefront photo file on disk: ${u}`);
          }
          if (u !== `/Shop/${r.id}.jpg`) {
            errors.push(`${label} Cross-assigned storefront photo ${u} on ${r.id}`);
          }
        }
      }
    }

    // 7. Duplicate ID & Normalized Name Checks
    if (seenIds.has(r.id)) {
      errors.push(`${label} Duplicate restaurant id "${r.id}"`);
    } else {
      seenIds.set(r.id, idx);
    }

    const normEn = normalizeShopNameKey(r.nameEn);
    if (normEn) {
      if (seenNormNameEn.has(normEn)) {
        errors.push(
          `${label} Duplicate normalized English name "${r.nameEn}" (conflicts with ${seenNormNameEn.get(normEn)})`
        );
      } else {
        seenNormNameEn.set(normEn, `${r.id} ("${r.nameEn}")`);
      }
    }

    const normKh = normalizeShopNameKey(r.nameKh);
    if (normKh) {
      if (seenNormNameKh.has(normKh)) {
        errors.push(
          `${label} Duplicate normalized Khmer name "${r.nameKh}" (conflicts with ${seenNormNameKh.get(normKh)})`
        );
      } else {
        seenNormNameKh.set(normKh, `${r.id} ("${r.nameKh}")`);
      }
    }
  }

  // 8. Pairwise GPS Proximity Deduplication (< 35m with similar name, or < 5m exact pin)
  for (let i = 0; i < restaurants.length; i++) {
    for (let j = i + 1; j < restaurants.length; j++) {
      const a = restaurants[i];
      const b = restaurants[j];
      const dist = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
      if (dist < 5) {
        errors.push(
          `[Proximity Duplicate] ${a.id} ("${a.nameEn}") and ${b.id} ("${b.nameEn}") share identical/overlapping GPS pin (${dist.toFixed(1)}m apart)`
        );
      } else if (dist < 35 && areShopNamesSimilar(a.nameEn, a.nameKh, b.nameEn, b.nameKh)) {
        errors.push(
          `[Proximity + Name Duplicate] ${a.id} ("${a.nameEn}") and ${b.id} ("${b.nameEn}") are ${dist.toFixed(1)}m apart (< 35m) with similar names`
        );
      }
    }
  }

  const elapsedMs = Date.now() - startMs;
  if (errors.length > 0) {
    console.error(`\n[FAIL] Found ${errors.length} verification error(s) across ${restaurants.length} records:`);
    for (const err of errors.slice(0, 30)) {
      console.error(`  ✗ ${err}`);
    }
    process.exit(1);
  }

  console.log(`✓ Total Verified Cambodia Shops : ${restaurants.length} (0 unverified, 0 locationNeedsReview)`);
  console.log(`✓ Cambodia GPS Bounds Check     : 100% PASS (9.8..14.8 N, 102.3..107.7 E, zero (0,0))`);
  console.log(`✓ Province BBox Consistency     : 100% PASS across ${Object.keys(provinceCounts).length} Cambodia provinces`);
  console.log(`✓ Canonical Google Maps URLs    : 100% PASS (exact pin & directions ready)`);
  console.log(`✓ Deduplication Audit           : 100% PASS (0 duplicate IDs, Place IDs, names, or <35m pins)`);
  console.log(`✓ Storefront Photo Hygiene      : 100% PASS (0 dish/cross-shop image leaks)`);
  console.log(`✓ Completed in                  : ${elapsedMs}ms`);
  console.log('--------------------------------------------------------------------');
  console.log('Province Distribution:');
  for (const [prov, count] of Object.entries(provinceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${prov.padEnd(18)} : ${count}`);
  }
  console.log('====================================================================');
}

main();
