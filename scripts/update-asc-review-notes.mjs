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

Thank you for your feedback. This build addresses the following:

1. Guideline 4.8 - Login Services:
- The iOS app offers only its own email-based account (name and email, no advertising tracking). No third-party or social login is offered inside the iOS app: Google sign-in is hidden on iOS and the earlier custom "Sign in with Apple" button has been removed, so an additional login service is not required.

2. Guideline 5.1.1(v) - Account Deletion:
- Profile tab -> Settings -> "Delete My Account & Data" (also available under Profile -> Settings -> Privacy Policy -> "Delete My Account & Data Now"). After a confirmation prompt the account and its associated data (profile, favourites, trip plans, listings, support messages and payment records) are permanently removed from the app and from our server.

3. Guideline 3.1.1 - In-App Purchase:
- The iOS app contains no purchases, subscriptions, donations or external payment links. All consumer features are available free of charge in the iOS app, and the Support/donation screen is not shown on iOS.

4. Guideline 5.1.2(i) - Third-party AI:
- The AI food assistant asks for explicit in-app permission before any question, photo or account ID is shared with a third-party AI provider (Google Gemini or OpenAI). The user can decline and continue using the app without AI.

5. Guideline 4 - iPad:
- The layout expands to the available screen width on iPad (no fixed phone-width column on large screens).

6. Guideline 2.3.3 - Accurate Metadata (Screenshots):
- iPhone and iPad screenshots show actual in-app screens.

7. Demo account:
- No demo account is required. Reviewers can register or sign in with any valid email address.`;

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
  const currentState = versionObj.attributes?.appStoreState;
  const currentVerStr = versionObj.attributes?.versionString;
  console.log('Found iOS App Store Version ID:', versionId, 'Version:', currentVerStr, 'State:', currentState);

  if (currentState === 'WAITING_FOR_REVIEW') {
    console.log('Cancelling old WAITING_FOR_REVIEW submission so v2.7.0 build can replace it...');
    const subs = await ascRequest(`/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&filter[state]=WAITING_FOR_REVIEW`);
    for (const sub of subs?.data || []) {
      await ascRequest(`/reviewSubmissions/${sub.id}`, 'PATCH', {
        data: {
          type: 'reviewSubmissions',
          id: sub.id,
          attributes: { canceled: true },
        },
      });
    }
    const legacySub = await ascRequest(`/appStoreVersions/${versionId}/appStoreVersionSubmission`);
    if (legacySub?.data?.id) {
      await ascRequest(`/appStoreVersionSubmissions/${legacySub.data.id}`, 'DELETE');
    }
  }

  if (currentVerStr !== '2.7.0') {
    await ascRequest(`/appStoreVersions/${versionId}`, 'PATCH', {
      data: {
        type: 'appStoreVersions',
        id: versionId,
        attributes: {
          versionString: '2.7.0',
        },
      },
    });
  }

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
