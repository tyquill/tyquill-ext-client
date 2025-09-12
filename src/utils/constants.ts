export const WHITE_LOGO_URL = 'https://4bvbvpozg7fnspb5.public.blob.vercel-storage.com/white-logo.svg';

// X (Twitter) selectors
export const X_SELECTORS = {
  actionBarContainers: [
    '#react-root div.css-175oi2r.r-1kkk96v > div',
    'article[data-testid="tweet"] div.css-175oi2r.r-1kkk96v > div',
  ],
  grokButton: 'button[aria-label="Grok actions"]',
};

export const X_STYLE_TEXT = `
/* X custom button and tooltip styles */
[data-tyquill="x-action-wrapper"]{display:inline-flex;align-items:center}
[data-tyquill="x-action"]{
  position:relative;display:inline-flex;align-items:center;justify-content:center;
  /* No fixed size: width/height follow img size */
  border:none;border-radius:9999px;padding:0;margin:0 2px 0 10px; /* left/right spacing */
  background:transparent;cursor:pointer;line-height:0;vertical-align:middle;
  color: rgb(83, 100, 113);
}
[data-tyquill="x-action"] img,[data-tyquill="x-action"] svg{display:block;object-fit:contain;width:18px;height:18px}
/* Make white-logo.svg appear as gray */
[data-tyquill="x-action"] img{ filter: invert(0.5); opacity: 1; }
[data-tyquill="x-action"]:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(0,150,136,.35)}

/* Hover background via pseudo-element, does not affect layout width */
[data-tyquill="x-action"]::before{
  content:""; position:absolute; left:50%; top:50%; width:32px; height:32px; border-radius:9999px;
  transform:translate(-50%, -50%); background: transparent; transition: background-color 150ms ease;
  pointer-events:none;
}

@media (prefers-color-scheme: dark) {
  [data-tyquill="x-action"]:hover::before{background: rgba(255,255,255,0.08)}
}
@media (prefers-color-scheme: light) {
  [data-tyquill="x-action"]:hover::before{background: rgba(15,20,25,0.1)}
}

/* Global tooltip element */
#tyquill-x-tooltip{position:fixed;left:0;top:0;transform:translate(-9999px,-9999px);opacity:0;pointer-events:none;
  background: rgba(0,0,0,0.8);color:#fff;font-size:12px;line-height:1;padding:4px 8px;border-radius:4px;white-space:nowrap;
  transition: opacity 120ms ease, transform 120ms ease; z-index: 9999;}`;

// LinkedIn selectors
export const LINKEDIN_SELECTORS = {
  controlMenus: [
    '.feed-shared-control-menu.display-flex',
    '.feed-shared-update-v2__control-menu.absolute.text-align-right',
    '.feed-shared-update-v2--with-hide-post',
  ],
};

export const LINKEDIN_STYLE_TEXT = `
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
}`;

// YouTube selectors
export const YT_SELECTORS = {
  ownerPrimary: '#owner',
  subscribeButton: '#subscribe-button',
  ownerAlt: 'ytd-watch-metadata #owner',
  subscribeAlt: '#subscribe-button',
  ownerAny: 'ytd-watch-metadata, ytd-reel-player-header-renderer',
};

export const YT_STYLE_TEXT = `
/* YouTube action button styles */
button.tyquill-yt-action-btn[data-tyquill="yt-action"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  background-color: var(--yt-spec-additive-background, rgba(0,0,0,0.05));
  color: var(--yt-spec-text-primary, currentColor);
  transition: background-color 150ms ease;
  /* prevent width change and text wrapping */
  white-space: nowrap;
  flex: 0 0 auto;
  min-width: max-content;
  box-sizing: border-box;
}
button.tyquill-yt-action-btn[data-tyquill="yt-action"]:hover {
  background-color: var(--yt-spec-button-chip-background-hover, rgba(0,0,0,0.1));
}
button.tyquill-yt-action-btn[data-tyquill="yt-action"]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0,150,136,.35);
}
button.tyquill-yt-action-btn[data-tyquill="yt-action"] img {
  width: 16px;
  height: 16px;
  display: block;
  object-fit: contain;
  flex: 0 0 auto;
}
button.tyquill-yt-action-btn[data-tyquill="yt-action"] span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Media queries retained for OS-level themes; inline style will override if site theme differs */
@media (prefers-color-scheme: light) {
  button.tyquill-yt-action-btn[data-tyquill="yt-action"] img { filter: invert(1) !important; }
}
@media (prefers-color-scheme: dark) {
  button.tyquill-yt-action-btn[data-tyquill="yt-action"] img { filter: none !important; }
  button.tyquill-yt-action-btn[data-tyquill="yt-action"] {
    background-color: var(--yt-spec-static-overlay-button-secondary, rgba(255,255,255,0.1));
    color: var(--yt-spec-static-overlay-text-primary, #fff);
  }
  button.tyquill-yt-action-btn[data-tyquill="yt-action"]:hover {
    background-color: var(--yt-spec-static-overlay-button-primary, rgba(255,255,255,0.3));
  }
}

/* Try to keep spacing consistent when near subscribe button */
#owner #subscribe-button:has(+ [data-tyquill="yt-action"]) {
  margin-right: 8px;
}`;

// Threads selectors
export const THREADS_SELECTORS = {
  explicitButtonList: 'div.x6s0dn4.xamitd3.x40hh3e.x78zum5.x1q0g3np.x1xdureb.x1fc57z9.x1hm9lzh.xvijh9v',
  contentArea: 'div.x1xdureb.xkbb5z.x13vxnyz',
};

export const THREADS_STYLE_TEXT = `
[data-tyquill="threads-action"]{
  display:inline-flex;align-items:center;justify-content:center;
  width:var(--x1kdnp2l,36px);height:var(--x1kdnp2l,36px);
  border:none;border-radius:50%;padding:0;margin-right:var(--x1m69m10,8px);
  background:transparent;
  cursor:pointer;
  transform:translate(var(--tyquill-button-translate-x,-8px), var(--tyquill-button-translate-y,-8px));
  transition:background-color 150ms ease
}
[data-tyquill="threads-action"] img, [data-tyquill="threads-action"] svg{width:16px;height:16px;display:block;object-fit:contain;transform:translate(var(--tyquill-icon-translate-x,0px), var(--tyquill-icon-translate-y,0px))}
[data-tyquill="threads-action"]:hover{background:var(--hover-overlay, rgba(0,0,0,.06))}
[data-tyquill="threads-action"]:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(0,150,136,.35)}

/* Color scheme adjustments: dark → white, light → gray */
@media (prefers-color-scheme: dark) {
  [data-tyquill="threads-action"] img, [data-tyquill="threads-action"] svg { filter: none; opacity: 1; }
}
@media (prefers-color-scheme: light) {
  /* Convert white source to mid-gray ~ #808080 */
  [data-tyquill="threads-action"] img, [data-tyquill="threads-action"] svg { filter: invert(0.5); opacity: 1; }
}`;
