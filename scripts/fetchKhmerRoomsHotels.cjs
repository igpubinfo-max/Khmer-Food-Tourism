const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return resolve(fetchUrl(new URL(res.headers.location, url).toString()));
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        }
      )
      .on('error', reject);
  });
}

async function main() {
  const xml = await fetchUrl('https://www.khmerrooms.com/sitemap.xml');
  const urlSet = new Set();
  const locRe = /<loc>(https:\/\/www\.khmerrooms\.com\/hotels\/[^<]+)<\/loc>/g;
  let m;
  while ((m = locRe.exec(xml)) !== null) {
    urlSet.add(m[1]);
  }
  for (let p = 1; p <= 4; p++) {
    const html = await fetchUrl(`https://www.khmerrooms.com/explore?page=${p}`);
    const hrefRe = /href="(\/hotels\/[^"?#]+)"/g;
    while ((m = hrefRe.exec(html)) !== null) {
      urlSet.add('https://www.khmerrooms.com' + m[1]);
    }
  }

  const urls = Array.from(urlSet);
  console.log('Fetching', urls.length, 'hotel pages from KhmerRooms...');

  const extracted = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    try {
      const html = await fetchUrl(u);
      const scriptRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
      let sm;
      while ((sm = scriptRe.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(sm[1]);
          if (parsed && parsed['@type'] === 'LodgingBusiness') {
            // Also look for any tel: or phone number in the page HTML
            const telMatch = html.match(/tel:(\+?[0-9\s\-]{8,15})/i);
            parsed._extractedPhone = telMatch ? telMatch[1].trim() : '';
            parsed._sourceUrl = u;
            extracted.push(parsed);
          }
        } catch (_e) {}
      }
    } catch (err) {
      console.error('Failed:', u, err.message);
    }
  }

  console.log('Successfully extracted LodgingBusiness records:', extracted.length);
  fs.writeFileSync('scripts/khmerrooms_raw.json', JSON.stringify(extracted, null, 2), 'utf8');
}

main();
