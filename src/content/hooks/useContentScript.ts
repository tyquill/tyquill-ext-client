import { useEffect, useCallback, useState } from 'react';
import { webClipper } from '../../utils/webClipper';
import { 
  PageInfo, 
  ClipResult, 
  SelectionInfo, 
  UseContentScriptReturn,
  ClipOptions 
} from '../types';

export const useContentScript = (): UseContentScriptReturn => {
  const [isReady, setIsReady] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<SelectionInfo>({
    hasSelection: false,
    selectedText: '',
    selectedLength: 0
  });

  // 메시지 리스너 설정
  useEffect(() => {
    const messageListener = (message: any, sender: any, sendResponse: any) => {
      switch (message.type) {
        case 'CLIP_PAGE':
          handleClipPage(message.options)
            .then(sendResponse)
            .catch((error: any) => {
              sendResponse({ success: false, error: error.message });
            });
          return true;

        case 'GET_PAGE_INFO':
          handleGetPageInfo()
            .then(sendResponse)
            .catch((error: any) => {
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
              sendResponse({ success: false, error: error.message });
            });
          return true;

        case 'PING':
          sendResponse({ success: true, message: 'Content script ready' });
          return true;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    setIsReady(true);

    return () => {
      // Chrome API에서는 removeListener가 없으므로 cleanup은 생략
    };
  }, []);

  // 선택된 텍스트 감지
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const hasSelection = selection && !selection.isCollapsed;
      const selectedText = hasSelection ? selection.toString().trim() : '';

      setCurrentSelection({
        hasSelection: hasSelection || false,
        selectedText: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''),
        selectedLength: selectedText.length
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    handleSelectionChange(); // 초기 상태 설정

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // 페이지 전체 스크랩
  const handleClipPage = useCallback(async (options: any = {}): Promise<ClipResult> => {
    try {
      const result = await webClipper.clipPage(options);
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      throw error;
    }
  }, []);

  // 페이지 정보 가져오기
  const handleGetPageInfo = useCallback(async (): Promise<ClipResult> => {
    try {
      const metadata: PageInfo = {
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

      return {
        success: true,
        data: metadata
      };
    } catch (error: any) {
      throw error;
    }
  }, []);

  // 선택된 텍스트 여부 확인
  const handleCheckSelection = useCallback((sendResponse: (response: any) => void): void => {
    try {
      sendResponse({
        success: true,
        data: currentSelection
      });
    } catch (error: any) {
      sendResponse({ success: false, error: error.message });
    }
  }, [currentSelection]);

  // maily.so에 붙여넣기
  const handlePasteToMaily = useCallback(async (content: string): Promise<ClipResult> => {
    try {
      if (!window.location.hostname.includes('maily.so')) {
        throw new Error('This function only works on maily.so');
      }

      const cleanedContent = content
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const editorContainer = document.querySelector('.codex-editor__redactor');
      if (!editorContainer) {
        throw new Error('maily.so 에디터를 찾을 수 없습니다.');
      }

      let targetElement = editorContainer.querySelector('[contenteditable="true"]');
      if (!targetElement) {
        targetElement = editorContainer as HTMLElement;
      }

      (targetElement as HTMLElement).focus();

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(editorContainer);
        selection.addRange(range);
      }

      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', cleanedContent);
      dataTransfer.setData('text/html', markdownToHtml(cleanedContent));

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });

      targetElement.dispatchEvent(pasteEvent);

      if (!pasteEvent.defaultPrevented) {
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          
          const htmlContent = markdownToHtml(cleanedContent);
          const fragment = range.createContextualFragment(htmlContent);
          range.insertNode(fragment);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        data: { message: 'Content pasted successfully to maily.so editor' }
      };
    } catch (error: any) {
      throw error;
    }
  }, []);

  // Markdown을 HTML로 변환
  const markdownToHtml = useCallback((markdown: string): string => {
    if (!markdown) return '';

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
        const listItems: string[] = [];
        
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          const item = lines[i].trim().substring(2);
          const processedItem = processTextFormatting(item);
          listItems.push(`<li>${processedItem}</li>`);
          i++;
        }
        
        htmlLines.push(`<ul>${listItems.join('')}</ul>`);
        i--;
      } else if (trimmedLine.match(/^\d+\.\s/)) {
        const listItems: string[] = [];
        
        while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
          const item = lines[i].trim().replace(/^\d+\.\s/, '');
          const processedItem = processTextFormatting(item);
          listItems.push(`<li>${processedItem}</li>`);
          i++;
        }
        
        htmlLines.push(`<ol>${listItems.join('')}</ol>`);
        i--;
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
  }, []);

  return {
    isReady,
    currentSelection,
    handleClipPage,
    handleGetPageInfo,
    handlePasteToMaily
  };
}; 