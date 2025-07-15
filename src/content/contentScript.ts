/**
 * Content Script for Tyquill Extension
 * 
 * @description 웹 페이지에서 스크랩 기능을 제공하는 Content Script
 * Side Panel과 통신하여 페이지 콘텐츠를 Markdown으로 변환
 */

import { webClipper, clipSelection } from '../utils/webClipper';

console.log('🔗 Tyquill content script loaded');

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📩 Content script received message:', message);

  switch (message.type) {
    case 'CLIP_PAGE':
      handleClipPage(message.options)
        .then(sendResponse)
        .catch((error: any) => {
          console.error('❌ Clip page error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // 비동기 응답을 위해 true 반환

    case 'CLIP_SELECTION':
      handleClipSelection()
        .then(sendResponse)
        .catch((error: any) => {
          console.error('❌ Clip selection error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'GET_PAGE_INFO':
      handleGetPageInfo()
        .then(sendResponse)
        .catch((error: any) => {
          console.error('❌ Get page info error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'CHECK_SELECTION':
      handleCheckSelection(sendResponse);
      return true;

    case 'PING':
      console.log('🏓 Content script ping received');
      sendResponse({ success: true, message: 'Content script ready' });
      return true;

    default:
      console.warn('⚠️ Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

/**
 * 페이지 전체 스크랩
 */
async function handleClipPage(options: any = {}): Promise<any> {
  try {
    console.log('📄 Clipping full page...');
    const result = await webClipper.clipPage(options);
    
    console.log('✅ Page clipped successfully:', {
      contentLength: result.content.length,
      title: result.metadata.title,
      selectionOnly: result.selectionOnly
    });

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('❌ Page clipping failed:', error);
    throw error;
  }
}

/**
 * 선택된 텍스트 스크랩
 */
async function handleClipSelection(): Promise<any> {
  try {
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed) {
      throw new Error('No text selected');
    }

    console.log('📝 Clipping selected text...');
    const result = await clipSelection();
    
    console.log('✅ Selection clipped successfully:', {
      contentLength: result.content.length,
      selectionOnly: result.selectionOnly
    });

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('❌ Selection clipping failed:', error);
    throw error;
  }
}

/**
 * 페이지 정보 가져오기 (스크랩 없이 메타데이터만)
 */
async function handleGetPageInfo(): Promise<any> {
  try {
    console.log('ℹ️ Getting page info...');
    
    const metadata = {
      title: document.title,
      url: window.location.href,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      author: document.querySelector('meta[name="author"]')?.getAttribute('content') || '',
      publishedDate: document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || '',
      favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || '',
      hasSelection: !window.getSelection()?.isCollapsed,
      wordCount: document.body.textContent?.split(/\s+/).length || 0,
    };

    console.log('✅ Page info retrieved:', metadata);

    return {
      success: true,
      data: metadata
    };
  } catch (error: any) {
    console.error('❌ Get page info failed:', error);
    throw error;
  }
}

/**
 * 선택된 텍스트 여부 확인
 */
function handleCheckSelection(sendResponse: (response: any) => void): void {
  try {
    const selection = window.getSelection();
    const hasSelection = selection && !selection.isCollapsed;
    const selectedText = hasSelection ? selection.toString().trim() : '';

    console.log('🔍 Checking selection:', {
      hasSelection,
      selectedLength: selectedText.length
    });

    sendResponse({
      success: true,
      data: {
        hasSelection,
        selectedText: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''),
        selectedLength: selectedText.length
      }
    });
  } catch (error: any) {
    console.error('❌ Check selection failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 키보드 단축키 지원 (선택사항)
document.addEventListener('keydown', (event) => {
  // Ctrl+Shift+C (또는 Cmd+Shift+C): 빠른 스크랩
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
    event.preventDefault();
    
    const hasSelection = !window.getSelection()?.isCollapsed;
    
    if (hasSelection) {
      console.log('⌨️ Keyboard shortcut: Clipping selection');
      handleClipSelection()
        .then(result => {
          console.log('✅ Keyboard clip selection success:', result);
          // Side Panel에 결과 전송
          chrome.runtime.sendMessage({
            type: 'CLIP_RESULT',
            data: result.data
          });
        })
        .catch((error: any) => {
          console.error('❌ Keyboard clip selection error:', error);
        });
    } else {
      console.log('⌨️ Keyboard shortcut: Clipping full page');
      handleClipPage()
        .then(result => {
          console.log('✅ Keyboard clip page success:', result);
          // Side Panel에 결과 전송
          chrome.runtime.sendMessage({
            type: 'CLIP_RESULT',
            data: result.data
          });
        })
        .catch((error: any) => {
          console.error('❌ Keyboard clip page error:', error);
        });
    }
  }
});

// 초기화 완료 알림
console.log('🚀 Tyquill content script ready');

export {}; 