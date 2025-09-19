import { browser } from 'wxt/browser';
import { WHITE_LOGO_URL, X_SELECTORS } from './constants';
import { X_STYLE_TEXT } from './constants';

type CleanupFn = () => void;

let tyquillXTooltipEl: HTMLDivElement | null = null;
let tyquillXTooltipTimer: number | undefined;

function isXSite(): boolean {
  const host = location.hostname;
  return host.includes('x.com') || host.includes('twitter.com');
}

// removed unused isDarkMode

function ensureStylesInjected(): void {
  if (document.getElementById('tyquill-x-action-styles')) return;
  const style = document.createElement('style');
  style.id = 'tyquill-x-action-styles';
  style.textContent = X_STYLE_TEXT;
  document.head.appendChild(style);
}

function ensureGlobalTooltip(): HTMLDivElement {
  if (tyquillXTooltipEl && document.body.contains(tyquillXTooltipEl)) return tyquillXTooltipEl;
  const el = document.createElement('div');
  el.id = 'tyquill-x-tooltip';
  document.body.appendChild(el);
  tyquillXTooltipEl = el;
  return el;
}

function computeAndPlaceTooltip(target: HTMLElement, text: string, yOffset: number): void {
  const el = ensureGlobalTooltip();
  el.textContent = text;
  // Measure width and position immediately under the icon (opacity may be 0)
  const tooltipWidth = el.offsetWidth;
  const rect = target.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const x = Math.round(centerX - tooltipWidth / 2);
  const y = Math.round(rect.bottom + yOffset);
  el.style.transform = `translate(${x}px, ${y}px)`;
}

function showGlobalTooltip(target: HTMLElement, text: string): void {
  // Assume pre-positioned at y+6; animate to y+8 while fading in
  const el = ensureGlobalTooltip();
  computeAndPlaceTooltip(target, text, 8);
  el.style.opacity = '1';
}

function hideGlobalTooltip(): void {
  if (!tyquillXTooltipEl) return;
  tyquillXTooltipEl.style.opacity = '0';
}

function attachTooltipHandlers(target: HTMLElement): void {
  const delay = 120;
  const enter = () => {
    const text = target.getAttribute('data-tooltip') || '';
    if (!text) return;
    if (tyquillXTooltipTimer) window.clearTimeout(tyquillXTooltipTimer);
    // Pre-position slightly closer (y+6) immediately to avoid teleport
    try { computeAndPlaceTooltip(target, text, 6); } catch {}
    tyquillXTooltipTimer = window.setTimeout(() => { showGlobalTooltip(target, text); }, delay);
  };
  const leave = () => {
    if (tyquillXTooltipTimer) window.clearTimeout(tyquillXTooltipTimer);
    // Slightly move back to y+6 while hiding
    const text = target.getAttribute('data-tooltip') || '';
    try { computeAndPlaceTooltip(target, text, 6); } catch {}
    hideGlobalTooltip();
  };
  target.addEventListener('mouseenter', enter, true);
  target.addEventListener('mouseleave', leave, true);
  target.addEventListener('focusin', enter, true);
  target.addEventListener('focusout', leave, true);
}

// removed unused createInlineTyquillSVG

function createTyquillIconImgFallback(): HTMLImageElement {
  const img = document.createElement('img');
  img.src = WHITE_LOGO_URL;
  img.alt = 'Tyquill';
  img.style.display = 'block';
  img.style.objectFit = 'contain';
  return img;
}

function createXStyledTyquillIcon(): SVGElement | HTMLElement {
  return createTyquillIconImgFallback();
}

function selectActionBarContainers(root: ParentNode = document): HTMLElement[] {
  // 제공된 부모 요소 셀렉터를 기준으로 각 포스트의 액션 버튼 컨테이너 찾기
  const selector = X_SELECTORS.actionBarContainers.join(',');
  const els = (root as Document | Element).querySelectorAll?.(selector) || [];
  return Array.from(els).filter((n): n is HTMLElement => n instanceof HTMLElement);
}

function needsInjection(container: HTMLElement): boolean {
  return !container.querySelector('[data-tyquill="x-action"]');
}

function insertAsSecondLast(container: HTMLElement, el: HTMLElement): void {
  // "마지막에서 두 번째" 위치로 삽입
  const childCount = container.childElementCount;
  const refIndex = Math.max(0, childCount - 1); // 마지막 요소 앞에 넣기
  const ref = container.children.item(refIndex);
  try {
    if (ref) container.insertBefore(el, ref);
    else container.appendChild(el);
  } catch {
    container.appendChild(el);
  }
}

// removed unused insertAsFirst

function adjustRightMarginIfSecondLast(container: HTMLElement, el: HTMLElement): void {
  try {
    const children = Array.from(container.children);
    const idx = children.indexOf(el);
    const isSecondLast = idx === children.length - 2;
    const btn = el.querySelector('[data-tyquill="x-action"]') as HTMLElement | null;
    if (btn) {
      // 기본값 2px, 마지막에서 두 번째일 때 여유 간격 확보
      btn.style.marginRight = isSecondLast ? '6px' : '';
    }
  } catch {}
}

// removed unused findDirectChildOfContainer

// removed unused insertAfterFollowElseFirst

function createTyquillButton(): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', 'Save to Tyquill');
  el.setAttribute('data-tooltip', 'Save to Tyquill');
  el.setAttribute('data-tyquill', 'x-action');

  const icon = createXStyledTyquillIcon();
  try {
    (icon as HTMLElement).style.width = '18px';
    (icon as HTMLElement).style.height = '18px';
  } catch {}
  el.appendChild(icon);

  const onActivate = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    try { await doScrapFromXButton(el); } catch {}
  };
  el.addEventListener('click', onActivate, true);
  el.addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' || ke.key === ' ') {
      onActivate(e);
    }
  }, true);

  try { attachTooltipHandlers(el); } catch {}

  return el;
}

function createActionNodeUsingSiblingTemplate(container: HTMLElement): HTMLElement | null {
  try {
    // 1) Grok 버튼을 우선 템플릿으로 사용
    const grokButton = container.querySelector(X_SELECTORS.grokButton) as HTMLButtonElement | null;
    const preferredWrapper = (grokButton?.parentElement as HTMLElement | null) || null;

    // 2) 폴백: 형제 중 우리 주입이 아닌 첫 래퍼(div)와 그 내부 button
    const fallbackWrapper = Array.from(container.children).find((c) => (
      c instanceof HTMLElement && !c.hasAttribute('data-tyquill') && (
        c.querySelector('button')
      )
    )) as HTMLElement | undefined;
    const sourceWrapper = preferredWrapper || fallbackWrapper || null;
    const siblingButton = (grokButton || (sourceWrapper?.querySelector('button') as HTMLButtonElement | null)) || null;
    if (!sourceWrapper || !siblingButton) return null;

    const wrapperClass = sourceWrapper.className || '';
    const buttonClass = siblingButton.className || '';

    // 버튼 첫 번째 자식 컨테이너 그대로 복제 (hover/color 등 스타일 적용 지점)
    const contentRootTemplate = siblingButton.firstElementChild as HTMLElement | null;
    const contentRootClass = contentRootTemplate?.className || '';
    const contentRootDir = contentRootTemplate?.getAttribute('dir');
    const contentRootStyle = contentRootTemplate?.getAttribute('style') || '';

    // 아이콘 컨테이너 후보: X 버튼 내에서 아이콘을 감싸는 div (예: .css-175oi2r.r-xoduu5)
    const iconContainerTemplate = siblingButton.querySelector('div.css-175oi2r.r-xoduu5') as HTMLElement | null
      || contentRootTemplate as HTMLElement | null;
    const iconContainerClass = iconContainerTemplate?.className || '';

    // 아이콘 뒤 배경/레이어가 있는 경우 첫 div의 class 복제 (선택)
    const bgLayerTemplate = iconContainerTemplate?.querySelector(':scope > div') as HTMLElement | null;
    const bgLayerClass = bgLayerTemplate?.className || '';

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-tyquill', 'x-action-wrapper');

    const button = document.createElement('div');
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', 'Save to Tyquill');
    button.setAttribute('data-tooltip', 'Save to Tyquill');
    button.setAttribute('data-tyquill', 'x-action');

    // content root 복제
    const contentRoot = document.createElement('div');
    if (contentRootClass) contentRoot.className = contentRootClass;
    if (contentRootDir) contentRoot.setAttribute('dir', contentRootDir);
    if (contentRootStyle) contentRoot.setAttribute('style', contentRootStyle);

    // icon container 구성
    const content = document.createElement('div');
    // 강제 클래스 세트 적용: non-hover / hover
    const NON_HOVER_ICON_CLASS = 'css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-1niwhzg r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1ny4l3l';
    const HOVER_ICON_CLASS = 'css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1krxqcr r-1ny4l3l';
    content.className = NON_HOVER_ICON_CLASS;
    if (bgLayerClass) {
      const layer = document.createElement('div');
      layer.className = bgLayerClass;
      content.appendChild(layer);
    }

    const icon = createXStyledTyquillIcon();
    try {
      (icon as HTMLElement).style.width = '18px';
      (icon as HTMLElement).style.height = '18px';
    } catch {}
    content.appendChild(icon);

    contentRoot.appendChild(content);
    button.appendChild(contentRoot);

    const onActivate = async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      try { await doScrapFromXButton(button); } catch {}
    };
    button.addEventListener('click', onActivate, true);
    button.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' || ke.key === ' ') {
        onActivate(e);
      }
    }, true);

    try { attachTooltipHandlers(button); } catch {}

    wrapper.appendChild(button);
    return wrapper;
  } catch {
    return null;
  }
}

function normalizeText(text: string): string {
  return (text || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toAbsoluteUrl(href: string | null | undefined): string {
  const h = (href || '').trim();
  if (!h) return location.href;
  if (/^https?:\/\//i.test(h)) return h;
  try { return new URL(h, window.location.origin).toString(); } catch { return h; }
}

function findPostRootFromAction(buttonEl: Element): HTMLElement {
  // X의 한 포스트 article 루트 추정
  let cur: HTMLElement | null = buttonEl as HTMLElement;
  for (let i = 0; i < 8 && cur; i++) {
    const art = cur.closest('article') as HTMLElement | null;
    if (art) return art;
    cur = cur.parentElement;
  }
  return (buttonEl.closest('article') as HTMLElement) || document.body;
}

function extractAuthorName(root: HTMLElement): string | null {
  // 우선: User-Name 블록의 표시명 사용 (예: Better Auth)
  try {
    // 1) 현재 기사 루트 내 우선 탐색
    let nameBlock = root.querySelector('div[data-testid="User-Name"]') as HTMLElement | null;
    // 2) 루트 내 없으면 단일 트윗(퍼머링크) 페이지 구조에서 문서 레벨 보조 탐색
    if (!nameBlock) {
      nameBlock = document.querySelector('article[data-testid="tweet"] div[data-testid="User-Name"]') as HTMLElement | null;
    }
    if (nameBlock) {
      // 가능한 후보 수집: dir="ltr"가 붙은 블록들
      const candidates: string[] = [];
      nameBlock.querySelectorAll('div[dir="ltr"] span, span[dir="ltr"]').forEach((el) => {
        const t = normalizeText((el as HTMLElement).innerText || '');
        if (t) candidates.push(t);
      });
      // 텍스트가 없으면 링크 전체 텍스트 사용
      if (candidates.length === 0) {
        const link = nameBlock.querySelector('a[role="link"]') as HTMLElement | null;
        const t = normalizeText(link?.innerText || '');
        if (t) candidates.push(t);
      }
      // 시간/날짜 형태는 제거 (예: "5:54 AM · Sep 12, 2025")
      const timeLike = /\d{1,2}:\d{2}\s*(AM|PM)\b|\bJan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec\b|\d{4}/i;
      const filtered = candidates.map(c => c.replace(/@[\w.]+/g, '').trim())
        .filter(c => c && !timeLike.test(c));
      const picked = filtered.sort((a, b) => b.length - a.length)[0];
      if (picked) {
        const cleaned = picked.split('\n')[0].trim();
        if (cleaned) return cleaned;
      }
    }
  } catch {}

  // 보조: 프로필 링크에서 표시명 추출 (status 링크 제외)
  try {
    const profileNameSpan = root.querySelector('a[role="link"][href^="/"]:not([href*="/status/"]) div[dir="ltr"] span') as HTMLElement | null;
    const txt = normalizeText(profileNameSpan?.innerText || '');
    if (txt) return txt;
  } catch {}

  // 작성자 이름: aria-label 보조 (status 링크 제외 + 시간 패턴 제외)
  try {
    const link = root.querySelector('a[role="link"][href^="/"]:not([href*="/status/"])[aria-label]') as HTMLAnchorElement | null;
    const label = normalizeText(link?.getAttribute('aria-label') || '');
    const timeLike = /\d{1,2}:\d{2}\s*(AM|PM)\b|\bJan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec\b|\d{4}/i;
    if (label && !timeLike.test(label)) return label;
  } catch {}

  // 대체: @handle 형태
  const handle = root.querySelector('a[href^="/"] [dir="ltr"] span') as HTMLElement | null;
  if (handle?.innerText) return normalizeText(handle.innerText);
  return null;
}

function extractPermalink(root: HTMLElement): string {
  // 타임스탬프 링크 or share 링크
  const timeLink = root.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null;
  if (timeLink?.href || timeLink?.getAttribute('href')) {
    return toAbsoluteUrl(timeLink.href || timeLink.getAttribute('href') || '');
  }
  return location.href;
}

function extractImageMarkdown(root: HTMLElement): string[] {
  const md: string[] = [];
  const seen = new Set<string>();

  // 1) <img> 기반 추출
  const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
  imgs.forEach((img) => {
    if (img.closest('[data-tyquill]')) return;
    const alt = (img.getAttribute('alt') || '').trim();
    // 아바타/아이콘 배제 휴리스틱
    if (/프로필|avatar|logo|emoji|아이콘/i.test(alt)) return;
    const w = Number(img.getAttribute('width') || img.width || 0);
    const h = Number(img.getAttribute('height') || img.height || 0);
    if ((w && w < 60) || (h && h < 60)) return;

    const url = toAbsoluteUrl(img.currentSrc || img.src || '');
    if (!url || /^data:/i.test(url)) return;
    if (seen.has(url)) return; seen.add(url);
    const safeAlt = alt.replace(/[\r\n]+/g, ' ').trim();
    md.push(`![${safeAlt}](${url})`);
  });

  // 2) background-image 기반 추출 (X: [data-testid="tweetPhoto"])
  const photoBlocks = Array.from(root.querySelectorAll('[data-testid="tweetPhoto"]')) as HTMLElement[];
  photoBlocks.forEach((el) => {
    if (el.closest('[data-tyquill]')) return;
    const ariaAlt = (el.getAttribute('aria-label') || '').trim();
    let bgUrl = '';
    const styleBg = (el as HTMLElement).style?.backgroundImage || '';
    const matchInline = styleBg.match(/url\(["']?([^\)"']+)["']?\)/i);
    if (matchInline && matchInline[1]) {
      bgUrl = matchInline[1];
    }
    if (!bgUrl) {
      const styled = el.querySelector('[style*="background-image"]') as HTMLElement | null;
      const s = styled?.style?.backgroundImage || '';
      const m = s.match(/url\(["']?([^\)"']+)["']?\)/i);
      if (m && m[1]) bgUrl = m[1];
    }
    if (!bgUrl) return;
    const url = toAbsoluteUrl(bgUrl);
    if (!url || /^data:/i.test(url)) return;
    if (seen.has(url)) return; seen.add(url);
    const safeAlt = ariaAlt.replace(/[\r\n]+/g, ' ').trim();
    md.push(`![${safeAlt}](${url})`);
  });

  return md;
}

function collectPostText(root: HTMLElement, authorHint?: string): string {
  // 본문 텍스트: [data-testid="tweetText"], [lang], [dir="auto"] 등 우선
  const candidates: string[] = [];
  const pushIfValid = (txt: string) => {
    const t = normalizeText(txt);
    if (!t) return;
    if (authorHint && t === authorHint) return;
    candidates.push(t);
  };

  const primary = root.querySelector('[data-testid="tweetText"]') as HTMLElement | null;
  if (primary) pushIfValid(primary.innerText || '');

  root.querySelectorAll('[lang], [dir="auto"]').forEach((el) => {
    const h = el as HTMLElement;
    if (h.closest('button,[role="button"], nav, header, footer')) return;
    pushIfValid(h.innerText || '');
  });

  if (candidates.length === 0) {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll([
      '[data-tyquill]',
      'button',
      '[role="button"]',
      'svg',
      'video',
      'audio',
      'img',
      'nav',
      'time',
      'a[role="button"]',
    ].join(',')).forEach(n => n.remove());
    const txt = normalizeText(clone.innerText || '');
    if (txt && (!authorHint || txt !== authorHint)) candidates.push(txt);
  }

  const joined = normalizeText(Array.from(new Set(candidates)).join('\n\n'));
  const lines = joined.split('\n').map(s => s.trim()).filter(Boolean);
  const filtered = lines.filter(l => !authorHint || l !== authorHint);
  const dedup = Array.from(new Set(filtered));
  return normalizeText(dedup.join('\n'));
}

async function doScrapFromXButton(buttonEl: Element): Promise<void> {
  const root = findPostRootFromAction(buttonEl);
  const author = extractAuthorName(root) || '';
  let content = collectPostText(root, author);
  const title = author ? `X Post | ${author}` : 'X Post';
  const url = extractPermalink(root);
  const images = extractImageMarkdown(root);
  if (images.length > 0) {
    content = content ? `${content}\n\n${images.join('\n')}` : images.join('\n');
  }
  try {
    await browser.runtime.sendMessage({
      action: 'scrapExtracted',
      data: { content, title, url }
    });
  } catch {}
}

function injectIntoActionBars(root: ParentNode = document): void {
  const containers = selectActionBarContainers(root);
  containers.forEach((container) => {
    if (!needsInjection(container)) return;
    const node = createActionNodeUsingSiblingTemplate(container) || (() => {
      // 폴백: 간단한 wrapper + button
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-tyquill', 'x-action-wrapper');
      const button = createTyquillButton();
      wrapper.appendChild(button);
      return wrapper;
    })();
    insertAsSecondLast(container, node as HTMLElement);
    adjustRightMarginIfSecondLast(container, node as HTMLElement);
  });
}

export function initXInjector(): CleanupFn {
  if (!isXSite()) return () => {};

  ensureStylesInjected();
  injectIntoActionBars(document);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        const added = Array.from(m.addedNodes).filter((n) => n instanceof Element) as Element[];
        added.forEach((node) => {
          if (!(node instanceof Element)) return;
          injectIntoActionBars(node);
        });
      }
    }
  });
  try {
    observer.observe(document.body, { childList: true, subtree: true });
  } catch {}

  return () => {
    try { observer.disconnect(); } catch {}
    try { hideGlobalTooltip(); } catch {}
  };
}
