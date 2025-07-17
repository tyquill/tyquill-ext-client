/**
 * Content Script for Tyquill Extension
 * 
 * @description 웹 페이지에서 스크랩 기능을 제공하는 Content Script
 * Side Panel과 통신하여 페이지 콘텐츠를 Markdown으로 변환
 */

import { webClipper, clipSelection } from '../utils/webClipper';

// console.log('🔗 Tyquill content script loaded');

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('📩 Content script received message:', message);

  switch (message.type) {
    case 'CLIP_PAGE':
      handleClipPage(message.options)
        .then(sendResponse)
        .catch((error: any) => {
          // console.error('❌ Clip page error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // 비동기 응답을 위해 true 반환

    case 'CLIP_SELECTION':
      handleClipSelection()
        .then(sendResponse)
        .catch((error: any) => {
          // console.error('❌ Clip selection error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'GET_PAGE_INFO':
      handleGetPageInfo()
        .then(sendResponse)
        .catch((error: any) => {
          // console.error('❌ Get page info error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'CHECK_SELECTION':
      handleCheckSelection(sendResponse);
      return true;

    case 'PASTE_TO_MAILY':
      handlePasteToMaily(message.content)
        .then(sendResponse)
        .catch((error: any) => {
          // console.error('❌ Paste to maily error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'PING':
      // console.log('🏓 Content script ping received');
      sendResponse({ success: true, message: 'Content script ready' });
      return true;

    default:
      // console.warn('⚠️ Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

/**
 * 페이지 전체 스크랩
 */
async function handleClipPage(options: any = {}): Promise<any> {
  try {
    // console.log('📄 Clipping full page...');
    const result = await webClipper.clipPage(options);
    
    // console.log('✅ Page clipped successfully:', {
    //   contentLength: result.content.length,
    //   title: result.metadata.title,
    //   selectionOnly: result.selectionOnly
    // });

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    // console.error('❌ Page clipping failed:', error);
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

    // console.log('📝 Clipping selected text...');
    const result = await clipSelection();
    
    // console.log('✅ Selection clipped successfully:', {
    //   contentLength: result.content.length,
    //   selectionOnly: result.selectionOnly
    // });

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    // console.error('❌ Selection clipping failed:', error);
    throw error;
  }
}

/**
 * 페이지 정보 가져오기 (스크랩 없이 메타데이터만)
 */
async function handleGetPageInfo(): Promise<any> {
  try {
    // console.log('ℹ️ Getting page info...');
    
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

    // console.log('✅ Page info retrieved:', metadata);

    return {
      success: true,
      data: metadata
    };
  } catch (error: any) {
    // console.error('❌ Get page info failed:', error);
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

    // console.log('🔍 Checking selection:', {
    //   hasSelection,
    //   selectedLength: selectedText.length
    // });

    sendResponse({
      success: true,
      data: {
        hasSelection,
        selectedText: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''),
        selectedLength: selectedText.length
      }
    });
  } catch (error: any) {
    // console.error('❌ Check selection failed:', error);
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
      // console.log('⌨️ Keyboard shortcut: Clipping selection');
      handleClipSelection()
        .then(result => {
          // console.log('✅ Keyboard clip selection success:', result);
          // Side Panel에 결과 전송
          chrome.runtime.sendMessage({
            type: 'CLIP_RESULT',
            data: result.data
          });
        })
        .catch((error: any) => {
          // console.error('❌ Keyboard clip selection error:', error);
        });
    } else {
      // console.log('⌨️ Keyboard shortcut: Clipping full page');
      handleClipPage()
        .then(result => {
          // console.log('✅ Keyboard clip page success:', result);
          // Side Panel에 결과 전송
          chrome.runtime.sendMessage({
            type: 'CLIP_RESULT',
            data: result.data
          });
        })
        .catch((error: any) => {
          // console.error('❌ Keyboard clip page error:', error);
        });
    }
  }
});

/**
 * Markdown을 HTML로 변환
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // 볼드/이탤릭 텍스트 처리 헬퍼 함수
  const processTextFormatting = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  };

  const lines = markdown.split('\n');
  const htmlLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmedLine = lines[i].trim();
    
    if (trimmedLine.startsWith('# ')) {
      const headerContent = trimmedLine.substring(2);
      const processedHeader = processTextFormatting(headerContent);
      htmlLines.push(`<h1>${processedHeader}</h1>`);
    } else if (trimmedLine.startsWith('## ')) {
      const headerContent = trimmedLine.substring(3);
      const processedHeader = processTextFormatting(headerContent);
      htmlLines.push(`<h2>${processedHeader}</h2>`);
    } else if (trimmedLine.startsWith('### ')) {
      const headerContent = trimmedLine.substring(4);
      const processedHeader = processTextFormatting(headerContent);
      htmlLines.push(`<h3>${processedHeader}</h3>`);
    } else if (trimmedLine.startsWith('- ')) {
      // 연속된 불릿 리스트 항목들을 하나의 ul로 그룹화
      const listItems: string[] = [];
      
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        const item = lines[i].trim().substring(2);
        const processedItem = processTextFormatting(item);
        listItems.push(`<li>${processedItem}</li>`);
        i++;
      }
      
      htmlLines.push(`<ul>${listItems.join('')}</ul>`);
      i--; // while 루프에서 i++가 되므로 1 감소
    } else if (trimmedLine.match(/^\d+\.\s/)) {
      // 연속된 번호 리스트 항목들을 하나의 ol로 그룹화
      const listItems: string[] = [];
      
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        const item = lines[i].trim().replace(/^\d+\.\s/, '');
        const processedItem = processTextFormatting(item);
        listItems.push(`<li>${processedItem}</li>`);
        i++;
      }
      
      htmlLines.push(`<ol>${listItems.join('')}</ol>`);
      i--; // while 루프에서 i++가 되므로 1 감소
    } else if (trimmedLine.startsWith('> ')) {
      const quoteContent = trimmedLine.substring(2);
      const processedQuote = processTextFormatting(quoteContent);
      htmlLines.push(`<blockquote>${processedQuote}</blockquote>`);
    } else if (trimmedLine.startsWith('```')) {
      const codeContent = trimmedLine.substring(3);
      htmlLines.push(`<pre><code>${codeContent}</code></pre>`);
    } else if (trimmedLine === '---') {
      htmlLines.push('<hr>');
    } else if (trimmedLine) {
      const processedText = processTextFormatting(trimmedLine);
      htmlLines.push(`<p>${processedText}</p>`);
    } else {
      htmlLines.push('<br>');
    }
    
    i++;
  }

  return htmlLines.join('\n');
}

/**
 * maily.so 페이지에 텍스트 붙여넣기 (실제 paste 이벤트 사용)
 */
async function handlePasteToMaily(content: string): Promise<any> {
  try {
    // maily.so 페이지인지 확인
    if (!window.location.hostname.includes('maily.so')) {
      throw new Error('This function only works on maily.so');
    }

    // 에디터 컨테이너 찾기
    const editorContainer = document.querySelector('.codex-editor__redactor');
    if (!editorContainer) {
      throw new Error('maily.so 에디터를 찾을 수 없습니다.');
    }

    // 첫 번째 편집 가능한 요소 찾기 (기존 블록이 있다면)
    let targetElement = editorContainer.querySelector('[contenteditable="true"]');
    
    // 편집 가능한 요소가 없다면 에디터 컨테이너에 포커스
    if (!targetElement) {
      targetElement = editorContainer as HTMLElement;
    }

    // 요소에 포커스
    (targetElement as HTMLElement).focus();

    // 기존 내용 전체 선택
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(editorContainer);
      selection.addRange(range);
    }

    // 클립보드 사용하지 않고 직접 DataTransfer 객체 생성
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', content);
    dataTransfer.setData('text/html', markdownToHtml(content));

    // paste 이벤트 생성 및 발생
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });

    // paste 이벤트 발생
    targetElement.dispatchEvent(pasteEvent);

    // fallback: 직접 내용 삽입
    if (!pasteEvent.defaultPrevented) {
      // 선택된 내용을 대체
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // HTML 내용 삽입
        const htmlContent = markdownToHtml(content);
        const fragment = range.createContextualFragment(htmlContent);
        range.insertNode(fragment);
      }
    }

    // 추가 fallback: 키보드 이벤트 시뮬레이션 (Ctrl+V)
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    
    const keyupEvent = new KeyboardEvent('keyup', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });

    targetElement.dispatchEvent(keydownEvent);
    targetElement.dispatchEvent(keyupEvent);

    // 약간의 지연 후 성공 반환
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      message: 'Content pasted successfully to maily.so editor'
    };
  } catch (error: any) {
    throw error;
  }
}


// 초기화 완료 알림
// console.log('🚀 Tyquill content script ready');

export {}; 