import crypto from 'crypto';

const ISSUER_ID = (process.env.APPSTORE_ISSUER_ID || '').trim();
const KEY_ID = (process.env.APPSTORE_KEY_ID || '').trim();
const PRIVATE_KEY = (process.env.APPSTORE_PRIVATE_KEY || '').trim();
const APP_ID = '6826976670';

function createJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: ISSUER_ID,
      iat: now - 30,
      exp: now + 900,
      aud: 'appstoreconnect-v1',
    })
  ).toString('base64url');
  const data = header + '.' + payload;
  const sig = crypto
    .sign('sha256', Buffer.from(data), { key: PRIVATE_KEY, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return data + '.' + sig;
}

async function ascRequest(endpoint, method = 'GET', body = null) {
  const token = createJwt();
  const res = await fetch('https://api.appstoreconnect.apple.com/v1' + endpoint, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    console.warn(`ASC API ${method} ${endpoint} warning (${res.status}): ${text}`);
    return null;
  }
  return json;
}

const REVIEW_NOTES = `1. Screen Recording Demonstration:
Please see the attached screen recording (IMG_0317.MP4) recorded on a physical iOS device showing the app launching from the home screen, selecting languages (Khmer, English, Chinese), tapping Start on the Welcome Screen, and navigating through Home, Food (recipes & ingredients), Shops (restaurants), Travel (tourist destinations), Map, and Profile. No login or account registration is required, and there is no paid or locked content.

2. App Purpose & Target Audience:
Khmer Food & Tourism is an all-in-one cultural culinary and travel guide for Cambodia designed for international tourists, local residents, and food lovers. It solves the problem of scattered travel/recipe information and limited internet connectivity in remote temple areas by providing an offline-ready, trilingual (Khmer, English, Chinese) directory of 300+ authentic Cambodian dishes with recipes, 120+ local restaurants, and 125+ tourist destinations across all 25 provinces.

3. Instructions for Accessing Main Features:
No login credentials, account creation, or sample files are required. Simply launch the app, tap "Start" on the Welcome Screen, and use the bottom navigation tabs (Home, Food, Shops, Travel, Map, Profile) to access all content immediately.

4. External Services & Platforms Used:
- Supabase (PostgreSQL cloud database for read-only public content sync, with full offline fallback data bundled in the app)
- OpenStreetMap / Leaflet & Apple/Google Maps links for destination coordinates and directions
- YouTube Embedded Player for public cultural cooking and travel videos

5. Regional Differences:
None. The app functions identically across all countries and regions worldwide.

6. Regulated Industry / Protected Third-Party Material:
Not applicable. The app is a public cultural food, recipe, and tourism guide and does not operate in a regulated industry.`;

async function main() {
  if (!ISSUER_ID || !KEY_ID || !PRIVATE_KEY) {
    console.log('Skipping ASC Review Notes update (missing credentials).');
    return;
  }
  console.log('Updating App Store Review Notes via ASC API...');
  const versions = await ascRequest(`/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS`);
  const versionObj = versions?.data?.[0];
  if (!versionObj) {
    console.log('No iOS appStoreVersion found.');
    return;
  }
  const versionId = versionObj.id;
  console.log('Found iOS App Store Version ID:', versionId, 'State:', versionObj.attributes?.appStoreState);

  const existingDetail = await ascRequest(`/appStoreVersions/${versionId}/appStoreReviewDetail`);
  if (existingDetail?.data?.id) {
    const detailId = existingDetail.data.id;
    await ascRequest(`/appStoreReviewDetails/${detailId}`, 'PATCH', {
      data: {
        type: 'appStoreReviewDetails',
        id: detailId,
        attributes: {
          demoAccountRequired: false,
          notes: REVIEW_NOTES,
        },
      },
    });
    console.log('Successfully updated App Store Review Notes on detail ID:', detailId);
  } else {
    await ascRequest('/appStoreReviewDetails', 'POST', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: {
          demoAccountRequired: false,
          notes: REVIEW_NOTES,
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: versionId,
            },
          },
        },
      },
    });
    console.log('Successfully created App Store Review Notes for version ID:', versionId);
  }
}

main().catch((err) => console.warn('ASC Review Notes script non-fatal error:', err));
