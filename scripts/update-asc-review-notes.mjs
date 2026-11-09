import crypto from 'crypto';
import fs from 'fs';

const ISSUER_ID = (process.env.APPSTORE_ISSUER_ID || '').trim();
const KEY_ID = (process.env.APPSTORE_KEY_ID || '').trim();
const PRIVATE_KEY = (process.env.APPSTORE_PRIVATE_KEY || '').trim();
const APP_ID = '6826976670';

function setGithubEnv(key, value) {
  try {
    if (process.env.GITHUB_ENV && value) {
      fs.appendFileSync(process.env.GITHUB_ENV, `${key}=${value}\n`);
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
  console.log('Checking App Store Version & Review Status via ASC API...');
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

  // IMPORTANT: Never cancel an active WAITING_FOR_REVIEW or IN_REVIEW submission!
  // Cancelling a submission via the API causes App Store Connect to mark the version as "Developer Rejected".
  if (currentState === 'WAITING_FOR_REVIEW' || currentState === 'IN_REVIEW' || currentState === 'PENDING_APPLE_RELEASE') {
    console.log(`Version ${currentVerStr} is already in active review state (${currentState}). Preserving submission without modification.`);
    setGithubEnv('ASC_REVIEW_STATE', currentState);
    return;
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

  // Ensure a valid processed build is attached to this App Store Version
  const attachedBuildResp = await ascRequest(`/appStoreVersions/${versionId}/build`);
  let attachedBuildId = attachedBuildResp?.data?.id || null;
  let attachedBuildVersion = attachedBuildResp?.data?.attributes?.version || null;
  console.log('Currently attached build:', attachedBuildId, 'build number:', attachedBuildVersion);

  const validBuildsResp = await ascRequest(
    `/builds?filter[app]=${APP_ID}&filter[processingState]=VALID&sort=-uploadedDate&limit=10`
  );
  const validBuilds = validBuildsResp?.data || [];
  if (validBuilds.length > 0) {
    const newestBuild = validBuilds[0];
    console.log(
      'Newest VALID processed build on ASC:',
      newestBuild.id,
      'build number:',
      newestBuild.attributes?.version,
      'uploaded:',
      newestBuild.attributes?.uploadedDate
    );
    if (!attachedBuildId || attachedBuildId !== newestBuild.id) {
      console.log(`Attaching build ${newestBuild.attributes?.version} (${newestBuild.id}) to version 2.7.0...`);
      await ascRequest(`/appStoreVersions/${versionId}/relationships/build`, 'PATCH', {
        data: {
          type: 'builds',
          id: newestBuild.id,
        },
      });
      attachedBuildId = newestBuild.id;
      attachedBuildVersion = newestBuild.attributes?.version;
    }
  }

  if (!attachedBuildId) {
    console.warn('No valid processed build is attached yet; cannot submit for review.');
    return;
  }

  // Automatically submit to Apple App Review if currently DEVELOPER_REJECTED, PREPARE_FOR_SUBMISSION, or REJECTED
  console.log(`Submitting iOS v2.7.0 (Build ${attachedBuildVersion}) to Apple App Review...`);
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
    // Fallback to legacy appStoreVersionSubmissions endpoint
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
