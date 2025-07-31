import React from 'react';
import { IoArrowUpCircle } from 'react-icons/io5';
import styles from '../../../sidepanel/pages/PageStyles.module.css';
import { useToastHelpers } from '../../../hooks/useToast';

interface ExportButtonProps {
  title: string;
  content: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ title, content }) => {
  const { showSuccess, showError } = useToastHelpers();

  const handleExport = async () => {
    if (!title.trim() || !content.trim()) {
      showError('내보내기 실패', '제목과 내용이 모두 있어야 내보낼 수 있습니다.');
      return;
    }

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab?.url && 
          currentTab.url.includes('maily.so') && 
          (currentTab.url.includes('/edit') || currentTab.url.includes('/new') || currentTab.url.includes('/drafts'))) {
        
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id! },
          func: (contentToInsert: string) => {
            const cleanedContent = contentToInsert
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

            const existingBlocks = editorContainer.querySelectorAll('.ce-block');
            let insertionPoint: HTMLElement;
            
            if (existingBlocks.length > 0) {
              const lastBlock = existingBlocks[existingBlocks.length - 1];
              const lastEditableElement = lastBlock.querySelector('[contenteditable="true"]');
              insertionPoint = lastEditableElement as HTMLElement || targetElement as HTMLElement;
            } else {
              insertionPoint = targetElement as HTMLElement;
            }

            insertionPoint.focus();

            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              const range = document.createRange();
              range.selectNodeContents(insertionPoint);
              range.collapse(false);
              selection.addRange(range);
            }

            const markdownToHtml = (markdown: string): string => {
              const lines = markdown.split('\n');
              const htmlElements: string[] = [];
              let i = 0;

              const processTextFormatting = (text: string) => {
                return text
                  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                  .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
                  .replace(/~~(.*?)~~/g, '<del>$1</del>')
                  .replace(/__([^_]+)__/g, '<u>$1</u>')
                  .replace(/`([^`]+)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
              };

              while (i < lines.length) {
                const trimmedLine = lines[i].trim();
                
                if (trimmedLine.startsWith('# ')) {
                  const headerContent = trimmedLine.substring(2);
                  const processedHeader = processTextFormatting(headerContent);
                  htmlElements.push(`<h1>${processedHeader}</h1>`);
                } else if (trimmedLine.startsWith('## ')) {
                  const headerContent = trimmedLine.substring(3);
                  const processedHeader = processTextFormatting(headerContent);
                  htmlElements.push(`<h2>${processedHeader}</h2>`);
                } else if (trimmedLine.startsWith('### ')) {
                  const headerContent = trimmedLine.substring(4);
                  const processedHeader = processTextFormatting(headerContent);
                  htmlElements.push(`<h3>${processedHeader}</h3>`);
                } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                  const listItems: string[] = [];
                  
                  while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
                    const item = lines[i].trim().substring(2);
                    const processedItem = item
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
                      .replace(/~~(.*?)~~/g, '<del>$1</del>')
                      .replace(/__([^_]+)__/g, '<u>$1</u>')
                      .replace(/`([^`]+)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
                    listItems.push(`<li>${processedItem}</li>`);
                    i++;
                  }
                  
                  htmlElements.push(`<ul>${listItems.join('')}</ul>`);
                  i--;
                } else if (trimmedLine.match(/^\d+\.\s/)) {
                  const listItems: string[] = [];
                  
                  while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
                    const item = lines[i].trim().replace(/^\d+\.\s/, '');
                    const processedItem = item
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
                      .replace(/~~(.*?)~~/g, '<del>$1</del>')
                      .replace(/__([^_]+)__/g, '<u>$1</u>')
                      .replace(/`([^`]+)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
                    listItems.push(`<li>${processedItem}</li>`);
                    i++;
                  }
                  
                  htmlElements.push(`<ol>${listItems.join('')}</ol>`);
                  i--;
                } else if (trimmedLine.startsWith('> ')) {
                  const quoteContent = trimmedLine.substring(2);
                  const processedQuote = processTextFormatting(quoteContent);
                  htmlElements.push(`<blockquote>${processedQuote}</blockquote>`);
                } else if (trimmedLine.startsWith('```')) {
                  const codeContent = trimmedLine.substring(3);
                  htmlElements.push(`<pre><code>${codeContent}</code></pre>`);
                } else if (trimmedLine === '---') {
                  htmlElements.push('<hr>');
                } else if (trimmedLine) {
                  const processedText = processTextFormatting(trimmedLine);
                  htmlElements.push(`<p>${processedText}</p>`);
                } else {
                  htmlElements.push('<br>');
                }
                
                i++;
              }

              return htmlElements.join('\n');
            };

            const enterEvent1 = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true
            });
            insertionPoint.dispatchEvent(enterEvent1);

            setTimeout(() => {
              const enterEvent2 = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                bubbles: true,
                cancelable: true
              });
              insertionPoint.dispatchEvent(enterEvent2);

              setTimeout(() => {
                const newBlocks = editorContainer.querySelectorAll('.ce-block');
                const newLastBlock = newBlocks[newBlocks.length - 1];
                const newTargetElement = newLastBlock?.querySelector('[contenteditable="true"]') as HTMLElement;
                
                if (newTargetElement) {
                  newTargetElement.focus();

                  const convertedHtml = markdownToHtml(cleanedContent);

                  const dataTransfer = new DataTransfer();
                  dataTransfer.setData('text/html', convertedHtml);
                  dataTransfer.setData('text/plain', cleanedContent);

                  const pasteEvent = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dataTransfer
                  });

                  newTargetElement.dispatchEvent(pasteEvent);

                  if (!pasteEvent.defaultPrevented) {
                    const newSelection = window.getSelection();
                    if (newSelection && newSelection.rangeCount > 0) {
                      const range = newSelection.getRangeAt(0);
                      range.deleteContents();
                      
                      const tempDiv = document.createElement('div');
                      tempDiv.innerHTML = convertedHtml;
                      
                      const fragment = document.createDocumentFragment();
                      while (tempDiv.firstChild) {
                        fragment.appendChild(tempDiv.firstChild);
                      }
                      range.insertNode(fragment);
                    }
                  }
                }
              }, 100);
            }, 100);

            return { success: true };
          },
          args: [content]
        });

        showSuccess('내보내기 완료', 'maily.so 페이지에 내용이 붙여넣어졌습니다.');
      } else {
        showError('내보내기 실패', 'maily.so 뉴스레터 편집 또는 생성 페이지에서만 사용할 수 있습니다.');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('내보내기 실패', 'maily.so 페이지에서 내보내기 중 오류가 발생했습니다.');
    }
  };

  return (
    <button 
      className={styles.exportButton}
      onClick={handleExport}
    >
      <IoArrowUpCircle size={20} />
      maily.so로 내보내기
    </button>
  );
};

export default ExportButton; 