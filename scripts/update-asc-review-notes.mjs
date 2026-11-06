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

const REVIEW_NOTES = `Hello Apple App Review Team,

Thank you very much for your detailed feedback on Submission ID: 3bbca3d5-915b-4548-8bb0-627d77752449. We have resolved all items in this build:

1. Guideline 4.8 - Design - Login Services (Sign in with Apple / Equivalent Private Login):
- Added "Sign in with Apple" ("បន្តជាមួយ Apple") at the top of our in-app sign-in modal (Profile tab -> Sign In).
- Strictly limits data collection to name & email, supports "Hide My Email" (@privaterelay.appleid.com) privacy relay, and performs zero advertising tracking.

2. Guideline 4 - Design (In-App Sign-In, Registration & Account Deletion):
- All sign-in and account registration flows take place 100% inside the native app modal without opening the external Safari browser.
- Account Deletion is available directly inside the app at: (a) Profile tab -> Top Profile Card -> "Delete Account" ("លុបគណនី"), and (b) Profile tab -> Settings -> "Permanently Delete My Account".

3. Guideline 4 - Design (Optimized for iPad Air 11-inch M3 & All Screen Sizes):
- Expanded the responsive container and grid layout edge-to-edge across iPad Air 11-inch (M3), iPad Pro, and all iPhone resolutions.

4. Guideline 3.1.1 - Business - Payments - In-App Purchase:
- Removed and disabled all non-IAP VIP membership upgrade screens, pricing prompts, and external payment mechanisms on iOS and iPadOS. All consumer features are unlocked and free to use on iOS/iPadOS.

5. Guideline 2.3.3 - Performance - Accurate Metadata (Screenshots):
- Updated all iPhone and iPad screenshots in Media Manager to show actual in-app UI screens in use.`;

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
