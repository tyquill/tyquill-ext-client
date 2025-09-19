import { browser } from 'wxt/browser';
import { WHITE_LOGO_URL } from './constants';
import { trackPlatformContentScrapedBridge } from '../analytics/bridge';

type CleanupFn = () => void;

// Reddit specific selectors based on actual DOM structure
const REDDIT_SELECTORS = {
  postCards: [
    'shreddit-feed > article',
    'article[id*="post-rtjson"]',
    'article[itemtype="http://schema.org/DiscussionForumPosting"]'
  ],
  overflowMenu: 'shreddit-post-overflow-menu',
  overflowButton: 'shreddit-post-overflow-menu button',
  actionContainer: 'shreddit-post-action-row',
  postTitle: 'h1, h2, h3, [slot="title"]',
  postContent: '[slot="text-body"], .md',
  postAuthor: 'a[href^="/user/"], [slot="credit-bar"] a[href*="/user/"]',
  postSubreddit: 'a[href^="/r/"], [slot="credit-bar"] a[href*="/r/"]',
  postTimestamp: 'faceplate-timeago, time',
  postLink: 'a[slot="full-post-link"]',
  commentCount: 'a[aria-label*="comment"] span'
};

const REDDIT_STYLE_TEXT = `
  .tyquill-reddit-action-wrapper {
    display: inline-flex;
    align-items: center;
    margin-right: 8px;
    position: relative;
    height: 32px; /* Match container height */
  }

  .tyquill-reddit-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    position: relative;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
  }

  .tyquill-reddit-action:hover {
    background-color: var(--color-tone-2, #f6f7f8);
  }

  .tyquill-reddit-action:active {
    background-color: var(--color-tone-3, #edeff1);
  }

  .tyquill-reddit-action img {
    width: 20px;
    height: 20px;
    object-fit: contain;
    filter: brightness(0) saturate(100%) invert(44%) sepia(11%) saturate(434%) hue-rotate(180deg) brightness(94%) contrast(86%);
    vertical-align: middle;
    display: block;
    margin: 0 auto;
  }

  .tyquill-reddit-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    padding: 8px 12px;
    background: var(--color-tone-11, rgba(0, 0, 0, 0.9));
    color: var(--color-tone-1, white);
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .tyquill-reddit-action:hover .tyquill-reddit-tooltip {
    opacity: 1;
  }

  .tyquill-reddit-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 4px;
    border-style: solid;
    border-color: var(--color-tone-11, rgba(0, 0, 0, 0.9)) transparent transparent transparent;
  }

  /* Dark mode adjustments */
  [data-theme="dark"] .tyquill-reddit-action:hover,
  html[data-colorscheme="dark"] .tyquill-reddit-action:hover {
    background-color: var(--color-tone-2, #1a1a1b);
  }

  [data-theme="dark"] .tyquill-reddit-action img,
  html[data-colorscheme="dark"] .tyquill-reddit-action img {
    filter: brightness(0) saturate(100%) invert(70%) sepia(9%) saturate(201%) hue-rotate(180deg) brightness(95%) contrast(86%);
  }
`;

function isRedditSite(): boolean {
  const host = location.hostname;
  return host.includes('reddit.com') || host.includes('redd.it');
}

function ensureStylesInjected(): void {
  if (document.getElementById('tyquill-reddit-action-styles')) return;
  const style = document.createElement('style');
  style.id = 'tyquill-reddit-action-styles';
  style.textContent = REDDIT_STYLE_TEXT;
  document.head.appendChild(style);
}

function createTyquillButton(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'tyquill-reddit-action-wrapper';
  wrapper.setAttribute('data-tyquill', 'reddit-action-wrapper');

  const button = document.createElement('div');
  button.className = 'tyquill-reddit-action';
  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');
  button.setAttribute('aria-label', 'Save to Tyquill');
  button.setAttribute('data-tyquill', 'reddit-action');

  // Add icon
  const icon = document.createElement('img');
  icon.src = WHITE_LOGO_URL;
  icon.alt = 'Tyquill';
  button.appendChild(icon);

  // Add tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'tyquill-reddit-tooltip';
  tooltip.textContent = 'Save to Tyquill';
  button.appendChild(tooltip);

  // Event handlers
  const onActivate = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await doScrapFromRedditButton(button);
    } catch (error) {
      console.error('Error scraping Reddit post:', error);
    }
  };

  button.addEventListener('click', onActivate, true);
  button.addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' || ke.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onActivate(e);
    }
  }, true);

  wrapper.appendChild(button);
  return wrapper;
}

function findPostCard(element: HTMLElement): HTMLElement | null {
  // Navigate up to find the post card container
  let current: HTMLElement | null = element;
  for (let i = 0; i < 10 && current; i++) {
    if (current.tagName === 'ARTICLE') {
      return current;
    }
    // Check if it's a shreddit-post component
    if (current.tagName.toLowerCase().includes('shreddit-post')) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function normalizeText(text: string): string {
  return (text || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPostTitle(card: HTMLElement): string {
  const selectors = REDDIT_SELECTORS.postTitle.split(', ');
  for (const selector of selectors) {
    const element = card.querySelector(selector) as HTMLElement;
    if (element?.textContent) {
      return normalizeText(element.textContent);
    }
  }
  return '';
}

function extractPostContent(card: HTMLElement): string {
  const selectors = REDDIT_SELECTORS.postContent.split(', ');
  for (const selector of selectors) {
    const element = card.querySelector(selector) as HTMLElement;
    if (element?.textContent) {
      return normalizeText(element.textContent);
    }
  }
  return '';
}

function extractPostAuthor(card: HTMLElement): string {
  const selectors = REDDIT_SELECTORS.postAuthor.split(', ');
  for (const selector of selectors) {
    const element = card.querySelector(selector) as HTMLElement;
    if (element) {
      const text = element.textContent || '';
      // Remove u/ prefix if present
      return text.replace(/^u\//, '').trim();
    }
  }
  return '';
}

function extractSubreddit(card: HTMLElement): string {
  const selectors = REDDIT_SELECTORS.postSubreddit.split(', ');
  for (const selector of selectors) {
    const element = card.querySelector(selector) as HTMLElement;
    if (element) {
      const text = element.textContent || '';
      // Remove r/ prefix if present
      return text.replace(/^r\//, '').trim();
    }
  }
  return '';
}

function extractPostUrl(card: HTMLElement): string {
  // Try to find permalink
  const linkSelectors = REDDIT_SELECTORS.postLink.split(', ');
  for (const selector of linkSelectors) {
    const element = card.querySelector(selector) as HTMLAnchorElement;
    if (element?.href) {
      const url = element.href;
      if (url.includes('/comments/')) {
        return url;
      }
    }
  }

  // Fallback: try to find any link with /comments/ pattern
  const allLinks = card.querySelectorAll('a[href*="/comments/"]');
  if (allLinks.length > 0) {
    return (allLinks[0] as HTMLAnchorElement).href;
  }

  // Last resort: current page URL if we're on a post page
  if (location.pathname.includes('/comments/')) {
    return location.href;
  }

  return '';
}

function extractCommentCount(card: HTMLElement): number {
  const selectors = REDDIT_SELECTORS.commentCount.split(', ');
  for (const selector of selectors) {
    const element = card.querySelector(selector) as HTMLElement;
    if (element?.textContent) {
      const match = element.textContent.match(/\d+/);
      if (match) {
        return parseInt(match[0], 10);
      }
    }
  }
  return 0;
}

function extractImages(card: HTMLElement): string[] {
  const images: string[] = [];

  // Find img elements
  const imgElements = card.querySelectorAll('img');
  imgElements.forEach(img => {
    // Skip avatars, icons, and small images
    if (img.alt?.toLowerCase().includes('avatar') ||
        img.alt?.toLowerCase().includes('icon') ||
        img.width < 100 || img.height < 100) {
      return;
    }

    const src = img.src || img.currentSrc;
    if (src && !src.includes('styles.redditmedia.com') && !src.includes('avatar')) {
      images.push(src);
    }
  });

  // Find video thumbnails
  const videoElements = card.querySelectorAll('video');
  videoElements.forEach(video => {
    if (video.poster) {
      images.push(video.poster);
    }
  });

  return [...new Set(images)]; // Remove duplicates
}

async function doScrapFromRedditButton(buttonEl: HTMLElement): Promise<void> {
  const card = findPostCard(buttonEl);
  if (!card) {
    console.error('Could not find Reddit post card');
    return;
  }

  const title = extractPostTitle(card);
  const content = extractPostContent(card);
  const author = extractPostAuthor(card);
  const subreddit = extractSubreddit(card);
  const url = extractPostUrl(card);
  const commentCount = extractCommentCount(card);
  const images = extractImages(card);

  // Build the content for Tyquill
  let fullContent = '';
  if (title) {
    fullContent += `# ${title}\n\n`;
  }
  if (subreddit || author) {
    fullContent += `**Posted in r/${subreddit} by u/${author}**\n\n`;
  }
  if (content) {
    fullContent += `${content}\n\n`;
  }
  if (commentCount > 0) {
    fullContent += `💬 ${commentCount} comments\n\n`;
  }
  if (images.length > 0) {
    fullContent += images.map(img => `![Image](${img})`).join('\n');
  }

  const scrapTitle = title || `Reddit Post from r/${subreddit}`;

  // Track the scraping event
  try {
    await trackPlatformContentScrapedBridge({
      platform: 'reddit',
      content_type: 'post',
      has_author: !!author,
      has_images: images.length > 0,
      content_length: fullContent.length,
      image_count: images.length,
      url: url,
      metadata: {
        subreddit: subreddit,
        comment_count: commentCount
      }
    });
  } catch (error) {
    console.error('Error tracking Reddit scraping:', error);
  }

  // Send to extension
  try {
    await browser.runtime.sendMessage({
      action: 'scrapExtracted',
      data: {
        content: fullContent,
        title: scrapTitle,
        url: url
      }
    });
  } catch (error) {
    console.error('Error sending Reddit scraping message:', error);
  }
}

function injectIntoPostCards(): void {
  console.log('[Tyquill Reddit] Starting injection...');

  // Find posts by ID pattern (t3_*) - simpler approach
  const postElements = document.querySelectorAll('[id^="t3_"]');
  console.log(`[Tyquill Reddit] Found ${postElements.length} posts with t3_ IDs`);

  postElements.forEach((postElement, index) => {
    console.log(`[Tyquill Reddit] Processing post ${index + 1} with ID: ${postElement.id}`);

    // Skip if already injected
    if (postElement.querySelector('[data-tyquill="reddit-action-wrapper"]')) {
      console.log(`[Tyquill Reddit] Post ${index + 1} already has Tyquill button`);
      return;
    }

    // Look for the target span with class "flex items-center pl-xs"
    const targetSpan = postElement.querySelector('span.flex.items-center.pl-xs');
    if (targetSpan) {
      console.log(`[Tyquill Reddit] Found target span with pl-xs class in post ${index + 1}`);

      // Find the overflow menu to insert before it
      const overflowMenu = targetSpan.querySelector('shreddit-async-loader, shreddit-post-overflow-menu');
      if (overflowMenu) {
        // Create and insert the Tyquill button
        const tyquillButton = createTyquillButton();
        console.log(`[Tyquill Reddit] Inserting Tyquill button before overflow menu in post ${index + 1}`);

        try {
          // Insert before the overflow menu (to the left of dots)
          targetSpan.insertBefore(tyquillButton, overflowMenu);
          console.log(`[Tyquill Reddit] Successfully inserted button before overflow menu in post ${index + 1}`);
        } catch (error) {
          console.error(`[Tyquill Reddit] Failed to insert button before overflow menu in post ${index + 1}:`, error);
        }
      } else {
        // Fallback: insert at the end if no overflow menu found
        const tyquillButton = createTyquillButton();
        console.log(`[Tyquill Reddit] No overflow menu found, inserting at end of span in post ${index + 1}`);

        try {
          targetSpan.appendChild(tyquillButton);
          console.log(`[Tyquill Reddit] Successfully inserted button at end of span in post ${index + 1}`);
        } catch (error) {
          console.error(`[Tyquill Reddit] Failed to insert button at end of span in post ${index + 1}:`, error);
        }
      }
      return; // Exit early if we found and processed the target span
    }

    // Fallback: Look for any span with "flex items-center" that contains buttons
    const flexSpans = postElement.querySelectorAll('span.flex.items-center');
    console.log(`[Tyquill Reddit] Found ${flexSpans.length} flex spans in post ${index + 1}`);

    flexSpans.forEach((span, spanIndex) => {
      // Check if this span contains buttons or overflow menu
      const hasButtons = span.querySelector('button') ||
                        span.querySelector('shreddit-post-overflow-menu') ||
                        span.querySelector('shreddit-join-button');

      if (hasButtons) {
        console.log(`[Tyquill Reddit] Found action flex span at index ${spanIndex} in post ${index + 1}`);

        // Check if we already injected here
        if (span.querySelector('[data-tyquill="reddit-action-wrapper"]')) {
          return;
        }

        // Find the overflow menu to insert before it, or append at end
        const overflowMenu = span.querySelector('shreddit-async-loader, shreddit-post-overflow-menu');
        const tyquillButton = createTyquillButton();
        console.log(`[Tyquill Reddit] Inserting Tyquill button in post ${index + 1}, flex span ${spanIndex}`);

        try {
          if (overflowMenu) {
            // Insert before the overflow menu (to the left of dots)
            span.insertBefore(tyquillButton, overflowMenu);
            console.log(`[Tyquill Reddit] Successfully inserted button before overflow menu in post ${index + 1}`);
          } else {
            // Insert at the end of the span (after existing buttons)
            span.appendChild(tyquillButton);
            console.log(`[Tyquill Reddit] Successfully inserted button at end of span in post ${index + 1}`);
          }
        } catch (error) {
          console.error(`[Tyquill Reddit] Failed to insert button in post ${index + 1}:`, error);
        }
      }
    });
  });

  // Final fallback: also try the original approach
  const articles = document.querySelectorAll('article');
  console.log(`[Tyquill Reddit] Final fallback: Found ${articles.length} article elements`);

  articles.forEach((article, index) => {
    if (article.querySelector('[data-tyquill="reddit-action-wrapper"]')) {
      return;
    }

    // Look for overflow menu in article
    const overflowMenu = article.querySelector('shreddit-post-overflow-menu');
    if (overflowMenu && overflowMenu.parentElement) {
      const tyquillButton = createTyquillButton();
      try {
        overflowMenu.parentElement.insertBefore(tyquillButton, overflowMenu);
        console.log(`[Tyquill Reddit] Final fallback injection successful for article ${index + 1}`);
      } catch (error) {
        console.error(`[Tyquill Reddit] Final fallback injection failed for article ${index + 1}:`, error);
      }
    }
  });

  console.log('[Tyquill Reddit] Injection complete');
}

function observeRedditChanges(): CleanupFn {
  const observer = new MutationObserver((mutations) => {
    let shouldInject = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const added = Array.from(mutation.addedNodes);
        for (const node of added) {
          if (node instanceof Element) {
            // Check if new post cards or overflow menus were added
            const hasPostCard = node.tagName === 'ARTICLE' ||
                               node.querySelector('article') ||
                               node.querySelector('shreddit-post') ||
                               node.querySelector('shreddit-post-overflow-menu');

            // Also check if shreddit-feed or main content was updated
            const isShredditContent = node.tagName === 'SHREDDIT-FEED' ||
                                     node.querySelector('shreddit-feed') ||
                                     node.id === 'main-content';

            if (hasPostCard || isShredditContent) {
              shouldInject = true;
              break;
            }
          }
        }
      }
    }

    if (shouldInject) {
      // Debounce injection slightly to let DOM settle
      setTimeout(injectIntoPostCards, 200);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return () => observer.disconnect();
}

export function initRedditInjector(): CleanupFn {
  console.log('[Tyquill Reddit] Initializing Reddit injector...');

  if (!isRedditSite()) {
    console.log('[Tyquill Reddit] Not a Reddit site, skipping');
    return () => {};
  }

  console.log('[Tyquill Reddit] Reddit site detected, proceeding with injection');
  ensureStylesInjected();

  // Initial injection with multiple attempts to handle dynamic loading
  const attemptInjection = () => {
    console.log('[Tyquill Reddit] Attempting injection...');
    injectIntoPostCards();
    // Try again after delays for dynamic content
    setTimeout(() => {
      console.log('[Tyquill Reddit] Retry injection after 1s...');
      injectIntoPostCards();
    }, 1000);
    setTimeout(() => {
      console.log('[Tyquill Reddit] Retry injection after 3s...');
      injectIntoPostCards();
    }, 3000);
    setTimeout(() => {
      console.log('[Tyquill Reddit] Final retry injection after 5s...');
      injectIntoPostCards();
    }, 5000);
  };

  // Initial injection
  console.log(`[Tyquill Reddit] Document ready state: ${document.readyState}`);
  if (document.readyState === 'loading') {
    console.log('[Tyquill Reddit] Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', attemptInjection);
  } else {
    console.log('[Tyquill Reddit] Document already loaded, attempting immediate injection');
    attemptInjection();
  }

  // Set up observer for dynamic content
  console.log('[Tyquill Reddit] Setting up mutation observer...');
  const cleanupObserver = observeRedditChanges();

  return () => {
    console.log('[Tyquill Reddit] Cleaning up injector...');
    cleanupObserver();
    document.removeEventListener('DOMContentLoaded', attemptInjection);
    // Remove injected styles
    const style = document.getElementById('tyquill-reddit-action-styles');
    style?.remove();
  };
}