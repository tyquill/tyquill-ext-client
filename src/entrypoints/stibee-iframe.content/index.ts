import { browser } from 'wxt/browser';
import DOMPurify from 'dompurify';
import { logger } from '../../utils/logger';

/**
 * Content script for Stibee iframe editor
 * This runs inside the Stibee editor iframe (editor.stibee.com)
 */

// UI Text constants (centralized for easy i18n later)
const UI_TEXT = {
  EXPORT_TITLE: 'Tyquill → Stibee 내보내기',
  PREPARING: '준비 중...',
  TIMEOUT: '시간이 지나 내보내기가 종료되었습니다',
  ALL_SKIPPED: '모든 문단이 건너뛰어졌습니다',
  MOVED_TO_NEXT_BLOCK: '다음 블록으로 이동했습니다',
  NO_MORE_BLOCKS: '더 이상 사용할 블록이 없습니다',
  ALL_PROCESSED: '모든 문단이 처리되었습니다',
  INSERTING_APPEND: '이어붙이는',
  INSERTING_REPLACE: '삽입',
  BTN_APPEND: '이어붙이기',
  BTN_REPLACE: '대치하기',
  BTN_SKIP_BLOCK: '블록 건너뛰기',
  BTN_START: '시작하기',
  BTN_STOP: '중지',
  SKIPPED_HR_EMPTY: '(건너뜀: 구분선/빈 문단)',
  EMPTY_PREVIEW: '(비어 있음)',
  ERROR_NO_TEXT_BLOCKS: '편집 가능한 텍스트 블록을 찾을 수 없습니다',
  ERROR_EDITOR_ACCESS: '에디터에 접근할 수 없습니다',
  ERROR_CONTENT_INSERT: '콘텐츠 삽입에 실패했습니다',
  ERROR_UNKNOWN: '알 수 없는 오류가 발생했습니다',
} as const;

// Type definitions for message passing
interface StibeeExportMessage {
  type: 'STIBEE_IFRAME_EXPORT';
  content: string;
}

interface ExportResponse {
  success: boolean;
  blocksProcessed?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

interface TyquillNode {
  type: string;
  content?: TyquillNode[];
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
}

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

// Extend Window interface for lock mechanism
declare global {
  interface Window {
    __tyquillStibeeLock?: boolean;
    tinymce?: {
      activeEditor?: {
        setContent: (content: string) => void;
      };
    };
  }
}

// Performance optimization: Memoization cache
interface MemoCache {
  skippableParagraphs: Map<string, boolean>;
  computedStyles: WeakMap<Element, CSSStyleDeclaration>;
  domElements: Map<string, Element | null>;
}

// Initialize memoization cache
const memoCache: MemoCache = {
  skippableParagraphs: new Map(),
  computedStyles: new WeakMap(),
  domElements: new Map()
};

/**
 * Clear memoization cache to free memory
 * Call this when export operation completes or fails
 */
function clearMemoCache(): void {
  memoCache.skippableParagraphs.clear();
  // WeakMap clears automatically when references are lost
  memoCache.domElements.clear();
  logger.debug('🧹 Memoization cache cleared');
}

// DOMPurify configuration for HTML sanitization
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'strong', 'em', 'u', 's', 'code',
    'a', 'br', 'hr',
    'blockquote', 'pre',
    'span', 'div'
  ],
  ALLOWED_ATTR: ['href', 'style', 'class']
};

// Timing constants for UI interactions and animations
const TIMING = {
  // DOM 조작 후 렌더링 완료 대기 시간
  SCROLL_SETTLE_MS: 150,
  // 에디터 iframe 로딩 대기 시간
  EDITOR_LOAD_MS: 200,
  // 블록 활성화 후 안정화 대기 시간
  BLOCK_ACTIVATION_MS: 200,
  // 콘텐츠 저장 트리거 대기 시간
  SAVE_TRIGGER_MS: 150,
  // 사용자 액션 타임아웃 (2분)
  USER_ACTION_TIMEOUT_MS: 120000,
  // Lock 만료 시간 (1분)
  LOCK_EXPIRY_MS: 60000
} as const;

export default defineContentScript({
  // Limit to editor frames only to avoid main frame UI
  matches: ['*://editor.stibee.com/*'],
  allFrames: true,

  main() {
    logger.debug('🎨 Stibee iframe content script loaded');
    logger.debug('📍 Current URL:', window.location.href);
    logger.debug('📍 Is top frame?', window === window.top);
    logger.debug('📍 Frame ID:', window.name);

    // Cleanup function to remove event listeners and UI elements
    const cleanup = () => {
      logger.debug('🧹 Cleaning up Stibee export listeners and UI');
      const prompt = document.getElementById('tyquill-stibee-prompt');
      if (prompt) {
        removeInteractivePrompt(prompt);
      }
      releaseExportLock();
      clearMemoCache();
    };

    // Register cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);

    // Listen for export requests from parent window
    browser.runtime.onMessage.addListener((
      request: StibeeExportMessage,
      sender,
      sendResponse: (response: ExportResponse) => void
    ) => {
      // Validate sender - must be from our own extension
      if (!sender.id || sender.id !== browser.runtime.id) {
        console.warn('⚠️ Rejected message from unauthorized sender');
        sendResponse({ success: false, error: 'Unauthorized sender' });
        return false;
      }

      // Log message type only (not sensitive content)
      logger.debug('📨 Message received in Stibee iframe:', request.type);

      if (request.type === 'STIBEE_IFRAME_EXPORT') {
        logger.debug('📥 Processing STIBEE_IFRAME_EXPORT');

        (async () => {
          try {
            // Only run inside the editor iframe (avoid main stibee.com page)
            // Use exact match to prevent malicious domain spoofing
            const isEditorFrame = location.hostname === 'editor.stibee.com';
            if (!isEditorFrame) {
              logger.debug('⏭️ Skipping export in non-editor frame:', location.hostname);
              sendResponse({ success: false, skipped: true, reason: 'non-editor-frame' });
              return;
            }
            // Cross-frame mutex: ensure only one iframe handles the flow
            if (!tryAcquireExportLock()) {
              logger.debug('🔒 Another frame is already handling Stibee export. Skipping in this frame.');
              sendResponse({ success: false, skipped: true, reason: 'locked' });
              return;
            }
            logger.debug('📥 Processing export request in Stibee iframe');
            const { content } = request;

            // Parse content into paragraphs
            const paragraphs = parseContentToParagraphs(content);

            // Count non-skippable paragraphs for display
            const nonSkippableParagraphs = paragraphs.filter(p => !isSkippableParagraph(p));
            const totalNonSkippableCount = nonSkippableParagraphs.length;

            // Find all text-editable blocks
            const allTextBlocks = findAllTextBlocks();

            if (allTextBlocks.length === 0) {
              console.error('❌ No text blocks found');
              alert(`❌ ${UI_TEXT.ERROR_NO_TEXT_BLOCKS}\n\nStibee 에디터에 텍스트 블록을 먼저 추가해주세요.`);
              releaseExportLock();
              sendResponse({ success: false, error: UI_TEXT.ERROR_NO_TEXT_BLOCKS });
              return;
            }

            // Check if we have enough blocks (based on non-skippable paragraphs)
            if (totalNonSkippableCount > allTextBlocks.length) {
              console.warn(`⚠️ Not enough text blocks! Need ${totalNonSkippableCount} (non-skippable), have ${allTextBlocks.length}`);
              console.warn(`⚠️ Please add ${totalNonSkippableCount - allTextBlocks.length} more text block(s) manually`);
              console.warn(`⚠️ Will insert content into available ${allTextBlocks.length} blocks only`);
            }

            // Interactive insertion flow with manual control
            let successCount = 0;
            let paragraphIndex = 0;
            let blockIndex = 0;

            // Skip skippable paragraphs upfront
            while (paragraphIndex < paragraphs.length && isSkippableParagraph(paragraphs[paragraphIndex])) {
              logger.debug(`⏭️ Skipping paragraph ${paragraphIndex + 1} (no visible text/hr only):`, paragraphs[paragraphIndex]);
              paragraphIndex++;
            }

            if (paragraphIndex >= paragraphs.length) {
              logger.debug('✅ No paragraphs to insert after skipping skippable ones.');
              sendResponse({ success: true, blocksProcessed: successCount });
              return;
            }

            // Create interactive prompt UI (singleton per document)
            const prompt = createInteractivePrompt();
            updateInteractivePrompt(prompt, getPreviewHtml(paragraphs[paragraphIndex]));

            // Global cleanup function to ensure proper state reset
            let cleanupCalled = false;
            const performCleanup = () => {
              if (cleanupCalled) return;
              cleanupCalled = true;
              logger.debug('🧹 Performing export cleanup');
              removeInteractivePrompt(prompt);
              releaseExportLock();
              clearMemoCache();
            };

            // Setup close button handler EARLY (before any user interaction)
            const closeBtn = prompt.querySelector('#tyquill-stibee-close') as HTMLElement;
            if (closeBtn) {
              (closeBtn as HTMLButtonElement).onclick = (e) => {
                try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); } catch {}
                logger.debug('❌ User closed export overlay');
                performCleanup();
              };
            }

            // Setup start button handler
            const startBtn = prompt.querySelector('#tyquill-stibee-start') as HTMLElement;
            const startPromise = new Promise<void>((resolve, _reject) => {
              if (startBtn) {
                (startBtn as HTMLButtonElement).onclick = (e) => {
                  try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); } catch {}
                  // Clean up onclick handler after use
                  (startBtn as HTMLButtonElement).onclick = null;
                  resolve();
                };
              } else {
                resolve(); // Fallback if button not found
              }
            });

            // Wait for user to click start (or close)
            try {
              await startPromise;
            } catch {
              // If promise rejected or interrupted, cleanup and exit
              performCleanup();
              sendResponse({ success: false, skipped: true, reason: 'user-cancelled' });
              return;
            }

            // Check if cleanup was already called (user clicked close)
            if (cleanupCalled) {
              sendResponse({ success: false, skipped: true, reason: 'user-cancelled' });
              return;
            }

            // Cache DOM queries for performance (avoid repeated querySelector calls)
            const startControls = prompt.querySelector('#tyquill-stibee-start-controls') as HTMLElement;
            let controls = prompt.querySelector('#tyquill-stibee-controls') as HTMLElement;
            let finalControls = prompt.querySelector('#tyquill-stibee-final-controls') as HTMLElement;
            const appendBtn = prompt.querySelector('#tyquill-stibee-append') as HTMLButtonElement;
            const replaceBtn = prompt.querySelector('#tyquill-stibee-replace') as HTMLButtonElement;
            const nextBlockBtn = prompt.querySelector('#tyquill-stibee-next-block') as HTMLButtonElement;
            // closeBtn already declared above at line 249

            // Batch DOM updates to avoid layout thrashing
            if (startControls) startControls.style.display = 'none';
            if (controls) controls.style.display = 'block';
            if (finalControls) finalControls.style.display = 'none';
            updatePosition(prompt, blockIndex + 1, allTextBlocks.length, getDisplayParagraphNumber(paragraphs, paragraphIndex), totalNonSkippableCount);
            updateStatus(prompt, '버튼을 클릭하여 작업을 선택하세요');

            // Ensure initial preview points to a non-skippable paragraph
            // Batch button state changes to minimize reflows
            const setButtonsDisabled = (disabled: boolean) => {
              if (appendBtn) appendBtn.disabled = disabled;
              if (replaceBtn) replaceBtn.disabled = disabled;
              if (nextBlockBtn) nextBlockBtn.disabled = disabled;
            };

            setButtonsDisabled(true);
            let initiallySkipped = 0;
            while (paragraphIndex < paragraphs.length && isSkippableParagraph(paragraphs[paragraphIndex])) {
              initiallySkipped++;
              paragraphIndex++;
            }
            setButtonsDisabled(false);
            if (initiallySkipped > 0 && paragraphIndex < paragraphs.length) {
              updateInteractivePrompt(prompt, getPreviewHtml(paragraphs[paragraphIndex]));
              updatePosition(prompt, blockIndex + 1, allTextBlocks.length, getDisplayParagraphNumber(paragraphs, paragraphIndex), totalNonSkippableCount);
              updateStatus(prompt, `(${initiallySkipped}개 건너뜀) 버튼을 클릭하여 작업을 선택하세요`);
            } else if (paragraphIndex >= paragraphs.length) {
              updateStatus(prompt, UI_TEXT.ALL_SKIPPED);
            }

            // Interactive insertion with manual control
            let stopped = false;
            let endedByTimeout = false;

            while (!stopped && !cleanupCalled && paragraphIndex < paragraphs.length && blockIndex < allTextBlocks.length) {
              const html = paragraphs[paragraphIndex];
              
              if (isSkippableParagraph(html)) {
                logger.debug(`⏭️ Skipping paragraph ${paragraphIndex + 1} (no visible text/hr only):`, html);
                // Batch button state updates for better performance
                setButtonsDisabled(true);
                let skipped = 0;
                while (paragraphIndex < paragraphs.length && isSkippableParagraph(paragraphs[paragraphIndex])) {
                  skipped++;
                  paragraphIndex++;
                }
                setButtonsDisabled(false);
                if (paragraphIndex < paragraphs.length) {
                  updateInteractivePrompt(prompt, getPreviewHtml(paragraphs[paragraphIndex]));
                  updateStatus(prompt, `(${skipped}개 건너뜀) 다음 문단으로 이동했습니다. 넣기 버튼을 클릭하세요`);
                  continue;
                } else {
                  updateStatus(prompt, `(${skipped}개 건너뜀) 더 이상 삽입할 문단이 없습니다`);
                  break;
                }
              }

              // Select and activate current block
              blockIndex = Math.max(0, Math.min(blockIndex, allTextBlocks.length - 1));
              const block = allTextBlocks[blockIndex];

              logger.debug(`🎯 Selecting block ${blockIndex + 1}/${allTextBlocks.length} for paragraph ${paragraphIndex + 1}`);
              updatePosition(prompt, blockIndex + 1, allTextBlocks.length, getDisplayParagraphNumber(paragraphs, paragraphIndex), totalNonSkippableCount);
              updateStatus(prompt, `블록 ${blockIndex + 1}/${allTextBlocks.length} 선택됨 - 작업을 선택하세요`);

              // Performance: Use requestAnimationFrame to batch DOM reads and writes
              // This prevents layout thrashing by separating read (getBoundingClientRect)
              // from write (classList modifications) operations
              await new Promise<void>(resolve => {
                requestAnimationFrame(() => {
                  // Batch DOM writes: Remove all highlights and add to current block
                  allTextBlocks.forEach((el) => el.classList.remove('tyquill-stibee-highlight'));
                  block.classList.add('tyquill-stibee-highlight');

                  // Scroll into view after highlight is applied
                  requestAnimationFrame(() => {
                    try {
                      block.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } catch {}

                    // Wait for scroll animation to settle
                    setTimeout(resolve, TIMING.SCROLL_SETTLE_MS);
                  });
                });
              });

              // Activate block
              await activateBlock(block);

              // Wait for editor iframe to fully load
              await new Promise(resolve => setTimeout(resolve, TIMING.EDITOR_LOAD_MS));

              // Wait for user action (append, replace, or next-block)
              const actionPromise = new Promise<'append' | 'replace' | 'next-block' | 'none'>((resolve) => {
                let resolved = false;
                
                const cleanup = () => {
                  if (appendBtn) appendBtn.onclick = null;
                  if (replaceBtn) replaceBtn.onclick = null;
                  if (nextBlockBtn) nextBlockBtn.onclick = null;
                };
                
                if (appendBtn) {
                  appendBtn.onclick = (e) => {
                    try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); } catch {}
                    if (!resolved) {
                      resolved = true;
                      cleanup();
                      resolve('append');
                    }
                  };
                }
                
                if (replaceBtn) {
                  replaceBtn.onclick = (e) => {
                    try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); } catch {}
                    if (!resolved) {
                      resolved = true;
                      cleanup();
                      resolve('replace');
                    }
                  };
                }
                
                if (nextBlockBtn) {
                  nextBlockBtn.onclick = (e) => {
                    try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); } catch {}
                    if (!resolved) {
                      resolved = true;
                      cleanup();
                      resolve('next-block');
                    }
                  };
                }
                
                // User action timeout (2 minutes)
                setTimeout(() => {
                  if (!resolved) {
                    resolved = true;
                    endedByTimeout = true;
                    updateStatus(prompt, UI_TEXT.TIMEOUT);
                    cleanup();
                    resolve('none');
                  }
                }, TIMING.USER_ACTION_TIMEOUT_MS);
              });

              const action = await actionPromise;
              
              if (action === 'next-block') {
                logger.debug(`⏭️ User moved to next block from ${blockIndex + 1}`);
                blockIndex++;

                // Update preview for current paragraph in next block
                if (paragraphIndex < paragraphs.length && blockIndex < allTextBlocks.length) {
                  updateInteractivePrompt(prompt, getPreviewHtml(paragraphs[paragraphIndex]));
                  updatePosition(prompt, blockIndex + 1, allTextBlocks.length, getDisplayParagraphNumber(paragraphs, paragraphIndex), totalNonSkippableCount);
                  updateStatus(prompt, `${UI_TEXT.MOVED_TO_NEXT_BLOCK}<br>다음: 블록 ${blockIndex + 1}에 문단 ${paragraphIndex + 1}`);
                } else if (paragraphIndex < paragraphs.length) {
                  updateStatus(prompt, `${UI_TEXT.MOVED_TO_NEXT_BLOCK}<br>${UI_TEXT.NO_MORE_BLOCKS}`);
                } else {
                  updateStatus(prompt, `${UI_TEXT.MOVED_TO_NEXT_BLOCK}<br>${UI_TEXT.ALL_PROCESSED}`);
                }
                continue;
              }

              if (action === 'none') {
                logger.debug('No action taken, breaking');
                break;
              }
              
              // action === 'append' or 'replace' - proceed with insertion

              // Find active editor
              const { body: iframeBody } = findActiveEditor(block);

              if (!iframeBody) {
                console.error(`❌ Cannot access editor body`);
                updateStatus(prompt, `❌ ${UI_TEXT.ERROR_EDITOR_ACCESS}`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Show error for 2 seconds
                blockIndex++;
                continue;
              }

              // Insert content
              const isAppend = action === 'append';
              logger.debug(`📝 ${isAppend ? 'Appending' : 'Inserting'} content into block ${blockIndex + 1}`);
              updateStatus(prompt, `블록 ${blockIndex + 1}에 콘텐츠 ${isAppend ? UI_TEXT.INSERTING_APPEND : UI_TEXT.INSERTING_REPLACE} 중...`);
              try {
                iframeBody.focus();
              } catch {}

              // Try to insert content
              const insertionSuccess = insertContentIntoEditor(iframeBody, html, isAppend);

              if (!insertionSuccess) {
                console.error(`❌ All insertion strategies failed`);
                updateStatus(prompt, `❌ ${UI_TEXT.ERROR_CONTENT_INSERT}`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Show error for 2 seconds
                blockIndex++;
                continue;
              }

              // Trigger save events
              const activeTextBlock = document.querySelector('.text-edit:not(.notshow)');
              triggerSaveEvents(iframeBody, activeTextBlock);

              // Wait for save trigger and blur
              await new Promise(resolve => setTimeout(resolve, TIMING.SAVE_TRIGGER_MS));
              try {
                iframeBody.blur();
                if (activeTextBlock instanceof HTMLElement) {
                  activeTextBlock.blur();
                }
              } catch (error) {
                console.warn(`⚠️ Blur failed:`, error);
              }

              successCount++;
              paragraphIndex++;

              // Update prompt for next paragraph or finish if last block used
              if (paragraphIndex < paragraphs.length && blockIndex < allTextBlocks.length) {
                updateInteractivePrompt(prompt, getPreviewHtml(paragraphs[paragraphIndex]));
                updatePosition(prompt, blockIndex + 1, allTextBlocks.length, getDisplayParagraphNumber(paragraphs, paragraphIndex), totalNonSkippableCount);
                updateStatus(prompt, `완료: ${successCount}개 삽입됨<br>다음: 문단 ${paragraphIndex + 1}`);
              } else {
                // Reached last available block or all paragraphs processed
                const remainingParagraphs = totalNonSkippableCount - successCount;
                if (remainingParagraphs > 0) {
                  updateStatus(prompt, `삽입 완료: ${successCount}개<br>${remainingParagraphs}개 문단은 삽입되지 않았습니다.`);
                } else {
                  updateStatus(prompt, `삽입 완료: ${successCount}개 문단 모두 삽입됨`);
                }
                if (controls) controls.style.display = 'none';
                if (finalControls) finalControls.style.display = 'block';
                break; // Exit the while loop
              }
            }

            // Finalize UI: wait for user to click '완료'
            const remainingParagraphs = totalNonSkippableCount - successCount;
            if (remainingParagraphs > 0 || endedByTimeout) {
              const summary = remainingParagraphs > 0
                ? `삽입 완료: ${successCount}개<br>${remainingParagraphs}개 문단은 삽입되지 않았습니다.`
                : `삽입 완료: ${successCount}개`;
              const prefix = endedByTimeout ? '시간이 지나 내보내기가 종료되었습니다.<br>' : '';
              updateStatus(prompt, `${prefix}${summary}`);
            }
            const doneBtn2 = prompt.querySelector('#tyquill-stibee-done') as HTMLButtonElement | null;
            const finalControls2 = prompt.querySelector('#tyquill-stibee-final-controls') as HTMLElement | null;
            const controls2 = prompt.querySelector('#tyquill-stibee-controls') as HTMLElement | null;
            if (controls2) controls2.style.display = 'none';
            if (finalControls2) finalControls2.style.display = 'block';
            await new Promise<void>((resolve) => {
              if (doneBtn2) {
                doneBtn2.onclick = () => {
                  // Clean up onclick handler
                  doneBtn2.onclick = null;
                  resolve();
                };
              } else {
                resolve();
              }
            });

            performCleanup();

            logger.debug(`\n✅ Completed sequential insertion. Inserted ${successCount} paragraph(s).`);
            sendResponse({ success: true, blocksProcessed: successCount });
          } catch (error) {
            console.error('❌ Stibee iframe export error:', error);
            const errorMessage = error instanceof Error ? error.message : UI_TEXT.ERROR_UNKNOWN;
            console.error('Error details:', errorMessage);

            // Show user-visible error message
            alert(`❌ ${UI_TEXT.ERROR_UNKNOWN}\n\n${errorMessage}\n\n페이지를 새로고침 후 다시 시도해주세요.`);

            try {
              releaseExportLock();
              clearMemoCache();
            } catch {}
            sendResponse({
              success: false,
              error: errorMessage
            });
          }
        })();
        return true; // Keep channel open for async response
      }

      // For debugging - respond to other message types too
      logger.debug('⚠️ Unhandled message type in Stibee iframe:', request.type);
      return false;
    });
  }
});

/**
 * Determine if a rendered HTML paragraph is skippable (hr-only or no visible text)
 * Performance: Memoized to avoid recalculating for same HTML
 */
function isSkippableParagraph(html: string): boolean {
  if (!html) return true;

  // Check memoization cache first
  if (memoCache.skippableParagraphs.has(html)) {
    return memoCache.skippableParagraphs.get(html)!;
  }

  // Normalize whitespace
  let s = String(html).replace(/\s+/g, ' ').trim();
  if (!s) {
    memoCache.skippableParagraphs.set(html, true);
    return true;
  }

  // Debug: log what we're checking
  logger.debug('🔍 isSkippableParagraph checking:', s);

  // Unwrap common wrappers around hr (p/div/span) and remove surrounding <br>
  s = s.replace(/<(p|div|span)[^>]*>\s*<hr\s*\/?>(\s*<br\s*\/?\s*>)?\s*<\/(p|div|span)>/gi, '<hr/>');
  s = s.replace(/^(<br\s*\/?\s*>\s*)+/gi, '').replace(/(\s*<br\s*\/?\s*>)+$/gi, '');

  // If consists only of hr(s)
  const withoutHr = s.replace(/<hr\s*\/?>(\s*<hr\s*\/?\s*>)*?/gi, '').trim();
  if (!withoutHr) {
    logger.debug('⏭️ isSkippableParagraph: only hr found, skipping');
    memoCache.skippableParagraphs.set(html, true);
    return true;
  }

  // Remove non-textual media placeholders from visibility check
  let visible = s
    .replace(/<img[^>]*>/gi, '')
    .replace(/<video[\s\S]*?<\/video>/gi, '')
    .replace(/<audio[\s\S]*?<\/audio>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/&nbsp;/g, ' ');

  // Strip tags and check remaining text
  visible = visible.replace(/<[^>]+>/g, '').trim();

  const result = visible.length === 0;
  logger.debug('🔍 isSkippableParagraph result:', result, 'visible text:', visible);

  // Cache the result
  memoCache.skippableParagraphs.set(html, result);
  return result;
}

/**
 * Parse Tyquill JSON content and convert to HTML paragraphs
 */
function parseContentToParagraphs(content: string): string[] {
  let paragraphs: string[] = [];
  try {
    const jsonData: TyquillNode = JSON.parse(content);
    // Split content into paragraphs (top-level nodes in doc.content)
    if (jsonData.type === 'doc' && jsonData.content) {
      paragraphs = jsonData.content.map((node: TyquillNode) => convertNodeToHtml(node));
      logger.debug(`✅ Parsed ${paragraphs.length} paragraphs from Tyquill JSON`);
    } else {
      // Single node
      paragraphs = [convertNodeToHtml(jsonData)];
    }
  } catch (error) {
    console.error('❌ Failed to parse JSON, treating as plain text:', error);
    paragraphs = [content];
  }
  return paragraphs;
}

/**
 * Find all text-editable blocks in the Stibee editor using multiple strategies
 * Performance: Batch DOM queries to minimize reflows
 */
function findAllTextBlocks(): HTMLElement[] {
  logger.debug('🔍 Searching for text-editable blocks...');

  // Performance: Batch all DOM queries together to minimize reflows
  const textEditBlocks = document.querySelectorAll('.text-edit');
  const iframeBlocks = document.querySelectorAll('iframe[src*="tinymce"], iframe[src*="editor"]');

  logger.debug(`📝 Found ${textEditBlocks.length} .text-edit elements`);
  logger.debug(`📝 Found ${iframeBlocks.length} TinyMCE iframe elements`);

  let allTextBlocks: HTMLElement[] = [];
  const processedElements = new Set<Element>();

  // Process .text-edit elements
  textEditBlocks.forEach((textEdit, index) => {
    logger.debug(`🔍 Processing .text-edit element ${index + 1}:`, textEdit);

    // Try multiple approaches to find the clickable element
    let clickableElement: HTMLElement | null = null;

    // Approach 1: Look for .content-outer and navigate down
    const contentOuter = textEdit.querySelector('.content-outer') || textEdit.closest('.content-outer');
    if (contentOuter) {
      let current: Element | null = contentOuter;
      for (let i = 0; i < 5 && current; i++) {
        const child: Element | null = current.querySelector(':scope > div');
        if (child) {
          current = child;
        } else {
          current = null;
          break;
        }
      }
      if (current && !processedElements.has(current)) {
        clickableElement = current as HTMLElement;
      }
    }

    // Approach 2: Look for parent clickable elements
    if (!clickableElement) {
      const parentClickable = textEdit.closest('[onclick], [role="button"], .clickable, [class*="click"]');
      if (parentClickable && !processedElements.has(parentClickable)) {
        clickableElement = parentClickable as HTMLElement;
      }
    }

    // Approach 3: Use the text-edit element itself if it's clickable
    // Performance: Cache getComputedStyle result to avoid redundant calculations
    if (!clickableElement && textEdit instanceof HTMLElement) {
      let computedStyle = memoCache.computedStyles.get(textEdit);
      if (!computedStyle) {
        computedStyle = window.getComputedStyle(textEdit);
        memoCache.computedStyles.set(textEdit, computedStyle);
      }
      if (computedStyle.cursor === 'pointer' || textEdit.onclick || textEdit.getAttribute('role') === 'button') {
        clickableElement = textEdit;
      }
    }

    if (clickableElement) {
      allTextBlocks.push(clickableElement);
      processedElements.add(clickableElement);
      logger.debug(`✅ Added clickable element for .text-edit ${index + 1}:`, clickableElement);
    } else {
      console.warn(`⚠️ Could not find clickable element for .text-edit ${index + 1}`);
    }
  });

  // Process iframe elements that weren't already processed
  iframeBlocks.forEach((iframe, index) => {
    const parentElement = iframe.closest('div, section, article');
    if (parentElement && !processedElements.has(parentElement)) {
      allTextBlocks.push(parentElement as HTMLElement);
      processedElements.add(parentElement);
      logger.debug(`✅ Added iframe parent element ${index + 1}:`, parentElement);
    }
  });

  // Filter out two-column text layouts for now (skip col2 blocks)
  const beforeFilterCount = allTextBlocks.length;
  allTextBlocks = allTextBlocks.filter((el) => !el.closest('.content-outer.col2'));
  const filteredCount = beforeFilterCount - allTextBlocks.length;
  if (filteredCount > 0) {
    logger.debug(`⏭️ Skipped ${filteredCount} two-column (col2) text block(s)`);
  }

  logger.debug(`📝 Final result: Found ${allTextBlocks.length} text-editable blocks`);
  return allTextBlocks;
}

/**
 * Activate a block using multiple strategies (click, mouse events, keyboard)
 * Performance: Use requestAnimationFrame for smooth UI interactions
 */
async function activateBlock(block: HTMLElement): Promise<boolean> {
  let activated = false;

  // Strategy 1: Direct click
  // Performance: Wrap in requestAnimationFrame to ensure browser is ready
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      try {
        block.click();
        setTimeout(resolve, TIMING.BLOCK_ACTIVATION_MS);
      } catch (error) {
        console.warn(`⚠️ Direct click failed:`, error);
        resolve();
      }
    });
  });

  // Check if activation succeeded
  if (document.querySelector('.text-edit:not(.notshow)')) {
    activated = true;
    logger.debug(`✅ Block activated via direct click`);
    return activated;
  }

  // Strategy 2: Mouse events if not activated
  if (!activated) {
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        try {
          // Pre-create events to avoid multiple object creations
          const mouseEvents = [
            new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
            new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
            new MouseEvent('click', { bubbles: true, cancelable: true })
          ];

          for (const event of mouseEvents) {
            block.dispatchEvent(event);
          }

          setTimeout(resolve, TIMING.BLOCK_ACTIVATION_MS);
        } catch (error) {
          console.warn(`⚠️ Mouse events failed:`, error);
          resolve();
        }
      });
    });

    if (document.querySelector('.text-edit:not(.notshow)')) {
      activated = true;
      logger.debug(`✅ Block activated via mouse events`);
      return activated;
    }
  }

  // Strategy 3: Focus and keyboard if still not activated
  if (!activated) {
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        try {
          (block as HTMLElement).focus();
          block.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          block.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

          setTimeout(resolve, TIMING.BLOCK_ACTIVATION_MS);
        } catch (error) {
          console.warn(`⚠️ Keyboard events failed:`, error);
          resolve();
        }
      });
    });

    if (document.querySelector('.text-edit:not(.notshow)')) {
      activated = true;
      logger.debug(`✅ Block activated via keyboard events`);
    }
  }

  return activated;
}

/**
 * Find the active text editor and its iframe body
 * Performance: Optimized to minimize repeated DOM queries
 */
function findActiveEditor(block: HTMLElement): { iframe: HTMLIFrameElement | null, body: HTMLElement | null } {
  // Performance: Cache frequently used selectors and use single query when possible
  // Combine multiple queries into one with comma-separated selectors
  let activeTextBlock = document.querySelector('.text-edit:not(.notshow)');

  // Only perform fallback queries if primary query fails
  if (!activeTextBlock) {
    // Use comma-separated selector for efficiency
    activeTextBlock = document.querySelector(
      '.text-edit.active, .text-edit.selected, .text-edit:focus, .text-edit[style*="display: block"]'
    );
  }

  if (!activeTextBlock) {
    console.warn(`⚠️ Could not find active text block, trying to use original block`);
    activeTextBlock = block.querySelector('.text-edit') || block;
  }

  // Find TinyMCE iframe
  let tinyIframe = activeTextBlock.querySelector('iframe') as HTMLIFrameElement;
  if (!tinyIframe) {
    const parentElement = activeTextBlock.closest('div, section, article');
    if (parentElement) {
      tinyIframe = parentElement.querySelector('iframe') as HTMLIFrameElement;
    }
  }

  if (!tinyIframe) {
    console.warn(`⚠️ TinyMCE iframe not found, trying to make element editable`);
    if (activeTextBlock instanceof HTMLElement) {
      activeTextBlock.contentEditable = 'true';
      activeTextBlock.focus();
    }
  }

  let iframeBody: HTMLElement | null = null;

  if (tinyIframe) {
    const iframeDoc = tinyIframe.contentDocument || tinyIframe.contentWindow?.document || null;
    if (iframeDoc) {
      iframeBody = iframeDoc.body;
    }
  } else if (activeTextBlock instanceof HTMLElement) {
    iframeBody = activeTextBlock;
  }

  return { iframe: tinyIframe, body: iframeBody };
}

/**
 * Insert HTML content into editor body using multiple strategies
 * Performance: Use DocumentFragment for efficient DOM insertions
 */
function insertContentIntoEditor(body: HTMLElement, html: string, isAppend: boolean): boolean {
  let insertionSuccess = false;

  // Strategy 1: Append or replace innerHTML (with sanitization)
  try {
    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);

    if (isAppend) {
      // Append content to existing content
      const existingContent = body.innerHTML;
      body.innerHTML = existingContent + sanitizedHtml;
    } else {
      // Replace content
      body.innerHTML = sanitizedHtml;
    }
    insertionSuccess = true;
    logger.debug(`✅ Content ${isAppend ? 'appended' : 'inserted'} via innerHTML (sanitized)`);
  } catch (error) {
    console.warn(`⚠️ innerHTML ${isAppend ? 'append' : 'insertion'} failed:`, error);
  }

  // Strategy 2: Text content insertion
  if (!insertionSuccess) {
    try {
      body.textContent = html.replace(/<[^>]*>/g, '');
      insertionSuccess = true;
      logger.debug(`✅ Content inserted as text`);
    } catch (error) {
      console.warn(`⚠️ Text insertion failed:`, error);
    }
  }

  // Strategy 3: Create and append elements using DocumentFragment
  // Performance: DocumentFragment minimizes reflows by batching DOM operations
  if (!insertionSuccess) {
    try {
      const tempDiv = document.createElement('div');
      // Sanitize HTML before setting innerHTML
      const sanitizedHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
      tempDiv.innerHTML = sanitizedHtml;

      // Use DocumentFragment for efficient batch insertion
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }

      // Single DOM operation to append all elements at once
      body.appendChild(fragment);
      insertionSuccess = true;
      logger.debug(`✅ Content inserted via DocumentFragment (sanitized)`);
    } catch (error) {
      console.warn(`⚠️ DocumentFragment insertion failed:`, error);
    }
  }

  return insertionSuccess;
}

/**
 * Trigger save events on editor body and TinyMCE
 * Performance: Batch event creation and use requestAnimationFrame for dispatch
 */
function triggerSaveEvents(body: HTMLElement, activeTextBlock: Element | null): void {
  // Performance: Pre-create all events before dispatching to minimize object creation overhead
  const bodyEvents = [
    new Event('input', { bubbles: true }),
    new Event('change', { bubbles: true }),
    new KeyboardEvent('keyup', { bubbles: true }),
  ];

  const blockEvents = activeTextBlock instanceof HTMLElement ? [
    new Event('change', { bubbles: true }),
    new Event('input', { bubbles: true }),
    new Event('blur', { bubbles: true })
  ] : [];

  // Use requestAnimationFrame to batch DOM updates
  requestAnimationFrame(() => {
    // Dispatch events on body
    for (const event of bodyEvents) {
      try {
        body.dispatchEvent(event);
      } catch (error) {
        console.warn(`⚠️ Event dispatch failed for ${event.type}:`, error);
      }
    }

    // Try TinyMCE API events
    if (window.tinymce?.activeEditor) {
      try {
        const editor = window.tinymce.activeEditor;
        if ('fire' in editor && typeof (editor as any).fire === 'function') {
          (editor as any).fire('change');
          (editor as any).fire('input');
          (editor as any).fire('blur');
          logger.debug(`✅ TinyMCE events triggered`);
        }
      } catch (error) {
        logger.debug(`⚠️ TinyMCE API trigger failed, but content was inserted`);
      }
    }

    // Trigger events on parent text block
    if (activeTextBlock instanceof HTMLElement) {
      for (const event of blockEvents) {
        try {
          activeTextBlock.dispatchEvent(event);
        } catch (error) {
          console.warn(`⚠️ Parent block event dispatch failed:`, error);
        }
      }
    }
  });
}

/**
 * Create interactive prompt UI element (fixed top-right)
 */
function createInteractivePrompt(): HTMLElement {
  let el = document.getElementById('tyquill-stibee-prompt');
  if (el) {
    // Reset to initial state (avoid duplicate stacked prompts)
    const preview = el.querySelector('#tyquill-stibee-preview') as HTMLElement | null;
    const status = el.querySelector('#tyquill-stibee-status') as HTMLElement | null;
    const startControls = el.querySelector('#tyquill-stibee-start-controls') as HTMLElement | null;
    const controls = el.querySelector('#tyquill-stibee-controls') as HTMLElement | null;
    if (preview) preview.innerHTML = '';
    if (status) status.textContent = UI_TEXT.PREPARING;
    if (startControls) startControls.style.display = '';
    if (controls) controls.style.display = 'none';
    return el;
  }

  el = document.createElement('div');
  el.id = 'tyquill-stibee-prompt';
  el.style.position = 'fixed';
  el.style.zIndex = '2147483647';
  el.style.top = '12px';
  el.style.right = '12px';
  el.style.width = '480px';
  el.style.background = '#ffffff';
  el.style.color = '#111827';
  el.style.padding = '16px 18px';
  el.style.borderRadius = '12px';
  el.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)';
  el.style.border = '1px solid rgba(0, 0, 0, 0.08)';
  el.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  el.style.fontSize = '12px';
  el.style.lineHeight = '1.45';
  el.style.pointerEvents = 'auto';
  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div style="font-weight:700; font-size:13px;">${UI_TEXT.EXPORT_TITLE}</div>
      <button id="tyquill-stibee-close" style="background:none; border:none; color:#6b7280; cursor:pointer; font-size:18px; padding:0; width:24px; height:24px; display:flex; align-items:center; justify-content:center; transition:all 0.15s ease;">×</button>
    </div>
    <div id="tyquill-stibee-preview" style="white-space:pre-wrap; word-break:break-word; min-height:120px; max-height:120px; overflow-y:auto; overflow-x:hidden; border:1px solid #e5e7eb; border-radius:8px; padding:12px; background:#fafbfc;"></div>
    <div id="tyquill-stibee-position" style="color:#6b7280; margin-top:8px; font-size:11px; line-height:1.5;">현재 선택된 블록: -번째 (총 -개)<br>현재 선택된 문단: -번째 (총 -개)</div>
    <div id="tyquill-stibee-status" style="color:#374151; margin-top:6px; font-weight:500;">${UI_TEXT.PREPARING}</div>
    <div id="tyquill-stibee-start-controls" style="margin-top:12px;">
      <button id="tyquill-stibee-start" style="background:#000000; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600; transition:all 0.15s ease;">${UI_TEXT.BTN_START}</button>
    </div>
    <div id="tyquill-stibee-controls" style="margin-top:12px; display:none;">
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button id="tyquill-stibee-append" style="background:#000000; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; transition:all 0.15s ease;" title="현재 문단을 현재 블록에 이어붙입니다">${UI_TEXT.BTN_APPEND}</button>
        <button id="tyquill-stibee-replace" style="background:#333333; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; transition:all 0.15s ease;" title="현재 블록의 내용을 현재 문단으로 대치합니다">${UI_TEXT.BTN_REPLACE}</button>
        <button id="tyquill-stibee-next-block" style="background:transparent; color:#6b7280; border:1px solid #e5e7eb; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; transition:all 0.15s ease;" title="현재 문단은 유지하고 다음 블록으로 넘어갑니다">${UI_TEXT.BTN_SKIP_BLOCK}</button>
      </div>
    </div>
    <div id="tyquill-stibee-final-controls" style="margin-top:12px; display:none;">
      <button id="tyquill-stibee-done" style="background:#000000; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; transition:all 0.15s ease;">${UI_TEXT.BTN_STOP}</button>
    </div>
  `;

  // Add hover effects for buttons
  const addHoverEffect = (btn: HTMLElement, hoverBg: string, normalBg: string) => {
    btn.addEventListener('mouseenter', () => { btn.style.background = hoverBg; });
    btn.addEventListener('mouseleave', () => { btn.style.background = normalBg; });
  };

  document.documentElement.appendChild(el);

  // Apply hover effects after DOM insertion
  const startBtn = el.querySelector('#tyquill-stibee-start') as HTMLElement;
  const appendBtn = el.querySelector('#tyquill-stibee-append') as HTMLElement;
  const replaceBtn = el.querySelector('#tyquill-stibee-replace') as HTMLElement;
  const skipBtn = el.querySelector('#tyquill-stibee-next-block') as HTMLElement;
  const doneBtn = el.querySelector('#tyquill-stibee-done') as HTMLElement;
  const closeBtn = el.querySelector('#tyquill-stibee-close') as HTMLElement;

  if (startBtn) addHoverEffect(startBtn, '#1f2937', '#000000');
  if (appendBtn) addHoverEffect(appendBtn, '#1f2937', '#000000');
  if (replaceBtn) addHoverEffect(replaceBtn, '#000000', '#333333');
  if (doneBtn) addHoverEffect(doneBtn, '#1f2937', '#000000');

  if (skipBtn) {
    skipBtn.addEventListener('mouseenter', () => {
      skipBtn.style.background = '#f9fafb';
      skipBtn.style.color = '#111827';
    });
    skipBtn.addEventListener('mouseleave', () => {
      skipBtn.style.background = 'transparent';
      skipBtn.style.color = '#6b7280';
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(239, 68, 68, 0.08)';
      closeBtn.style.color = '#dc2626';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'none';
      closeBtn.style.color = '#6b7280';
    });
  }

  return el;
}

// Simple cross-frame lock using localStorage
function tryAcquireExportLock(): boolean {
  try {
    const key = 'tyquill-stibee-export-lock';
    const now = Date.now();
    const existing = localStorage.getItem(key);
    if (existing) {
      const { ts } = JSON.parse(existing);
      // Check if lock has expired
      if (typeof ts === 'number' && now - ts < TIMING.LOCK_EXPIRY_MS) {
        return false;
      }
    }
    localStorage.setItem(key, JSON.stringify({ ts: now }));
    return true;
  } catch {
    // Fallback to in-memory flag per frame
    window.__tyquillStibeeLock = window.__tyquillStibeeLock || false;
    if (window.__tyquillStibeeLock) return false;
    window.__tyquillStibeeLock = true;
    return true;
  }
}

function releaseExportLock() {
  try {
    localStorage.removeItem('tyquill-stibee-export-lock');
  } catch {
    window.__tyquillStibeeLock = false;
  }
}


function updateInteractivePrompt(promptEl: HTMLElement, previewHtml: string) {
  const preview = promptEl.querySelector('#tyquill-stibee-preview') as HTMLElement | null;
  if (preview) {
    // Sanitize HTML before setting innerHTML
    const safeHtml = previewHtml
      ? DOMPurify.sanitize(previewHtml, DOMPURIFY_CONFIG)
      : `<span style="opacity:.7">${UI_TEXT.EMPTY_PREVIEW}</span>`;
    preview.innerHTML = safeHtml;
  }
}

function updatePosition(promptEl: HTMLElement, currentBlock: number, totalBlocks: number, currentParagraph: number, totalParagraphs: number) {
  const positionEl = promptEl.querySelector('#tyquill-stibee-position') as HTMLElement | null;
  if (positionEl) {
    positionEl.innerHTML = `현재 선택된 블록: ${currentBlock}번째 (총 ${totalBlocks}개)<br>현재 선택된 문단: ${currentParagraph}번째 (총 ${totalParagraphs}개)`;
  }
}

function updateStatus(promptEl: HTMLElement, status: string) {
  const statusEl = promptEl.querySelector('#tyquill-stibee-status') as HTMLElement | null;
  if (statusEl) {
    // Sanitize status HTML (allow only <br> tags for line breaks)
    const safeStatus = DOMPurify.sanitize(status, {
      ALLOWED_TAGS: ['br'],
      ALLOWED_ATTR: []
    });
    statusEl.innerHTML = safeStatus;
  }
}

// Compute 1-based display index for the current paragraph, excluding skippable ones (hr/empty)
function getDisplayParagraphNumber(paragraphs: string[], currentParagraphIndex: number): number {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return 0;
  let count = 0;
  for (let i = 0; i <= currentParagraphIndex && i < paragraphs.length; i++) {
    if (!isSkippableParagraph(paragraphs[i])) count++;
  }
  return count;
}

function removeInteractivePrompt(promptEl: HTMLElement) {
  if (promptEl && promptEl.parentElement) promptEl.parentElement.removeChild(promptEl);
}

function getPreviewHtml(html: string): string {
  if (!html) return `<span style="opacity:.7">${UI_TEXT.EMPTY_PREVIEW}</span>`;

  // Debug: log what we're processing
  logger.debug('🔍 getPreviewHtml processing:', html);

  if (isSkippableParagraph(html)) {
    logger.debug('⏭️ getPreviewHtml: marking as skippable');
    return `<span style="opacity:.7">${UI_TEXT.SKIPPED_HR_EMPTY}</span>`;
  }
  
  let safe = String(html);
  // Normalize HR: show as dashed divider text instead of actual <hr>
  safe = safe.replace(/<hr\s*\/?>(\s*<br\s*\/?\s*>)?/gi, '<div style="border-top:1px dashed rgba(255,255,255,0.3); margin:6px 0;"></div>');
  // Headings: replace <h1>-<h6> with [Hn] prefix and strong text
  safe = safe.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const level = parseInt(lvl, 10);
    return `<div><span style="opacity:.8; margin-right:6px;">[H${level}]</span><strong>${escapeHtml(text)}</strong></div>`;
  });
  // Paragraphs: keep content but strip complex tags
  safe = safe.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, inner) => {
    return `<div>${inner}</div>`;
  });
  // Trim and clamp length
  const max = 500;
  if (safe.length > max) safe = safe.slice(0, max) + '…';
  return safe;
}


/**
 * Convert a single Tyquill JSON node to HTML
 */
function convertNodeToHtml(node: TyquillNode): string {
  if (!node || !node.type) {
    return '';
  }

  switch (node.type) {
    case 'paragraph':
      return `<p>${convertContentArray(node.content)}</p>`;

    case 'heading':
      const level = node.attrs?.level || 1;
      return `<h${level}>${convertContentArray(node.content)}</h${level}>`;

    case 'text':
      return applyMarks(node.text || '', node.marks);

    case 'horizontalRule':
      return '<hr>';

    case 'bulletList':
      return `<ul>${convertContentArray(node.content)}</ul>`;

    case 'orderedList':
      return `<ol>${convertContentArray(node.content)}</ol>`;

    case 'listItem':
      return `<li>${convertContentArray(node.content)}</li>`;

    case 'blockquote':
      return `<blockquote>${convertContentArray(node.content)}</blockquote>`;

    case 'codeBlock':
      return `<pre><code>${convertContentArray(node.content)}</code></pre>`;

    case 'hardBreak':
      return '<br>';

    default:
      console.warn('Unknown node type:', node.type);
      return convertContentArray(node.content);
  }
}

/**
 * Convert content array to HTML
 */
function convertContentArray(content: TyquillNode[] | undefined): string {
  if (!content || !Array.isArray(content)) {
    return '';
  }
  return content.map((node: TyquillNode) => convertNodeToHtml(node)).join('');
}

/**
 * Apply text marks (bold, italic, etc.)
 */
function applyMarks(text: string, marks: Mark[] | undefined): string {
  if (!marks || marks.length === 0) {
    return escapeHtml(text);
  }

  let result = escapeHtml(text);

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `<strong>${result}</strong>`;
        break;
      case 'italic':
        result = `<em>${result}</em>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link':
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
        result = `<a href="${escapeHtml(href)}">${result}</a>`;
        break;
    }
  }

  return result;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
