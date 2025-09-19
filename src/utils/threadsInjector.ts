import { browser } from 'wxt/browser';
import { WHITE_LOGO_URL, THREADS_SELECTORS, THREADS_STYLE_TEXT } from './constants';
import { trackPlatformContentScrapedBridge } from '../analytics/bridge';

type CleanupFn = () => void;

function isThreadsSite(): boolean {
  const host = location.hostname;
  const href = location.href;
  return host.includes('threads.net') || host.includes('threads.com') || href.startsWith('https://www.instagram.com/threads/');
}

function isDarkMode(): boolean {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch {
    return false;
  }
}

function ensureStylesInjected(): void {
  if (document.getElementById('tyquill-threads-action-styles')) return;
  const style = document.createElement('style');
  style.id = 'tyquill-threads-action-styles';
  style.textContent = THREADS_STYLE_TEXT;
  document.head.appendChild(style);
}

function createInlineTyquillSVG(): SVGElement {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Tyquill');
  // 크기는 CSS에서 통일 관리
  svg.style.filter = isDarkMode() ? '' : 'invert(1)';
  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('fill', '#FFFFFF');
  // 간단한 깃펜 + 점 형태 (브랜딩 대체, CSP 우회용)
  const path1 = document.createElementNS(svgNS, 'path');
  path1.setAttribute('d', 'M3 21l3-8 8-3-3 8-8 3z');
  const path2 = document.createElementNS(svgNS, 'path');
  path2.setAttribute('d', 'M14 3l7 7-2 2-7-7 2-2z');
  const circle = document.createElementNS(svgNS, 'circle');
  circle.setAttribute('cx', '19');
  circle.setAttribute('cy', '5');
  circle.setAttribute('r', '2');
  g.appendChild(path1);
  g.appendChild(path2);
  g.appendChild(circle);
  svg.appendChild(g);
  return svg;
}

function createTyquillIconElement(): HTMLElement | SVGElement {
  const img = document.createElement('img');
  img.src = WHITE_LOGO_URL;
  img.alt = 'Tyquill';
  img.style.display = 'block';
  img.style.objectFit = 'contain';
  img.onerror = () => {
    try {
      const svg = createInlineTyquillSVG();
      img.replaceWith(svg);
    } catch {}
  };
  return img;
}

function createTyquillButton(): HTMLDivElement {
  const button = document.createElement('div');
  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');
  button.setAttribute('aria-label', 'Save with Tyquill');
  button.setAttribute('data-tyquill', 'threads-action');
  // 위치 보정은 CSS 변수로 제어 (기본 -8px), 상황에 따라 adjustButtonOffset에서 0px로 변경

  const icon = createTyquillIconElement();
  try {
    (icon as HTMLElement).style.width = '16px';
    (icon as HTMLElement).style.height = '16px';
    (icon as HTMLElement).style.removeProperty('transform');
  } catch {}
  button.appendChild(icon);

  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await doScrapFromThreadsButton(button);
    } catch {}
  }, true);

  return button;
}

// 사용자 제시 셀렉터에 부합하는 버튼 목록 컨테이너에 직접 주입 (클래스 의존 우선순위는 낮음)
function injectIntoExplicitButtonLists(root: ParentNode = document): void {
  const selector = THREADS_SELECTORS.explicitButtonList;
  const containers = (root as Document | Element).querySelectorAll?.(selector);
  containers?.forEach((el) => {
    if (!(el instanceof Element)) return;
    if (el.querySelector('[data-tyquill="threads-action"], [data-tyquill="threads-action-wrapper"]')) return;

    // 기준 앵커(첫 번째 버튼 래퍼)를 복제해 구조/간격을 보존
    const anchor = el.querySelector(':scope > div');
    if (anchor) {
      try {
        const anchorInner = anchor.querySelector(':scope > div');
        const anchorContent = anchorInner?.querySelector(':scope > div');

        const wrapper = anchor.cloneNode(false) as HTMLElement; // 같은 클래스 유지, 자식 없음
        wrapper.setAttribute('data-tyquill', 'threads-action-wrapper');

        const roleBtn = document.createElement('div');
        roleBtn.className = (anchorInner as HTMLElement | null)?.className || '';
        roleBtn.setAttribute('role', 'button');
        roleBtn.setAttribute('tabindex', '0');
        roleBtn.setAttribute('aria-label', 'Save with Tyquill');
        roleBtn.setAttribute('data-tyquill', 'threads-action');

        const content = document.createElement('div');
        content.className = (anchorContent as HTMLElement | null)?.className || '';

        const iconEl = createTyquillIconElement();
        try {
          (iconEl as HTMLElement).style.width = '16px';
          (iconEl as HTMLElement).style.height = '16px';
          (iconEl as HTMLElement).style.removeProperty('transform');
        } catch {}
        content.appendChild(iconEl);
        roleBtn.appendChild(content);
        roleBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          try { await doScrapFromThreadsButton(roleBtn); } catch {}
        }, true);

        wrapper.appendChild(roleBtn);
        try {
          el.insertBefore(wrapper, el.firstElementChild);
        } catch {
          el.appendChild(wrapper);
        }
        try { adjustButtonOffset(roleBtn as HTMLElement); } catch {}
        return;
      } catch {}
    }

    // 폴백: 단순 버튼을 직접 추가
    try {
      const b = createTyquillButton();
      el.insertBefore(b, el.firstElementChild);
      try { adjustButtonOffset(b as HTMLElement); } catch {}
    } catch {
      const b = createTyquillButton();
      el.appendChild(b);
      try { adjustButtonOffset(b as HTMLElement); } catch {}
    }
  });
}

export function initThreadsInjector(): CleanupFn {
  if (!isThreadsSite()) { return () => {}; }

  ensureStylesInjected();
  // 초기 스캔: 명시 셀렉터 기반 버튼 목록 컨테이너에만 주입
  injectIntoExplicitButtonLists(document);

  // 초기 로딩 타이밍 보정 폴링은 제거 (단순화)

  // 동적 로딩 대응: 새로 추가되는 노드에서만 인라인 컨트롤 스캔
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        const added = Array.from(m.addedNodes).filter((n) => n instanceof Element) as Element[];
        added.forEach((node) => {
          if (!(node instanceof Element)) return;
          injectIntoExplicitButtonLists(node);
        });
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
  };
}


function adjustButtonOffset(btn: HTMLElement): void {
  try {
    const wrapper = btn.parentElement as HTMLElement | null; // data-tyquill="threads-action-wrapper"
    const container = wrapper?.parentElement as HTMLElement | null;
    if (!wrapper || !container) return;

    // 기본: 첫 자식이면 -8px 유지
    const isFirst = container.firstElementChild === wrapper;
    if (!isFirst) {
      // 끼는 케이스: X=+8px, Y=0px
      btn.style.setProperty('--tyquill-button-translate-x', '8px');
      btn.style.setProperty('--tyquill-button-translate-y', '0px');
      return;
    }

    // 특수 케이스: 바로 오른쪽에 매우 작은 아이콘(예: 15px 프로필)이 붙어 있으면 겹침 방지 위해 0px
    const next = wrapper.nextElementSibling as HTMLElement | null;
    if (next) {
      const tinyImg = next.querySelector('img') as HTMLImageElement | null;
      const widthAttr = Number(tinyImg?.getAttribute('width') || 0);
      const heightAttr = Number(tinyImg?.getAttribute('height') || 0);
      const rect = tinyImg?.getBoundingClientRect();
      const w = rect?.width || widthAttr || 0;
      const h = rect?.height || heightAttr || 0;
      if ((w > 0 && w <= 18) || (h > 0 && h <= 18)) {
        // 끼는 케이스: X=+8px, Y=0px
        btn.style.setProperty('--tyquill-button-translate-x', '8px');
        btn.style.setProperty('--tyquill-button-translate-y', '0px');
        return;
      }
    }
  } catch {}
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

function getPostRootFromButton(el: Element): HTMLElement {
  let cur: HTMLElement | null = el as HTMLElement;
  for (let i = 0; i < 8 && cur; i++) {
    const hasPermalink = cur.querySelector('a[href*="/post/"]');
    const hasUser = cur.querySelector('a[href^="/@"]');
    if (hasPermalink && hasUser) return cur;
    cur = cur.parentElement;
  }
  const article = (el.closest('article') as HTMLElement | null) || (el.closest('[role="article"]') as HTMLElement | null);
  return article || (el.closest('div') as HTMLElement) || document.body;
}

function findAncestorWithContentArea(el: Element): HTMLElement | null {
  let cur: HTMLElement | null = el as HTMLElement;
  while (cur && cur !== document.body) {
    if (cur.querySelector(THREADS_SELECTORS.contentArea)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function extractAuthorName(root: HTMLElement): string | null {
  // 1) 사용자 링크에서 텍스트 추출
  const userLink = root.querySelector('a[href^="/@"]') as HTMLAnchorElement | null;
  if (userLink) {
    const span = (userLink.querySelector('span') as HTMLElement | null);
    const visible = normalizeText(span?.innerText || userLink.innerText || '');
    if (visible) return visible;
    // 2) href 경로에서 파싱
    const href = userLink.getAttribute('href') || '';
    const m = href.replace(/^\/@@/, '/@').match(/^\/@([^/?#]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  }
  // 3) 프로필 이미지 alt 파싱: "xxx님의 프로필 사진"
  const img = root.querySelector('img[alt$="님의 프로필 사진"]') as HTMLImageElement | null;
  if (img?.alt) {
    const alt = img.alt.replace(/님의 프로필 사진$/, '').trim();
    if (alt) return alt;
  }
  return null;
}

function extractPermalink(root: HTMLElement): string {
  const a = root.querySelector('a[href*="/post/"]') as HTMLAnchorElement | null;
  if (a?.href || a?.getAttribute('href')) {
    return toAbsoluteUrl(a.href || a.getAttribute('href') || '');
  }
  // fallback: 시간 링크 등 다른 앵커
  const any = root.querySelector('a[href^="/@"]') as HTMLAnchorElement | null;
  if (any?.href || any?.getAttribute('href')) {
    return toAbsoluteUrl(any.href || any.getAttribute('href') || '');
  }
  return location.href;
}

function extractImageMarkdown(root: HTMLElement): string[] {
  const md: string[] = [];
  // 본문 영역 우선 검색
  const searchRoot = (root.querySelector(THREADS_SELECTORS.contentArea) as HTMLElement | null) || root;
  const imgs = Array.from(searchRoot.querySelectorAll('img')) as HTMLImageElement[];
  imgs.forEach((img) => {
    // 제외 규칙: Tyquill 아이콘, 프로필 이미지, 액션바 내부, 아주 작은 아이콘
    if (img.closest('[data-tyquill]')) return;
    const alt = (img.getAttribute('alt') || '').trim();
    if (/님의 프로필 사진$/.test(alt)) return;
    if (img.closest('.x4vbgl9, .x1qfufaz, .x1k70j0n')) return;
    const w = Number(img.getAttribute('width') || img.width || 0);
    const h = Number(img.getAttribute('height') || img.height || 0);
    if ((w && w < 60) || (h && h < 60)) return;

    const url = toAbsoluteUrl(img.currentSrc || img.src || '');
    if (!url || /^data:/i.test(url)) return;
    const safeAlt = alt.replace(/[\r\n]+/g, ' ').trim();
    md.push(`![${safeAlt}](${url})`);
  });
  return md;
}

function collectPostText(root: HTMLElement, authorHint?: string): string {
  // 1) 우선 콘텐츠 섹션(본문 영역) 범위 내에서 텍스트 추출 시도
  const contentArea = root.querySelector('div.x1xdureb.xkbb5z.x13vxnyz') as HTMLElement | null;
  const textCandidates: string[] = [];

  const pushIfValid = (txt: string) => {
    const t = normalizeText(txt);
    if (!t) return;
    // 작성자명만 단독으로 들어가는 라인은 제외
    if (authorHint && t === authorHint) return;
    textCandidates.push(t);
  };

  if (contentArea) {
    // 대표 본문 블록 (샘플 기반)
    const mainText = contentArea.querySelector('div.x1a6qonq') as HTMLElement | null;
    if (mainText && !mainText.closest('.xezivpi, [role="button"], [aria-haspopup="menu"]')) {
      pushIfValid(mainText.innerText || '');
    }
    // 추가 후보: 콘텐츠 섹션 내 dir="auto" 텍스트 노드들
    contentArea.querySelectorAll('div[dir="auto"], span[dir="auto"]').forEach((el) => {
      if ((el as HTMLElement).closest('.xezivpi, [role="button"], [aria-haspopup="menu"]')) return;
      pushIfValid((el as HTMLElement).innerText || '');
    });
  }

  // 2) 콘텐츠 섹션에서 못 찾은 경우: 전체 루트에서 본문 후보를 최대 길이 기준으로 선택
  if (textCandidates.length === 0) {
    const blocks = Array.from(root.querySelectorAll('div.x1a6qonq')) as HTMLElement[];
    const scored = blocks
      .map((el) => normalizeText(el.innerText || ''))
      .filter((t) => t && (!authorHint || t !== authorHint))
      .sort((a, b) => b.length - a.length);
    if (scored[0]) textCandidates.push(scored[0]);
  }

  // 3) 최후 폴백: 헤더/버튼/아이콘/프로필/유저링크 제거 후 텍스트 추출
  if (textCandidates.length === 0) {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll([
      '[data-tyquill]',
      'button',
      '[role="button"]',
      'svg',
      'time',
      'video',
      'audio',
      'img',
      'a[href^="/@"]',
      'a[role="button"]',
      '[aria-haspopup="menu"]',
      // Threads 액션 바 및 소셜 카운트 영역 휴리스틱 제거
      '.x4vbgl9',
      '.x1qfufaz',
      '.x1k70j0n',
      '.xezivpi',
    ].join(',')).forEach((n) => n.remove());
    const txt = normalizeText(clone.innerText || '');
    if (txt && (!authorHint || txt !== authorHint)) textCandidates.push(txt);
  }

  // 가장 유의미한 텍스트 선택: 길이 우선, 줄바꿈 정리, 작성자명 라인 제거
  const joined = normalizeText(textCandidates.join('\n\n'));
  const lines = joined.split('\n').map((s) => s.trim()).filter(Boolean);
  const filtered = lines.filter((l) => !authorHint || l !== authorHint);
  const dedup = Array.from(new Set(filtered));
  return normalizeText(dedup.join('\n'));
}

async function doScrapFromThreadsButton(buttonEl: Element): Promise<void> {
  const root = findAncestorWithContentArea(buttonEl) || getPostRootFromButton(buttonEl);
  const author = extractAuthorName(root) || '';
  let content = collectPostText(root, author);
  const title = author ? `Threads | ${author}` : 'Threads';
  const url = extractPermalink(root);
  const images = extractImageMarkdown(root);
  if (images.length > 0) {
    content = content ? `${content}\n\n${images.join('\n')}` : images.join('\n');
  }

  // Track scraping event
  try {
    await trackPlatformContentScrapedBridge({
      platform: 'threads',
      content_type: 'post',
      has_author: !!author,
      has_images: images.length > 0,
      content_length: content.length,
      image_count: images.length,
      url: url,
      has_content: !!content.trim()
    });
  } catch {}

  if (!content.trim()) {
    // 콘텐츠가 없으면 페이지 스크랩으로 폴백하지 않고 종료
    return;
  }
  try {
    await browser.runtime.sendMessage({
      action: 'scrapExtracted',
      data: { content, title, url }
    });
  } catch {}
}

