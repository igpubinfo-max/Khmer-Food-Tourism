/**
 * Runtime Subpath Public Asset Resolver
 * Ensures root-relative public asset paths (e.g. `/categories/...`, `/welcome/...`, `/foods/...`,
 * `/destinations/...`, `/banners/...`, `/logo-kft.png`, `/version.json`) load seamlessly when the web
 * app is hosted under a subpath such as GitHub Pages (`/Khmer-Food-Tourism/`), while remaining a
 * zero-overhead no-op on root origins (Android APK, iOS, and localhost).
 */

const PUBLIC_ASSET_PREFIX_RE =
  /^\/(banners|categories|destinations|foods|icons|images|Shop|templates|welcome|logo-kft\.png|app-icon\.png|app-logo-v200\.png|apple-touch-icon\.png|donation-qr\.png|favicon\.png|icon-192\.png|icon-512\.png|icon\.png|logo\.svg|manifest\.json|privacy-policy\.html|version\.json|welcome-app-icon\.png)(\/|\?|$)/i;

export function detectSubpathBasePrefix(pathname?: string): string {
  const raw = typeof pathname === 'string'
    ? pathname
    : typeof window !== 'undefined' && window.location
      ? window.location.pathname || ''
      : '';
  const match = raw.match(/^(\/Khmer-Food-Tourism)(?:\/|$)/i);
  return match ? match[1] : '';
}

export function rewritePublicAssetUrl(url: string, prefix: string): string {
  if (!prefix || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return url;
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase() + '/')) return url;
  if (PUBLIC_ASSET_PREFIX_RE.test(trimmed)) {
    return `${prefix}${trimmed}`;
  }
  return url;
}

export function rewriteCssUrlValue(cssValue: string, prefix: string): string {
  if (!prefix || typeof cssValue !== 'string' || !cssValue.includes('url(')) return cssValue;
  return cssValue.replace(/url\(\s*(['"]?)(\/[^'")]+)\1\s*\)/gi, (full, quote, rawPath) => {
    const rewritten = rewritePublicAssetUrl(rawPath, prefix);
    return rewritten !== rawPath ? `url(${quote}${rewritten}${quote})` : full;
  });
}

let installed = false;

export function installSubpathAssetResolver(): void {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  const basePrefix = detectSubpathBasePrefix();
  if (!basePrefix) return;
  installed = true;

  try {
    // 1. Inject subpath CSS overrides for modal & login banners defined in index.css
    const styleId = 'kft-subpath-css-fix';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        .kft-khmer-modal-header {
          background-image: url('${basePrefix}/banners/Untitled-3.png?v=hq1623') !important;
        }
        .kft-khmer-login-header {
          background-image: linear-gradient(180deg, rgba(0, 30, 10, 0.22) 0%, rgba(0, 30, 10, 0.10) 100%), url('${basePrefix}/banners/auth_login_header_banner.jpg?v=hq1623') !important;
        }
      `;
      (document.head || document.documentElement).appendChild(styleEl);
    }

    // 2. Patch Element.prototype.setAttribute for src, href, and inline style
    const origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (typeof value === 'string') {
        const lower = name.toLowerCase();
        if (lower === 'src' || lower === 'href') {
          value = rewritePublicAssetUrl(value, basePrefix);
        } else if (lower === 'style') {
          value = rewriteCssUrlValue(value, basePrefix);
        }
      }
      return origSetAttribute.call(this, name, value);
    };

    // 3. Patch property setters on HTMLImageElement.src, HTMLSourceElement.src, HTMLAnchorElement.href, HTMLLinkElement.href
    const patchProp = (proto: any, prop: string) => {
      if (!proto) return;
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (desc && typeof desc.set === 'function' && desc.configurable) {
        const origSet = desc.set;
        Object.defineProperty(proto, prop, {
          ...desc,
          set(val: any) {
            const nextVal = typeof val === 'string' ? rewritePublicAssetUrl(val, basePrefix) : val;
            return origSet.call(this, nextVal);
          },
        });
      }
    };

    if (typeof HTMLImageElement !== 'undefined') patchProp(HTMLImageElement.prototype, 'src');
    if (typeof HTMLSourceElement !== 'undefined') patchProp(HTMLSourceElement.prototype, 'src');
    if (typeof HTMLAnchorElement !== 'undefined') patchProp(HTMLAnchorElement.prototype, 'href');
    if (typeof HTMLLinkElement !== 'undefined') patchProp(HTMLLinkElement.prototype, 'href');

    // 4. Patch CSSStyleDeclaration for inline style={{ backgroundImage: "url('/...')" }}
    if (typeof CSSStyleDeclaration !== 'undefined') {
      const origSetProperty = CSSStyleDeclaration.prototype.setProperty;
      if (typeof origSetProperty === 'function') {
        CSSStyleDeclaration.prototype.setProperty = function (property: string, value: string | null, priority?: string) {
          if (typeof value === 'string' && value.includes('url(')) {
            value = rewriteCssUrlValue(value, basePrefix);
          }
          return origSetProperty.call(this, property, value, priority);
        };
      }
      const bgDesc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'backgroundImage');
      if (bgDesc && typeof bgDesc.set === 'function' && bgDesc.configurable) {
        const origBgSet = bgDesc.set;
        Object.defineProperty(CSSStyleDeclaration.prototype, 'backgroundImage', {
          ...bgDesc,
          set(val: any) {
            const nextVal = typeof val === 'string' ? rewriteCssUrlValue(val, basePrefix) : val;
            return origBgSet.call(this, nextVal);
          },
        });
      }
    }

    // 5. Patch window.fetch for root-relative public files (e.g. `/version.json`)
    if (typeof window.fetch === 'function') {
      const origFetch = window.fetch.bind(window);
      window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
        if (typeof input === 'string') {
          input = rewritePublicAssetUrl(input, basePrefix);
        }
        return origFetch(input, init);
      };
    }

    // 6. Sweep existing DOM nodes and observe future DOM mutations
    const fixElement = (el: Element) => {
      const srcAttr = el.getAttribute('src');
      if (srcAttr) {
        const fixedSrc = rewritePublicAssetUrl(srcAttr, basePrefix);
        if (fixedSrc !== srcAttr) origSetAttribute.call(el, 'src', fixedSrc);
      }
      const hrefAttr = el.getAttribute('href');
      if (hrefAttr) {
        const fixedHref = rewritePublicAssetUrl(hrefAttr, basePrefix);
        if (fixedHref !== hrefAttr) origSetAttribute.call(el, 'href', fixedHref);
      }
      const styleAttr = el.getAttribute('style');
      if (styleAttr && styleAttr.includes('url(')) {
        const fixedStyle = rewriteCssUrlValue(styleAttr, basePrefix);
        if (fixedStyle !== styleAttr) origSetAttribute.call(el, 'style', fixedStyle);
      }
    };

    document.querySelectorAll('[src], [href], [style]').forEach(fixElement);

    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.target instanceof Element) {
            fixElement(m.target);
          } else if (m.type === 'childList') {
            m.addedNodes.forEach((node) => {
              if (node instanceof Element) {
                fixElement(node);
                node.querySelectorAll('[src], [href], [style]').forEach(fixElement);
              }
            });
          }
        }
      });
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['src', 'href', 'style'],
      });
    }
  } catch (e) {
    console.warn('Subpath asset resolver warning:', e);
  }
}