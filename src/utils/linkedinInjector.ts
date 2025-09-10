// LinkedIn feed control menu에 Tyquill 버튼을 주입하는 유틸
import { browser } from 'wxt/browser';

const WHITE_LOGO_URL = 'https://4bvbvpozg7fnspb5.public.blob.vercel-storage.com/white-logo.svg';
// 대상 부모 컨테이너: feed-shared-control-menu display-flex
//   feed-shared-update-v2__control-menu absolute text-align-right
//   feed-shared-update-v2--with-hide-post
// 버튼은 다음 요소(artdeco-dropdown ... ember-view)와 형제이며, 부모의 첫 자식으로 삽입

type CleanupFn = () => void;

function createTyquillButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Save with Tyquill');
  button.setAttribute('data-tyquill', 'li-action');
  button.classList.add('tyquill-li-action-btn');
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.width = '32px';
  button.style.height = '32px';
  button.style.border = 'none';
  button.style.borderRadius = '50%';
  button.style.cursor = 'pointer';
  button.style.padding = '0';
  button.style.marginRight = '4px';

  const img = document.createElement('img');
  // 동일한 흰색 SVG를 사용하고, 라이트 모드에서는 검정으로 보이도록 필터 적용
  img.src = WHITE_LOGO_URL;
  img.alt = 'Tyquill';
  img.style.width = '20px';
  img.style.height = '20px';
  img.style.objectFit = 'contain';
  img.style.display = 'block';
  if (isDarkMode()) {
    img.style.filter = '';
  } else {
    img.style.filter = 'invert(1)';
  }

  button.appendChild(img);

  // 클릭은 전역 위임 핸들러에서 처리

  return button;
}

function queryControlMenus(root: ParentNode = document): Element[] {
  // 각 후보 컨테이너를 따로 찾은 후 합집합
  const nodes = new Set<Element>();
  root.querySelectorAll('.feed-shared-control-menu.display-flex').forEach(n => nodes.add(n));
  root.querySelectorAll('.feed-shared-update-v2__control-menu.absolute.text-align-right').forEach(n => nodes.add(n));
  root.querySelectorAll('.feed-shared-update-v2--with-hide-post').forEach(n => nodes.add(n));
  const all = Array.from(nodes);
  return all.filter(isAllowedContainer);
}

function isAllowedContainer(element: Element): boolean {
  // 집계/디스커버리/리스트 컨테이너 내부는 제외
  if (element.closest('.feed-shared-aggregated-content')) return false;
  if (element.closest('.update-components-feed-discovery-entity')) return false;
  if (element.closest('.update-components-feed-discovery-grid')) return false;
  if (element.closest('.feed-shared-aggregated-content__list-item')) return false;
  // (reverted) inline recommendations special-case exclusions removed

  // 상위 업데이트 카드가 존재해야 함 (집계형 포함 허용)
  const update = element.closest('.feed-shared-update-v2');
  if (!update) return false;

  // 헤더(맞춤 추천 등) 영역 포함 relative 래퍼 내 컨트롤 메뉴는 기본 제외하되,
  // header가 'update-components-header--with-control-menu' 또는
  // 'update-components-header--with-control-menu-and-hide-post'인 경우 허용
  const isControlMenu = element.matches('.feed-shared-control-menu, .feed-shared-update-v2__control-menu');
  if (isControlMenu) {
    const headerEl = element.closest('.update-components-header') as Element | null;
    if (headerEl) {
      const ok = headerEl.classList.contains('update-components-header--with-control-menu') || headerEl.classList.contains('update-components-header--with-control-menu-and-hide-post');
      if (!ok) return false;
    } else {
      const relativeWrapper = element.closest('.relative');
      const headerInRelative = relativeWrapper?.querySelector('.update-components-header') as Element | null;
      if (headerInRelative) {
        const ok2 = headerInRelative.classList.contains('update-components-header--with-control-menu') || headerInRelative.classList.contains('update-components-header--with-control-menu-and-hide-post');
        if (!ok2) return false;
      }
    }
  }

  return true;
}

function getTargetContainer(element: Element): Element | null {
  if (element.tagName === 'BUTTON') {
    return element.parentElement;
  }
  return element;
}

function needsInjection(element: Element): boolean {
  const target = getTargetContainer(element);
  if (!target) return false;
  return !target.querySelector('[data-tyquill="li-action"]');
}

function injectIntoContainer(element: Element): void {
  const target = getTargetContainer(element);
  if (!target) return;
  const button = createTyquillButton();
  // 컨트롤 메뉴 컨테이너의 첫 자식으로 삽입
  if (target.firstElementChild) {
    target.insertBefore(button, target.firstElementChild);
  } else {
    target.appendChild(button);
  }
}

function ensureStylesInjected(): void {
  if (document.getElementById('tyquill-li-action-styles')) return;
  const style = document.createElement('style');
  style.id = 'tyquill-li-action-styles';
  style.textContent = `
    /* LinkedIn tertiary-muted 버튼 토큰을 활용한 상태 스타일 */
    [data-tyquill="li-action"] {
      color: var(--artdeco-button-tertiary-muted-static-color, var(--color-label));
      background-color: var(--color-background-transparent);
      border: none;
      border-radius: var(--corner-radius-full, 999px);
      transition: background-color var(--duration-xfast, 84ms) var(--ease-standard, cubic-bezier(.34,0,.21,1));
    }
    [data-tyquill="li-action"]:hover {
      background-color: var(--artdeco-button-tertiary-muted-hover-background-color, var(--color-background-action-transparent-hover, rgba(0,0,0,0.08)));
      color: var(--color-label-hover, inherit);
    }
    [data-tyquill="li-action"]:active {
      background-color: var(--color-background-action-transparent-active, rgba(0,0,0,0.12));
      color: var(--color-label-active, inherit);
    }
    [data-tyquill="li-action"]:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-border-focus, var(--teal-70));
      background-color: var(--color-background-focus, var(--teal-50-a30));
    }

    /* Tyquill 버튼이 있는 카드에서는 팔로우 버튼을 좌측으로 여백 이동 */
    .feed-shared-update-v2:has([data-tyquill="li-action"]) .update-components-actor__follow-button,
    .feed-shared-update-v2:has([data-tyquill="li-action"]) .update-components-update-v2__follow-button {
      margin-right: 40px !important;
    }
  `;
  document.head.appendChild(style);
}

async function doScrapFromButton(button: HTMLButtonElement): Promise<void> {
  const container = button.closest('.fie-impression-container') as HTMLElement | null;
  const content = collectContainerMarkdown(container);
  const author = extractSenderName(container);
  const title = author ? `Linkedin 피드 | ${author}` : 'Linkedin 피드';
  const permalink = extractPermalink(container) || window.location.href;
  if (!content.trim()) {
    window.dispatchEvent(new CustomEvent('tyquill:li-button-click'));
    return;
  }
  try {
    await browser.runtime.sendMessage({
      action: 'scrapExtracted',
      data: { content, title, url: permalink }
    });
  } catch (err) {}
}

function normalizeText(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isDarkMode(): boolean {
  // 1) prefers-color-scheme
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
  } catch {}
  // 2) LinkedIn 테마 힌트 (다크에서 reactions 아이콘 theme="dark" 등이 존재)
  try {
    if (document.querySelector('[data-test-reactions-icon-theme="dark"]')) return true;
  } catch {}
  // 3) body나 루트 컨테이너에 다크 테마 클래스 힌트 (샘플 HTML 참고)
  const feedContainer = document.getElementById('voyager-feed');
  if (feedContainer && getComputedStyle(feedContainer).color) {
    // 간단 휴리스틱: 전경색이 매우 밝으면 다크 테마로 간주
    const color = getComputedStyle(feedContainer).color; // rgb(r,g,b)
    const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (m) {
      const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luminance > 180) return true;
    }
  }
  return false;
}

function toAbsoluteUrl(href: string): string {
  if (!href) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${window.location.origin}${href}`;
  try {
    return new URL(href, window.location.origin).toString();
  } catch {
    return href;
  }
}

function extractPermalink(container: HTMLElement | null): string | null {
  const root = (container?.closest('.feed-shared-update-v2') as HTMLElement | null) ?? container ?? document.body;
  if (!root) return null;

  // 1) 코멘터리 링크(가장 신뢰도 높음)
  const commentaryLink = root.querySelector('a.carousel-update-commentary__link-to-details-page[href*="/feed/update/urn:li:"]') as HTMLAnchorElement | null;
  if (commentaryLink?.href || commentaryLink?.getAttribute('href')) {
    const href = commentaryLink.href || commentaryLink.getAttribute('href') || '';
    return toAbsoluteUrl(href);
  }

  // 2) 다른 퍼머링크 앵커
  const anyPermalink = root.querySelector('a[href*="/feed/update/urn:li:"]') as HTMLAnchorElement | null;
  if (anyPermalink?.href || anyPermalink?.getAttribute('href')) {
    const href = anyPermalink.href || anyPermalink.getAttribute('href') || '';
    return toAbsoluteUrl(href);
  }

  // 2-b) 가끔 상대경로만 있는 케이스
  const anyPermalink2 = root.querySelector('a[href^="/feed/update/urn:li:"]') as HTMLAnchorElement | null;
  if (anyPermalink2?.getAttribute('href')) {
    return toAbsoluteUrl(anyPermalink2.getAttribute('href') || '');
  }

  // 3) 카드/상위의 data-urn으로 구성 (여러 타입 허용)
  const urnHost = (root.closest('.feed-shared-update-v2') as HTMLElement | null) ?? root;
  const urn = urnHost?.getAttribute('data-urn') || '';
  if (/^urn:li:(activity|ugcPost|share|aggregate|fs_update):/i.test(urn)) {
    return `${window.location.origin}/feed/update/${urn}/`;
  }

  // 3-a) role="article" 노드에서 data-urn을 직접 획득
  const articleEl = (root.closest('[role="article"][data-urn]') as HTMLElement | null) || (root.querySelector('[role="article"][data-urn]') as HTMLElement | null);
  const urnArticle = articleEl?.getAttribute('data-urn') || '';
  if (/^urn:li:(activity|ugcPost|share|aggregate|fs_update):/i.test(urnArticle)) {
    return `${window.location.origin}/feed/update/${urnArticle}/`;
  }

  // 3-b) 가까운 상위/하위에서 data-urn 탐색
  const urnNode = root.closest('[data-urn^="urn:li:activity:"] , [data-urn^="urn:li:ugcPost:"]') as HTMLElement | null
    || (root.querySelector('[data-urn^="urn:li:activity:"] , [data-urn^="urn:li:ugcPost:"]') as HTMLElement | null);
  const urn2 = urnNode?.getAttribute('data-urn') || '';
  if (/^urn:li:(activity|ugcPost|share|aggregate|fs_update):/i.test(urn2)) {
    return `${window.location.origin}/feed/update/${urn2}/`;
  }

  // 4) 타임스탬프/소셜 카운트 영역에 숨은 링크가 있을 수 있음
  const timestampLink = root.querySelector('.update-components-actor__sub-description a[href*="/feed/update/"]') as HTMLAnchorElement | null;
  if (timestampLink?.href || timestampLink?.getAttribute('href')) {
    const href = timestampLink.href || timestampLink.getAttribute('href') || '';
    return toAbsoluteUrl(href);
  }

  // 5) data-id / data-entity-urn 속성에서도 URN을 제공하는 경우가 있음
  const urnFromDataIdNode = root.closest('[data-id^="urn:li:activity:"] , [data-id^="urn:li:ugcPost:"]') as HTMLElement | null
    || (root.querySelector('[data-id^="urn:li:activity:"] , [data-id^="urn:li:ugcPost:"]') as HTMLElement | null);
  const urnFromDataId = urnFromDataIdNode?.getAttribute('data-id') || '';
  if (/^urn:li:(activity|ugcPost|share|aggregate|fs_update):/i.test(urnFromDataId)) {
    return `${window.location.origin}/feed/update/${urnFromDataId}/`;
  }

  const urnFromEntityNode = root.closest('[data-entity-urn^="urn:li:activity:"] , [data-entity-urn^="urn:li:ugcPost:"]') as HTMLElement | null
    || (root.querySelector('[data-entity-urn^="urn:li:activity:"] , [data-entity-urn^="urn:li:ugcPost:"]') as HTMLElement | null);
  const urnFromEntity = urnFromEntityNode?.getAttribute('data-entity-urn') || '';
  if (/^urn:li:(activity|ugcPost|share|aggregate|fs_update):/i.test(urnFromEntity)) {
    return `${window.location.origin}/feed/update/${urnFromEntity}/`;
  }

  // 6) posts 경로로 노출되는 경우 (일부 케이스)
  const postsLink = root.querySelector('a[href*="/posts/"]') as HTMLAnchorElement | null;
  if (postsLink?.href || postsLink?.getAttribute('href')) {
    const href = postsLink.href || postsLink.getAttribute('href') || '';
    return toAbsoluteUrl(href);
  }

  return null;
}

function collectContainerMarkdown(container: HTMLElement | null): string {
  const parts: string[] = [];
  const root = container ?? document.body;

  // 본문 코멘터리
  const commentary = root.querySelector('.update-components-text .break-words');
  if (commentary) {
    const txt = normalizeText((commentary as HTMLElement).innerText || '');
    if (txt) parts.push(txt);
  }

  // 스폰서 비디오 설명 헤드라인
  const sponsorHeadline = root.querySelector('.update-components-linkedin-video__sponsored-description .t-14');
  if (sponsorHeadline) {
    const txt = normalizeText((sponsorHeadline as HTMLElement).innerText || '');
    if (txt) parts.push(txt);
  }

  // 비디오 설명 헤드라인 대체
  const videoHeadline = root.querySelector('.update-components-linkedin-video__description-headline');
  if (videoHeadline) {
    const txt = normalizeText((videoHeadline as HTMLElement).innerText || '');
    if (txt) parts.push(txt);
  }

  // Fallback: 컨테이너 텍스트에서 불필요 요소 제거 후 추출
  if (parts.length === 0 && container) {
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll([
      '.feed-shared-control-menu',
      '.update-components-actor__follow-button',
      '.update-components-actor__sub-description',
      '.update-components-linkedin-video__container',
      '.update-v2-social-activity',
      '.feed-shared-social-action-bar',
      '.artdeco-dropdown',
      'button',
      'svg',
    ].join(',')).forEach((el) => el.remove());

    const txt = normalizeText(clone.innerText || '');
    if (txt) parts.push(txt);
  }

  return parts.join('\n\n');
}

function extractSenderName(container: HTMLElement | null): string | null {
  if (!container) return null;
  const logPick = (_label: string, _node: Element | null, _value: string) => {};
  const sanitizeName = (raw: string) => {
    let t = normalizeText(raw);
    t = t.replace(/님\s*$/, '');
    t = t.replace(/^보기:\s*/, '');
    return t.trim();
  };

  // 우선순위 0-a: 정확 경로 - actor title > span > span 내부 (숨김 텍스트 우선)
  const actorTitleRoot = container.querySelector('.update-components-actor__title > span > span') as HTMLElement | null;
  if (actorTitleRoot) {
    const hidden0 = actorTitleRoot.querySelector('span[aria-hidden="true"]') as HTMLElement | null;
    const txt0 = sanitizeName(hidden0?.innerText || actorTitleRoot.innerText || '');
    logPick('actorTitleRoot', actorTitleRoot, txt0);
    if (txt0) return txt0;
  }

  // 우선순위 0-b: 제시된 대체 경로(span:nth-child(1) > span)
  const altNode = container.querySelector('.update-components-actor__title > span > span > span:nth-child(1) > span') as HTMLElement | null;
  if (altNode) {
    const nameAlt = sanitizeName(altNode.innerText || '');
    logPick('altNode', altNode, nameAlt);
    if (nameAlt) return nameAlt;
  }

  // 우선순위 1: update-components-actor__single-line-truncat* 클래스 내부 텍스트
  const truncEl = container.querySelector('[class*="update-components-actor__single-line-truncat"]') as HTMLElement | null;
  if (truncEl) {
    const hidden = truncEl.querySelector('[aria-hidden="true"]') as HTMLElement | null;
    const txt = sanitizeName(hidden?.innerText || truncEl.innerText || '');
    logPick('truncEl', truncEl, txt);
    if (txt) return txt;
  }

  // 우선순위 2: actor title 전체의 표시 텍스트
  const actorTitle = container.querySelector('.update-components-actor__title');
  if (actorTitle) {
    const visible = (actorTitle as HTMLElement).querySelector('[aria-hidden="true"]');
    const txt = sanitizeName(visible ? (visible as HTMLElement).innerText : (actorTitle as HTMLElement).innerText);
    logPick('actorTitle', actorTitle, txt);
    if (txt) return txt;
  }

  // 우선순위 3: header 텍스트 뷰 내부 이름
  const headerName = container.querySelector('.update-components-header__text-view [aria-hidden="true"]') as HTMLElement | null;
  if (headerName) {
    const txt = sanitizeName(headerName.innerText || '');
    logPick('headerName', headerName, txt);
    if (txt) return txt;
  }

  // 우선순위 4: 일반 a[aria-label]에서 이름만 추출
  const metaLink = container.querySelector('.update-components-actor__meta-link[aria-label]') as HTMLElement | null;
  if (metaLink) {
    const label = (metaLink.getAttribute('aria-label') || '').trim();
    if (label) {
      const m = label.match(/보기:\s*([^|]+)/) || label.match(/^([^|]+)/);
      const name = sanitizeName(m ? m[1].trim() : label);
      logPick('metaLink', metaLink, name);
      if (name) return name;
    }
  }

  // 우선순위 5: Visible Text 라인에서 추정 (동일 라인 연속 반복 또는 이름 형태)
  const visibleText = normalizeText(container.innerText || '');
  const lines = visibleText.split('\n').map(s => s.trim()).filter(Boolean);
  const isLikelyName = (s: string) => /^(?=.{2,50}$)[\p{L} .'-]+$/u.test(s) && !/님이 추천함|팔로우|댓글|퍼가기|보내기|웹상에서|수정됨|시간|분|전/.test(s);
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1] || '';
    if (a && a === b && isLikelyName(a)) {
      logPick('visibleText-duplicated', null, a);
      return a;
    }
  }
  const firstNameLike = lines.find(isLikelyName);
  if (firstNameLike) {
    logPick('visibleText-firstNameLike', null, firstNameLike);
    return firstNameLike;
  }

  return null;
}

// (reverted) hard cleanup removed

export function initLinkedInInjector(): CleanupFn {
  if (!window.location.hostname.includes('linkedin.com')) {
    return () => {};
  }

  ensureStylesInjected();

  // 전역 위임 클릭 핸들러 (한 번만 등록)
  const handler = (e: Event) => {
    const target = e.target as Element | null;
    if (!target) return;
    const btn = target.closest('button[data-tyquill="li-action"]') as HTMLButtonElement | null;
    if (!btn) return;
    e.stopPropagation();
    doScrapFromButton(btn);
  };
  document.addEventListener('click', handler, true);

  // 초기 주입
  const containers = queryControlMenus();
  containers.forEach(container => {
    if (needsInjection(container)) {
      injectIntoContainer(container);
    }
  });

  // 동적 로딩 대응
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          const candidates: Element[] = [];
          if (node.matches && (
            node.matches('.feed-shared-control-menu.display-flex') ||
            node.matches('.feed-shared-update-v2__control-menu.absolute.text-align-right') ||
            node.matches('.feed-shared-update-v2--with-hide-post')
          )) {
            if (isAllowedContainer(node)) candidates.push(node);
          }
          node.querySelectorAll?.(
            '.feed-shared-control-menu.display-flex, .feed-shared-update-v2__control-menu.absolute.text-align-right, .feed-shared-update-v2--with-hide-post'
          ).forEach(el => { if (isAllowedContainer(el)) candidates.push(el); });

          candidates.forEach(candidate => {
            if (needsInjection(candidate)) {
              injectIntoContainer(candidate);
            }
          });

          // (reverted) no hard cleanup on mutation
        });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    document.removeEventListener('click', handler, true);
  };
}


