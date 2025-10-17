import { browser } from 'wxt/browser';
import { WHITE_LOGO_URL, YT_SELECTORS, YT_STYLE_TEXT } from './constants';
import { trackPlatformContentScrapedBridge } from '../analytics/bridge';

type CleanupFn = () => void;

function isYouTubeSite(): boolean {
  try {
    const host = window.location.hostname;
    return host.includes('youtube.com') || host.includes('m.youtube.com');
  } catch {
    return false;
  }
}

function parseRgbColor(rgb: string): { r: number; g: number; b: number } | null {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim();
  const m = h.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const v = m[1];
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return { r, g, b };
}

function luminanceFromRGB(rgb: { r: number; g: number; b: number } | null): number | null {
  if (!rgb) return null;
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

function isYouTubeDarkTheme(): boolean {
  try {
    // 1) Prefer CSS variable --yt-spec-base-background if available
    const csRoot = getComputedStyle(document.documentElement);
    const baseBg = (csRoot.getPropertyValue('--yt-spec-base-background') || '').trim();
    let lum: number | null = null;
    if (baseBg) {
      lum = luminanceFromRGB(parseRgbColor(baseBg) || parseHexColor(baseBg));
    }

    // 2) If not conclusive, inspect main containers' backgroundColor
    if (lum == null) {
      const candidates = [
        document.querySelector('ytd-app') as HTMLElement | null,
        document.querySelector('tp-yt-app') as HTMLElement | null,
        document.body as HTMLElement | null,
        document.documentElement as HTMLElement | null,
      ].filter(Boolean) as HTMLElement[];
      for (const el of candidates) {
        const bg = getComputedStyle(el).backgroundColor;
        const L = luminanceFromRGB(parseRgbColor(bg));
        if (L != null) { lum = L; break; }
      }
    }

    // 3) If still null, check text primary color (dark theme uses very bright text)
    if (lum == null) {
      const textPrimary = (csRoot.getPropertyValue('--yt-spec-text-primary') || '').trim();
      const Ltext = luminanceFromRGB(parseRgbColor(textPrimary) || parseHexColor(textPrimary));
      if (Ltext != null) {
        // High-luminance text implies dark theme background
        return Ltext > 180;
      }
    }

    if (lum != null) {
      // Dark theme if background luminance is low
      return lum < 80;
    }
  } catch {}

  // 4) Fallback to OS setting only if nothing else worked
  try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch {}
  return false;
}

function ensureStylesInjected(): void {
  if (document.getElementById('tyquill-yt-action-styles')) return;
  const style = document.createElement('style');
  style.id = 'tyquill-yt-action-styles';
  style.textContent = YT_STYLE_TEXT;
  document.head.appendChild(style);
}

function extractFavicon(): string | null {
  // Try to find favicon from link tags
  const iconLink = document.querySelector('link[rel*="icon"]') as HTMLLinkElement | null;
  if (iconLink?.href) {
    return iconLink.href;
  }

  // Fallback to default favicon.ico
  return `${window.location.origin}/favicon.ico`;
}

function applyIconTheme(target?: ParentNode): void {
  const isDark = isYouTubeDarkTheme();
  const filterValue = isDark ? 'none' : 'invert(1)';
  const scope = (target || document);
  scope.querySelectorAll?.('button[data-tyquill="yt-action"] img').forEach((n) => {
    try { (n as HTMLElement).style.setProperty('filter', filterValue, 'important'); } catch {}
  });
}

function querySubscribeHost(root: ParentNode = document): { owner: Element, subscribe: Element } | null {
  // Primary path: #owner contains #subscribe-button
  const owner = root.querySelector(YT_SELECTORS.ownerPrimary) as Element | null;
  if (owner) {
    const subscribe = owner.querySelector(YT_SELECTORS.subscribeButton) as Element | null;
    if (subscribe) return { owner, subscribe };
  }

  // Alternative paths observed in templates
  const ownerAlt = root.querySelector(YT_SELECTORS.ownerAlt) as Element | null;
  if (ownerAlt) {
    const subscribeAlt = ownerAlt.querySelector(YT_SELECTORS.subscribeAlt) as Element | null;
    if (subscribeAlt) return { owner: ownerAlt, subscribe: subscribeAlt };
  }

  // Shorts/watch variations
  const ownerAny = root.querySelector(YT_SELECTORS.ownerAny) as Element | null;
  if (ownerAny) {
    const subscribeAny = ownerAny.querySelector('#owner #subscribe-button, #subscribe-button') as Element | null;
    if (subscribeAny) return { owner: ownerAny, subscribe: subscribeAny };
  }

  return null;
}

function getInjectionParent(subscribeEl: Element): Element | null {
  // Place our button as a sibling of the subscribe button's host container
  // On YouTube, #subscribe-button is a container; we will insert after it under the same parent
  const parent = subscribeEl.parentElement;
  if (parent && parent instanceof HTMLElement) return parent;
  return null;
}

function needsInjection(parent: Element): boolean {
  return !parent.querySelector('[data-tyquill="yt-action"]');
}

function createTyquillButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Save with Tyquill');
  button.setAttribute('data-tyquill', 'yt-action');
  button.className = 'tyquill-yt-action-btn';

  const img = document.createElement('img');
  img.src = WHITE_LOGO_URL;
  img.alt = 'Tyquill';
  try {
    const filterValue = isYouTubeDarkTheme() ? 'none' : 'invert(1)';
    img.style.setProperty('filter', filterValue, 'important');
  } catch {}

  const label = document.createElement('span');
  label.textContent = 'Save to Tyquill';
  label.style.fontSize = '14px';
  label.style.lineHeight = '16px';
  label.style.whiteSpace = 'nowrap';

  button.appendChild(img);
  button.appendChild(label);

  return button;
}

function normalizeText(text: string): string {
  return (text || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTitle(): string {
  const h1 = document.querySelector('ytd-watch-metadata h1 yt-formatted-string') as HTMLElement | null
    || document.querySelector('h1 > yt-formatted-string') as HTMLElement | null
    || document.querySelector('h1#title') as HTMLElement | null;
  return normalizeText(h1?.innerText || document.title.replace(/ - YouTube$/, '') || 'YouTube');
}

function extractDescription(): string {
  // Prefer description within watch metadata area
  const candidates: Element[] = [];
  const sel = [
    'ytd-watch-metadata #description',
    '#description.ytd-watch-metadata',
    'ytd-video-secondary-info-renderer #description',
    'yt-formatted-string#description'
  ];
  sel.forEach(s => { const el = document.querySelector(s); if (el) candidates.push(el); });
  const picked = candidates.find(Boolean) as HTMLElement | undefined;
  const text = normalizeText(picked?.innerText || '');
  if (text) return text;

  // Fallback: clone metadata area and strip non-description parts
  const metadata = document.querySelector('ytd-watch-metadata') as HTMLElement | null;
  if (metadata) {
    const clone = metadata.cloneNode(true) as HTMLElement;
    clone.querySelectorAll([
      '#owner',
      'ytd-sentiment-bar-renderer',
      'ytd-menu-renderer',
      'ytd-watch-info-text',
      'ytd-video-primary-info-renderer',
      'ytd-watch-next-secondary-results-renderer',
      'button',
      'svg',
      'a',
      '#comments'
    ].join(','))?.forEach(n => n.remove());
    const txt = normalizeText(clone.innerText || '');
    if (txt) return txt;
  }

  return '';
}

async function doScrapFromYouTubeButton(): Promise<boolean> {
  try {
    const title = extractTitle() || 'YouTube';
    const url = window.location.href;
    const main = extractDescription();
    const content = normalizeText(main);

    // Extract favicon
    const faviconUrl = extractFavicon();

    // Track scraping event
    try {
      await trackPlatformContentScrapedBridge({
        platform: 'youtube',
        content_type: 'video',
        has_author: !!title && title !== 'YouTube',
        has_images: false, // YouTube 썸네일은 현재 미추출
        content_length: content.length,
        image_count: 0,
        url: url,
        has_content: !!content.trim(),
        video_title: title
      });
    } catch {}

    if (!content.trim()) return false;

    await browser.runtime.sendMessage({
      action: 'scrapExtracted',
      data: {
        content,
        title: `YouTube | ${title}`,
        url,
        faviconUrl,
        siteName: 'YouTube'
      }
    });
    return true;
  } catch {
    return false;
  }
}

function injectButtonNearSubscribe(root: ParentNode = document): void {
  const found = querySubscribeHost(root);
  if (!found) return;
  const { subscribe } = found;
  const parent = getInjectionParent(subscribe);
  if (!parent) return;
  if (!needsInjection(parent)) return;

  const button = createTyquillButton();

  // Delegate click handler here: try structured scrape, fallback to page clip
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await doScrapFromYouTubeButton();
    if (!ok) {
      try { window.dispatchEvent(new CustomEvent('tyquill:yt-button-click')); } catch {}
    }
  }, true);

  try {
    if (subscribe.nextSibling) {
      parent.insertBefore(button, subscribe.nextSibling);
    } else {
      parent.appendChild(button);
    }
  } catch {
    parent.appendChild(button);
  }

  // Ensure icon theme is correct after insertion
  try { applyIconTheme(button); } catch {}
}

export function initYouTubeInjector(): CleanupFn {
  if (!isYouTubeSite()) return () => {};

  ensureStylesInjected();

  // Keep global delegated handler for robustness (buttons added later without listeners)
  const handler = async (e: Event) => {
    const target = e.target as Element | null;
    if (!target) return;
    const btn = target.closest('button[data-tyquill="yt-action"]') as HTMLButtonElement | null;
    if (!btn) return;
    e.stopPropagation();
    const ok = await doScrapFromYouTubeButton();
    if (!ok) {
      try { window.dispatchEvent(new CustomEvent('tyquill:yt-button-click')); } catch {}
    }
  };
  document.addEventListener('click', handler, true);

  // React to theme changes
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = () => { try { applyIconTheme(); } catch {} };
    if (mq.addEventListener) mq.addEventListener('change', onThemeChange);
    else if ((mq as any).addListener) (mq as any).addListener(onThemeChange);
  } catch {}

  // Initial injection attempt
  try { injectButtonNearSubscribe(document); } catch {}
  try { applyIconTheme(); } catch {}

  // Observe dynamic changes (SPA navigation and component updates)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          injectButtonNearSubscribe(node);
          // Also re-check document to be safe on structural changes
          injectButtonNearSubscribe(document);
          applyIconTheme(node);
        });
      }
    }
  });
  try {
    observer.observe(document.body, { childList: true, subtree: true });
  } catch {}

  return () => {
    try { observer.disconnect(); } catch {}
    document.removeEventListener('click', handler, true);
  };
}
