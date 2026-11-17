import crypto from 'crypto';
import fs from 'fs';

const ISSUER_ID = (process.env.APPSTORE_ISSUER_ID || '').trim();
const KEY_ID = (process.env.APPSTORE_KEY_ID || '').trim();
const PRIVATE_KEY = (process.env.APPSTORE_PRIVATE_KEY || '').trim();
const APP_ID = '6826976670';
const TARGET_VERSION_STRING = '2.7.2';
const TARGET_APP_NAME = 'Cambodia Flavors & Tourism';

const WHATS_NEW_TEXT = `• Added 30 new Sports & Adventure Tourism and Authentic Cambodian Souvenir & GI Product destinations across Cambodia.
• Added UNESCO World Heritage, National Symbols & Rare Wildlife, Domestic Transport Routes, and Cambodia Fast Facts in the Travel Guide.
• Enhanced 2D destination icons (including custom Khmer ancient temple artwork) and updated authentic Cambodian dish photos & recipes (including Khor Trei).`;

function setGithubEnv(key, value) {
  try {
    if (process.env.GITHUB_ENV && value) {
      fs.appendFileSync(process.env.GITHUB_ENV, `${key}=${value}\n`);
    }
    if (process.env.GITHUB_OUTPUT && value) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key.toLowerCase()}=${value}\n`);
    }
  } catch {}
}

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
  return json ?? { ok: true };
}

const REVIEW_NOTES = `Hello Apple App Review Team,

Thank you for reviewing Cambodia Flavors & Tourism (v2.7.2). This update rebrands our display title to "Cambodia Flavors & Tourism" and includes content & discovery improvements while preserving full compliance:

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function updateAppNameOnAsc() {
  console.log(`Updating App Store Connect App Name to "${TARGET_APP_NAME}"...`);
  const infosResp = await ascRequest(`/apps/${APP_ID}/appInfos`);
  const appInfos = infosResp?.data || [];
  for (const info of appInfos) {
    const infoId = info.id;
    const state = info.attributes?.appStoreState || info.attributes?.state || '';
    console.log(`Checking appInfo ID: ${infoId} (state: ${state})`);
    const locsResp = await ascRequest(`/appInfos/${infoId}/appInfoLocalizations`);
    const locs = locsResp?.data || [];
    for (const loc of locs) {
      const locId = loc.id;
      const locale = loc.attributes?.locale;
      const currentName = loc.attributes?.name;
      console.log(`  Localization ${locale} (${locId}) current name: "${currentName}"`);
      if (currentName !== TARGET_APP_NAME) {
        const patched = await ascRequest(`/appInfoLocalizations/${locId}`, 'PATCH', {
          data: {
            type: 'appInfoLocalizations',
            id: locId,
            attributes: {
              name: TARGET_APP_NAME,
            },
          },
        });
        if (patched?.data?.id) {
          console.log(`  Successfully updated App Name to "${TARGET_APP_NAME}" for locale ${locale}!`);
        }
      } else {
        console.log(`  App Name is already "${TARGET_APP_NAME}" for locale ${locale}.`);
      }
    }
  }
}

async function updateVersionWhatsNew(versionId) {
  const locsResp = await ascRequest(`/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
  const locs = locsResp?.data || [];
  for (const loc of locs) {
    const locId = loc.id;
    const locale = loc.attributes?.locale;
    await ascRequest(`/appStoreVersionLocalizations/${locId}`, 'PATCH', {
      data: {
        type: 'appStoreVersionLocalizations',
        id: locId,
        attributes: {
          whatsNew: WHATS_NEW_TEXT,
        },
      },
    });
    console.log(`Updated What's New text for version localization ${locale} (${locId}).`);
  }
}

async function main() {
  if (!ISSUER_ID || !KEY_ID || !PRIVATE_KEY) {
    console.log('Skipping ASC Review Notes update (missing credentials).');
    return;
  }

  const args = process.argv.slice(2);
  const waitBuildIdx = args.indexOf('--wait-for-build');
  const expectedBuildVersion = waitBuildIdx !== -1 && args[waitBuildIdx + 1] ? String(args[waitBuildIdx + 1]).trim() : '';

  console.log('Checking App Store Version & Review Status via ASC API...');
  const versionsResp = await ascRequest(`/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=10`);
  const allVersions = versionsResp?.data || [];

  // Look for an editable version or TARGET_VERSION_STRING
  let versionObj =
    allVersions.find((v) => v.attributes?.versionString === TARGET_VERSION_STRING) ||
    allVersions.find((v) =>
      ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_APPLE_RELEASE'].includes(
        v.attributes?.appStoreState
      )
    ) ||
    allVersions[0];

  // If the only existing version is already READY_FOR_SALE (e.g. 2.7.0), create version 2.7.1 so we can rename the app & submit!
  if (!versionObj || versionObj.attributes?.appStoreState === 'READY_FOR_SALE') {
    console.log(`Current version is READY_FOR_SALE. Creating new iOS App Store Version ${TARGET_VERSION_STRING}...`);
    const createdVer = await ascRequest('/appStoreVersions', 'POST', {
      data: {
        type: 'appStoreVersions',
        attributes: {
          platform: 'IOS',
          versionString: TARGET_VERSION_STRING,
          releaseType: 'AFTER_APPROVAL',
        },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: APP_ID,
            },
          },
        },
      },
    });
    if (createdVer?.data?.id) {
      versionObj = createdVer.data;
      console.log(`Successfully created iOS App Store Version ${TARGET_VERSION_STRING} (ID: ${versionObj.id})!`);
    }
  }

  if (!versionObj) {
    console.log('No iOS appStoreVersion found or created.');
    return;
  }

  const versionId = versionObj.id;
  const currentState = versionObj.attributes?.appStoreState;
  const currentVerStr = versionObj.attributes?.versionString;
  console.log('Active iOS App Store Version ID:', versionId, 'Version:', currentVerStr, 'State:', currentState);

  // IMPORTANT: Never cancel an active WAITING_FOR_REVIEW or IN_REVIEW submission!
  if (currentState === 'WAITING_FOR_REVIEW' || currentState === 'IN_REVIEW' || currentState === 'PENDING_APPLE_RELEASE') {
    console.log(`Version ${currentVerStr} is already in active review state (${currentState}). Preserving submission without modification.`);
    setGithubEnv('ASC_REVIEW_STATE', currentState);
    return;
  }

  if (currentVerStr !== TARGET_VERSION_STRING && currentState !== 'READY_FOR_SALE') {
    await ascRequest(`/appStoreVersions/${versionId}`, 'PATCH', {
      data: {
        type: 'appStoreVersions',
        id: versionId,
        attributes: {
          versionString: TARGET_VERSION_STRING,
        },
      },
    });
  }

  // Update the App Name on App Store Connect to "Cambodia Flavors & Tourism"
  await updateAppNameOnAsc();

  // Update What's New text on the 2.7.1 version localizations
  await updateVersionWhatsNew(versionId);

  const reviewAttributes = {
    contactFirstName: 'Savuth',
    contactLastName: 'Chea',
    contactPhone: '+85512649051',
    contactEmail: 'savuthapple59@gmail.com',
    demoAccountRequired: false,
    notes: REVIEW_NOTES,
  };

  const existingDetail = await ascRequest(`/appStoreVersions/${versionId}/appStoreReviewDetail`);
  if (existingDetail?.data?.id) {
    const detailId = existingDetail.data.id;
    await ascRequest(`/appStoreReviewDetails/${detailId}`, 'PATCH', {
      data: {
        type: 'appStoreReviewDetails',
        id: detailId,
        attributes: reviewAttributes,
      },
    });
    console.log('Successfully updated App Store Review Notes on detail ID:', detailId);
  } else {
    await ascRequest('/appStoreReviewDetails', 'POST', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: reviewAttributes,
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



  // Poll until Apple finishes processing the newly uploaded build
  if (expectedBuildVersion) {
    console.log(`Waiting for newly uploaded iOS build ${expectedBuildVersion} to finish Apple processing (VALID)...`);
    for (let attempt = 1; attempt <= 24; attempt++) {
      const checkResp = await ascRequest(
        `/builds?filter[app]=${APP_ID}&filter[version]=${encodeURIComponent(expectedBuildVersion)}&limit=5`
      );
      const matchingBuilds = checkResp?.data || [];
      if (matchingBuilds.length > 0) {
        const bState = matchingBuilds[0].attributes?.processingState;
        console.log(`  [Attempt ${attempt}/24] Build ${expectedBuildVersion} processingState: ${bState}`);
        if (bState === 'VALID') {
          break;
        }
        if (bState === 'FAILED' || bState === 'INVALID') {
          console.warn(`  Build ${expectedBuildVersion} processing ended with state: ${bState}`);
          break;
        }
      } else {
        console.log(`  [Attempt ${attempt}/24] Build ${expectedBuildVersion} not yet visible in ASC builds list...`);
      }
      await sleep(20000);
    }
  }

  // Ensure a valid processed build is attached to this App Store Version
  const attachedBuildResp = await ascRequest(`/appStoreVersions/${versionId}/build`);
  let attachedBuildId = attachedBuildResp?.data?.id || null;
  let attachedBuildVersion = attachedBuildResp?.data?.attributes?.version || null;
  console.log('Currently attached build:', attachedBuildId, 'build number:', attachedBuildVersion);

  const validBuildsResp = await ascRequest(
    `/builds?filter[app]=${APP_ID}&filter[processingState]=VALID&sort=-uploadedDate&limit=10`
  );
  const validBuilds = (validBuildsResp?.data || []).filter((b) => Number(b.attributes?.version || 0) >= 648);
  if (validBuilds.length > 0) {
    const preferredBuild =
      (expectedBuildVersion && validBuilds.find((b) => String(b.attributes?.version) === expectedBuildVersion)) ||
      validBuilds[0];

    // If expectedBuildVersion was requested or no build is attached yet, attach the newest valid build
    if (!attachedBuildId || (expectedBuildVersion && String(preferredBuild.attributes?.version) === expectedBuildVersion && attachedBuildId !== preferredBuild.id)) {
      console.log(`Attaching build ${preferredBuild.attributes?.version} (${preferredBuild.id}) to version ${TARGET_VERSION_STRING}...`);
      const attachRes = await ascRequest(`/appStoreVersions/${versionId}/relationships/build`, 'PATCH', {
        data: {
          type: 'builds',
          id: preferredBuild.id,
        },
      });
      if (attachRes !== null) {
        attachedBuildId = preferredBuild.id;
        attachedBuildVersion = preferredBuild.attributes?.version;
      }
    }
  }

  if (!attachedBuildId) {
    console.log('No valid processed build is attached to v2.7.2 yet; build-ios job will compile, upload, and attach the new v2.7.2 build.');
    return;
  }

  // Automatically submit to Apple App Review
  console.log(`Submitting iOS v${TARGET_VERSION_STRING} (Build ${attachedBuildVersion}) to Apple App Review...`);
  let submissionId = null;
  const openSubs = await ascRequest(
    `/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES`
  );
  if (openSubs?.data?.length > 0) {
    submissionId = openSubs.data[0].id;
    console.log('Reusing existing open reviewSubmission ID:', submissionId);
  } else {
    const createdSub = await ascRequest('/reviewSubmissions', 'POST', {
      data: {
        type: 'reviewSubmissions',
        attributes: {
          platform: 'IOS',
        },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: APP_ID,
            },
          },
        },
      },
    });
    submissionId = createdSub?.data?.id || null;
    console.log('Created new reviewSubmission ID:', submissionId);
  }

  if (submissionId) {
    await ascRequest('/reviewSubmissionItems', 'POST', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: {
            data: {
              type: 'reviewSubmissions',
              id: submissionId,
            },
          },
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: versionId,
            },
          },
        },
      },
    });

    const submittedRes = await ascRequest(`/reviewSubmissions/${submissionId}`, 'PATCH', {
      data: {
        type: 'reviewSubmissions',
        id: submissionId,
        attributes: {
          submitted: true,
        },
      },
    });
    console.log('Submitted reviewSubmission state:', submittedRes?.data?.attributes?.state);
  } else {
    await ascRequest('/appStoreVersionSubmissions', 'POST', {
      data: {
        type: 'appStoreVersionSubmissions',
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
  }

  const verifyVer = await ascRequest(`/appStoreVersions/${versionId}`);
  const finalState = verifyVer?.data?.attributes?.appStoreState || '';
  console.log('=== FINAL iOS APP STORE VERSION STATE:', finalState, '===');
  if (finalState) {
    setGithubEnv('ASC_REVIEW_STATE', finalState);
  }
}

main().catch((err) => console.warn('ASC Review Notes script non-fatal error:', err));
