/**
 * Export helper functions for injecting content into editor platforms
 * These functions run in content script context and have access to page DOM
 *
 * Restored from original ExportButton implementation with full markdown support
 */

import { ExportPlatform } from './platformDetection';

interface ExportResult {
  success: boolean;
  error?: string;
}

/**
 * Export content to Maily.so editor
 * Complex implementation with full markdown to HTML conversion
 */
export const exportToMaily = (title: string, content: string): ExportResult => {
  try {
    const cleanedContent = content
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const editorContainer = document.querySelector('.codex-editor__redactor');
    if (!editorContainer) {
      return { success: false, error: 'Maily editor not found' };
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

    // Full markdown to HTML conversion with all formatting
    const markdownToHtml = (markdown: string): string => {
      const lines = markdown.split('\n');
      const htmlElements: string[] = [];
      let i = 0;

      const processTextFormatting = (text: string) => {
        return text
          .replace(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, '<img class="image-tool__image-picture" src="$1">')
          .replace(/(?<!\!)\[([^\[\]]+?)\]\(\s*([^\)]+?)\s*\)/g, '<a href="$2" target="_blank">$2<\/a>')
          .replace(/\*\*(.*?)\*\*/g, '<b>$1<\/b>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1<\/i>')
          .replace(/~~(.*?)~~/g, '<del>$1<\/del>')
          .replace(/__([^_]+)__/g, '<u>$1<\/u>')
          .replace(/`([^`]+)`/g, '<code style=\"background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;\">$1<\/code>');
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

    // Insert content with Enter key events to create new blocks
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
  } catch (error) {
    console.error('Maily export error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Export content to Substack editor
 */
export const exportToSubstack = (title: string, content: string): ExportResult => {
  try {
    // Set title
    const titleInput = document.querySelector('textarea#post-title') as HTMLTextAreaElement;
    if (titleInput && title) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Set content
    const contentEditor = document.querySelector('.tiptap.ProseMirror') as HTMLElement;
    if (!contentEditor) {
      return { success: false, error: 'Substack editor not found' };
    }

    contentEditor.focus();

    const cleanedContent = content
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Full markdown to HTML conversion with all formatting
    const markdownToHtml = (markdown: string): string => {
      const lines = markdown.split('\n');
      const htmlElements: string[] = [];
      let i = 0;

      const processTextFormatting = (text: string) => {
        return text
          .replace(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, '<img src="$1">')
          .replace(/(?<!\!)\[([^\[\]]+?)\]\(\s*([^\)]+?)\s*\)/g, '<a href="$2" target="_blank">$1</a>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/~~(.*?)~~/g, '<del>$1</del>')
          .replace(/__([^_]+)__/g, '<u>$1</u>')
          .replace(/`([^`]+)`/g, '<code>$1</code>');
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
            const processedItem = processTextFormatting(item);
            listItems.push(`<li>${processedItem}</li>`);
            i++;
          }

          htmlElements.push(`<ul>${listItems.join('')}</ul>`);
          i--;
        } else if (trimmedLine.match(/^\d+\.\s/)) {
          const listItems: string[] = [];

          while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
            const item = lines[i].trim().replace(/^\d+\.\s/, '');
            const processedItem = processTextFormatting(item);
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
          // Skip empty lines - don't add br tags
          continue;
        }

        i++;
      }

      return htmlElements.join('');
    };

    const htmlContent = markdownToHtml(cleanedContent);

    // Use ClipboardEvent to avoid Substack adding extra empty paragraphs
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(contentEditor);
      range.collapse(false);
      selection.addRange(range);
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/html', htmlContent);
    dataTransfer.setData('text/plain', cleanedContent);

    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });

    contentEditor.dispatchEvent(pasteEvent);

    return { success: true };
  } catch (error) {
    console.error('Substack export error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Export content to Ghost editor (async due to timing requirements)
 */
export const exportToGhost = async (title: string, content: string): Promise<ExportResult> => {
  try {
    // Set title
    const titleField = document.querySelector('textarea.gh-editor-title, textarea[data-test-editor-title-input]') as HTMLTextAreaElement;
    if (!titleField) {
      return { success: false, error: 'Title field not found' };
    }

    if (title.trim()) {
      titleField.value = title.trim();
      titleField.focus();
      titleField.dispatchEvent(new Event('input', { bubbles: true }));
      titleField.dispatchEvent(new Event('change', { bubbles: true }));
      titleField.blur();
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    let contentEditor = document.querySelector('div[data-kg="editor"] div.kg-prose[contenteditable="true"]') as HTMLElement;
    if (!contentEditor) {
      return { success: false, error: 'Content editor not found' };
    }

    if (content.trim()) {
      const convertMarkdownToHtml = (markdown: string): string => {
        const lines = markdown.split('\n');
        const htmlElements: string[] = [];
        let i = 0;

        const processInlineFormatting = (text: string): string => {
          return text
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
        };

        while (i < lines.length) {
          const trimmedLine = lines[i].trim();

          if (!trimmedLine) {
            htmlElements.push('<p><br></p>');
            i++;
            continue;
          }

          if (trimmedLine.match(/^#{1,6}\s+/)) {
            const level = trimmedLine.match(/^(#{1,6})\s+/)![1].length;
            const headerContent = trimmedLine.substring(level + 1);
            htmlElements.push(`<h${level}>${processInlineFormatting(headerContent)}</h${level}>`);
          } else if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
            htmlElements.push('<hr>');
          } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            const listItems: string[] = [];
            while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
              listItems.push(`<li>${processInlineFormatting(lines[i].trim().substring(2))}</li>`);
              i++;
            }
            htmlElements.push(`<ul>${listItems.join('')}</ul>`);
            i--;
          } else if (trimmedLine.match(/^\d+\.\s/)) {
            const listItems: string[] = [];
            while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
              listItems.push(`<li>${processInlineFormatting(lines[i].trim().replace(/^\d+\.\s/, ''))}</li>`);
              i++;
            }
            htmlElements.push(`<ol>${listItems.join('')}</ol>`);
            i--;
          } else if (trimmedLine.startsWith('> ')) {
            htmlElements.push(`<blockquote>${processInlineFormatting(trimmedLine.substring(2))}</blockquote>`);
          } else if (trimmedLine.startsWith('```')) {
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
              codeLines.push(lines[i]);
              i++;
            }
            if (codeLines.length > 0) {
              const escapedCode = codeLines.join('\n')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              htmlElements.push(`<pre><code>${escapedCode}</code></pre>`);
            }
          } else {
            htmlElements.push(`<p>${processInlineFormatting(trimmedLine)}</p>`);
          }

          i++;
        }

        return htmlElements.join('');
      };

      const cleanedContent = content.replace(/\n{3,}/g, '\n\n').trim();
      const htmlContent = convertMarkdownToHtml(cleanedContent);

      contentEditor.click();
      await new Promise(resolve => setTimeout(resolve, 300));

      if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(contentEditor);
          selection.addRange(range);
        }
      } else {
        contentEditor.focus();
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const clipboardData = new DataTransfer();
      clipboardData.setData('text/html', htmlContent);
      clipboardData.setData('text/plain', cleanedContent);

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData
      });

      contentEditor.dispatchEvent(pasteEvent);
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!contentEditor.textContent || contentEditor.textContent.trim().length === 0) {
        document.execCommand('insertHTML', false, htmlContent);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Ghost export error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Export content to LinkedIn article editor
 */
export const exportToLinkedIn = (title: string, content: string): ExportResult => {
  try {
    // Set title
    const titleInput = document.querySelector('textarea#article-editor-headline__textarea') as HTMLTextAreaElement;
    if (titleInput && title) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Set content
    const contentEditor = document.querySelector('div.ProseMirror[contenteditable="true"][role="textbox"]') as HTMLElement;
    if (!contentEditor) {
      return { success: false, error: 'LinkedIn editor not found' };
    }

    contentEditor.focus();

    const cleanedContent = content
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Full markdown to HTML conversion with all formatting
    const markdownToHtml = (markdown: string): string => {
      const lines = markdown.split('\n');
      const htmlElements: string[] = [];
      let i = 0;

      const processTextFormatting = (text: string) => {
        return text
          .replace(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, '<img src="$1">')
          .replace(/(?<!\!)\[([^\[\]]+?)\]\(\s*([^\)]+?)\s*\)/g, '<a href="$2" target="_blank">$1</a>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/~~(.*?)~~/g, '<del>$1</del>')
          .replace(/__([^_]+)__/g, '<u>$1</u>')
          .replace(/`([^`]+)`/g, '<code>$1</code>');
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
            const processedItem = processTextFormatting(item);
            listItems.push(`<li>${processedItem}</li>`);
            i++;
          }

          htmlElements.push(`<ul>${listItems.join('')}</ul>`);
          i--;
        } else if (trimmedLine.match(/^\d+\.\s/)) {
          const listItems: string[] = [];

          while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
            const item = lines[i].trim().replace(/^\d+\.\s/, '');
            const processedItem = processTextFormatting(item);
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
          // Skip empty lines - don't add br tags
          continue;
        }

        i++;
      }

      return htmlElements.join('');
    };

    const htmlContent = markdownToHtml(cleanedContent);

    // Use ClipboardEvent to avoid LinkedIn adding extra empty paragraphs
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(contentEditor);
      range.collapse(false);
      selection.addRange(range);
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/html', htmlContent);
    dataTransfer.setData('text/plain', cleanedContent);

    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });

    contentEditor.dispatchEvent(pasteEvent);

    return { success: true };
  } catch (error) {
    console.error('LinkedIn export error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Main export function that delegates to platform-specific handlers
 */
export const performExport = async (platform: ExportPlatform, title: string, content: string): Promise<ExportResult> => {
  switch (platform) {
    case ExportPlatform.MAILY:
      return exportToMaily(title, content);
    case ExportPlatform.SUBSTACK:
      return exportToSubstack(title, content);
    case ExportPlatform.GHOST:
      return await exportToGhost(title, content);
    case ExportPlatform.LINKEDIN:
      return exportToLinkedIn(title, content);
    default:
      return { success: false, error: 'Unsupported platform' };
  }
};
