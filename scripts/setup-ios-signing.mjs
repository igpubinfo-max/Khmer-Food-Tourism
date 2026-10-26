import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const ISSUER_ID = (process.env.APPSTORE_ISSUER_ID || '').trim();
const KEY_ID = (process.env.APPSTORE_KEY_ID || '').trim();
const PRIVATE_KEY = (process.env.APPSTORE_PRIVATE_KEY || '').trim();
const BUNDLE_ID_STR = 'com.khmerfood.tourism';
const TEAM_ID = '79L24WMX4R';

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
    throw new Error(`ASC API ${method} ${endpoint} failed (${res.status}): ${text}`);
  }
  return json;
}

async function main() {
  const workDir = path.resolve(process.cwd(), 'ios/App/build/signing');
  fs.mkdirSync(workDir, { recursive: true });

  console.log('1. Looking up Bundle ID in App Store Connect...');
  const bundles = await ascRequest('/bundleIds?filter[identifier]=' + encodeURIComponent(BUNDLE_ID_STR));
  const bundleObj = bundles.data?.find(b => b.attributes.identifier === BUNDLE_ID_STR) || bundles.data?.[0];
  if (!bundleObj) {
    throw new Error('Bundle ID ' + BUNDLE_ID_STR + ' not found in App Store Connect');
  }
  const bundleRecordId = bundleObj.id;
  console.log('   Found Bundle ID record:', bundleRecordId);

  console.log('2. Generating 2048-bit RSA Private Key & CSR...');
  const keyPath = path.join(workDir, 'dist.key');
  const csrPath = path.join(workDir, 'dist.csr');
  execSync(`openssl genrsa -out "${keyPath}" 2048`);
  execSync(`openssl req -new -key "${keyPath}" -out "${csrPath}" -subj "/CN=Khmer Food and Tourism Distribution/O=Savuth Chea/C=KH"`);
  const csrPem = fs.readFileSync(csrPath, 'utf8');
  const csrBase64 = csrPem
    .replace(/-----BEGIN CERTIFICATE REQUEST-----/g, '')
    .replace(/-----END CERTIFICATE REQUEST-----/g, '')
    .replace(/\s+/g, '');

  console.log('3. Checking existing Distribution Certificates...');
  const existingCerts = await ascRequest('/certificates');
  const distCerts = (existingCerts.data || []).filter(
    c => c.attributes.certificateType === 'DISTRIBUTION' || c.attributes.certificateType === 'IOS_DISTRIBUTION'
  );
  // Revoke any previous CI distribution certificates so we never hit Apple's limit
  for (const c of distCerts) {
    console.log('   Revoking previous CI distribution certificate:', c.id);
    await ascRequest('/certificates/' + c.id, 'DELETE').catch(() => {});
  }

  console.log('4. Creating Apple Distribution Certificate via API...');
  const createdCert = await ascRequest('/certificates', 'POST', {
    data: {
      type: 'certificates',
      attributes: {
        certificateType: 'DISTRIBUTION',
        csrContent: csrBase64,
      },
    },
  });
  const certId = createdCert.data.id;
  const certContentBase64 = createdCert.data.attributes.certificateContent;
  const cerDerPath = path.join(workDir, 'dist.cer');
  const cerPemPath = path.join(workDir, 'dist.pem');
  const p12Path = path.join(workDir, 'dist.p12');
  fs.writeFileSync(cerDerPath, Buffer.from(certContentBase64, 'base64'));
  execSync(`openssl x509 -inform DER -in "${cerDerPath}" -out "${cerPemPath}"`);
  execSync(`openssl pkcs12 -export -legacy -out "${p12Path}" -inkey "${keyPath}" -in "${cerPemPath}" -passout pass:kft1234`);
  console.log('   Created Distribution Certificate ID:', certId);

  console.log('5. Creating App Store Provisioning Profile via API...');
  const existingProfiles = await ascRequest('/profiles');
  for (const p of existingProfiles.data || []) {
    if (p.attributes.name === 'KFT AppStore CI Profile') {
      await ascRequest('/profiles/' + p.id, 'DELETE').catch(() => {});
    }
  }
  const createdProfile = await ascRequest('/profiles', 'POST', {
    data: {
      type: 'profiles',
      attributes: {
        name: 'KFT AppStore CI Profile',
        profileType: 'IOS_APP_STORE',
      },
      relationships: {
        bundleId: {
          data: { type: 'bundleIds', id: bundleRecordId },
        },
        certificates: {
          data: [{ type: 'certificates', id: certId }],
        },
      },
    },
  });

  const profileContentBase64 = createdProfile.data.attributes.profileContent;
  const profileUuid = createdProfile.data.attributes.uuid;
  const profileName = createdProfile.data.attributes.name;
  const profilesDir = path.join(process.env.HOME, 'Library/MobileDevice/Provisioning Profiles');
  fs.mkdirSync(profilesDir, { recursive: true });
  const profilePath = path.join(profilesDir, `${profileUuid}.mobileprovision`);
  fs.writeFileSync(profilePath, Buffer.from(profileContentBase64, 'base64'));
  console.log('   Installed Provisioning Profile:', profileName, 'UUID:', profileUuid);

  console.log('6. Importing Certificate & Private Key into macOS Keychain...');
  const keychainPath = path.join(process.env.HOME, 'Library/Keychains/build.keychain-db');
  const keychainPass = 'kft1234';
  execSync(`security delete-keychain "${keychainPath}" 2>/dev/null || true`);
  execSync(`security create-keychain -p "${keychainPass}" "${keychainPath}"`);
  execSync(`security list-keychains -d user -s "${keychainPath}" login.keychain-db`);
  execSync(`security default-keychain -s "${keychainPath}"`);
  execSync(`security unlock-keychain -p "${keychainPass}" "${keychainPath}"`);
  execSync(`security set-keychain-settings -t 3600 -u "${keychainPath}"`);

  // Download Apple WWDR G3 certificate so trust chain is complete
  const wwdrPath = path.join(workDir, 'AppleWWDRCAG3.cer');
  execSync(`curl -sL "https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer" -o "${wwdrPath}"`);
  execSync(`security import "${wwdrPath}" -k "${keychainPath}" -T /usr/bin/codesign -T /usr/bin/security || true`);
  execSync(`security import "${p12Path}" -k "${keychainPath}" -P "kft1234" -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/productbuild`);
  execSync(`security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "${keychainPass}" "${keychainPath}"`);
  execSync(`security find-identity -v -p codesigning "${keychainPath}"`, { stdio: 'inherit' });

  // Write ExportOptions.plist cleanly
  const exportPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>teamID</key>
  <string>${TEAM_ID}</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>signingCertificate</key>
  <string>Apple Distribution</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>${BUNDLE_ID_STR}</key>
    <string>${profileUuid}</string>
  </dict>
  <key>uploadSymbols</key>
  <true/>
  <key>destination</key>
  <string>export</string>
</dict>
</plist>`;
  const exportPlistPath = path.resolve(process.cwd(), 'ios/App/build/ExportOptions.plist');
  fs.writeFileSync(exportPlistPath, exportPlist, 'utf8');
  fs.writeFileSync(path.join(workDir, 'profile_uuid.txt'), profileUuid, 'utf8');
  console.log('=== Automated iOS Code Signing Setup Complete ===');
}

main().catch(err => {
  console.error('Setup iOS signing error:', err);
  process.exit(1);
});
