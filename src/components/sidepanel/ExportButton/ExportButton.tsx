import React, { useState, useEffect } from 'react';
import { IoArrowUpCircle } from 'react-icons/io5';
import { SiSubstack } from 'react-icons/si';
import { MdEmail } from 'react-icons/md';
import styles from './ExportButton.module.css';
import { useToastHelpers } from '../../../hooks/useToast';
import { useI18n } from '../../../hooks/useI18n';
import { detectPlatform, ExportPlatform, PlatformInfo, isSupportedPlatform, getPlatformDisplayName } from '../../../utils/platformDetection';

interface ExportButtonProps {
  title: string;
  content: string;
  onExportSuccess?: (platform: string) => void;
  forceVisible?: boolean; // Force the button to be visible regardless of platform detection
}

interface SubstackExportResult {
  success: boolean;
  error?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ title, content, onExportSuccess, forceVisible = false }) => {
  const { showSuccess, showError } = useToastHelpers();
  const { t } = useI18n();
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Platform detection
  useEffect(() => {
    const checkPlatform = () => {
      try {
        // Use window.location directly since we're in a content script context
        const currentUrl = window.location.href;
        const detectedPlatform = detectPlatform(currentUrl);
        setPlatformInfo(detectedPlatform);
      } catch (error) {
        console.error('Error detecting platform in ExportButton:', error);
        setPlatformInfo(null);
      }
    };

    // Initial platform check
    checkPlatform();

    // Listen for URL changes (for SPAs that change URL without page reload)
    const handleUrlChange = () => {
      setTimeout(checkPlatform, 100);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);

    // Listen for pushstate/replacestate events (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleUrlChange();
    };

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // Only render button if on a supported platform editor page (unless forceVisible is true)
  if (!forceVisible && (!platformInfo || !platformInfo.isEditorPage || !isSupportedPlatform(platformInfo.platform))) {
    return null;
  }

  const handleExport = async () => {
    if (!title.trim() || !content.trim()) {
      showError(t('export_failed'), t('export_contentRequired'));
      return;
    }

    // For forceVisible mode, detect platform dynamically when clicked
    let currentPlatformInfo = platformInfo;
    if (forceVisible && !currentPlatformInfo) {
      try {
        const currentUrl = window.location.href;
        currentPlatformInfo = detectPlatform(currentUrl);
      } catch (error) {
        console.error('Error detecting platform during export:', error);
      }
    }

    if (!currentPlatformInfo) {
      showError(t('export_failed'), t('export_tabNotFound'));
      return;
    }

    // Check if the detected platform is supported
    if (!isSupportedPlatform(currentPlatformInfo.platform)) {
      showError(t('export_failed'), t('export_platformNotSupported'));
      return;
    }

    setIsLoading(true);

    try {
        if (currentPlatformInfo.platform === ExportPlatform.MAILY) {
          // Direct DOM manipulation for Maily export since we're in content script context
          const exportToMaily = (contentToInsert: string) => {
            const cleanedContent = contentToInsert
              .replace(/\n{3,}/g, '\n\n')
              .trim();

            const editorContainer = document.querySelector('.codex-editor__redactor');
            if (!editorContainer) {
              return { success: false, error: 'maily editor not found' };
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
          };

          // Execute the export function
          const result = exportToMaily(content);
          if (result.success) {
            showSuccess(t('export_success'), t('export_mailySuccess'));
            onExportSuccess?.('maily');
          } else {
            showError(t('export_failed'), result.error || t('export_generalError'));
          }

        } else if (currentPlatformInfo.platform === ExportPlatform.SUBSTACK) {
          // Direct DOM manipulation for Substack export since we're in content script context
          const exportToSubstack = (titleToExport: string, contentToExport: string) => {
              // Markdown to HTML conversion
              const markdownToHtml = (markdown: string): string => {
                const lines = markdown.split('\n');
                const htmlElements: string[] = [];
                let i = 0;

                const processTextFormatting = (text: string) => {
                  return text
                    .replace(/!\[([^\]]*)\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, '<img src="$2" alt="$1">')
                    .replace(/(?<!\!)\[([^\[\]]+?)\]\(\s*([^\)]+?)\s*\)/g, '<a href="$2">$1</a>')
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
                    htmlElements.push(`<blockquote><p>${processedQuote}</p></blockquote>`);
                  } else if (trimmedLine.startsWith('```')) {
                    // Handle code blocks
                    const codeLines: string[] = [];
                    i++; // Skip the opening ```

                    while (i < lines.length && !lines[i].trim().startsWith('```')) {
                      codeLines.push(lines[i]);
                      i++;
                    }

                    if (codeLines.length > 0) {
                      htmlElements.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
                    }
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

              try {
                // Find title field
                const titleField = document.querySelector('textarea#post-title') as HTMLTextAreaElement;
                if (!titleField) {
                  return { success: false, error: 'Title field not found' };
                }

                // Find content editor
                const contentEditor = document.querySelector('.tiptap.ProseMirror') as HTMLElement;
                if (!contentEditor) {
                  return { success: false, error: 'Content editor not found' };
                }

                // Set title
                if (titleToExport.trim()) {
                  titleField.value = titleToExport.trim();
                  titleField.focus();
                  titleField.blur();

                  // Trigger input events to ensure Substack recognizes the change
                  const inputEvent = new Event('input', { bubbles: true });
                  const changeEvent = new Event('change', { bubbles: true });
                  titleField.dispatchEvent(inputEvent);
                  titleField.dispatchEvent(changeEvent);
                }

                // Set content
                if (contentToExport.trim()) {
                  const convertedHtml = markdownToHtml(contentToExport);

                  // Focus the content editor
                  contentEditor.focus();

                  // Clear existing content
                  const selection = window.getSelection();
                  if (selection) {
                    selection.removeAllRanges();
                    const range = document.createRange();
                    range.selectNodeContents(contentEditor);
                    selection.addRange(range);
                    selection.deleteFromDocument();
                  }

                  // Insert new content
                  contentEditor.innerHTML = convertedHtml;

                  // Trigger input events for Substack to recognize changes
                  const inputEvent = new Event('input', { bubbles: true });
                  const changeEvent = new Event('change', { bubbles: true });
                  contentEditor.dispatchEvent(inputEvent);
                  contentEditor.dispatchEvent(changeEvent);

                  // Set cursor at the end
                  if (selection) {
                    const range = document.createRange();
                    range.selectNodeContents(contentEditor);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
                }

                return { success: true };

              } catch (error) {
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
              }
          };

          // Execute the export function
          const exportResult = exportToSubstack(title, content);
          if (exportResult.success) {
            showSuccess(t('export_success'), t('export_substackSuccess'));
            onExportSuccess?.('substack');
          } else {
            showError(t('export_failed'), exportResult.error || t('export_substackNotFound'));
          }
        }
    } catch (error) {
      console.error('Export error:', error);
      showError(t('export_failed'), t('export_generalError'));
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformIcon = (platform: ExportPlatform) => {
    switch (platform) {
      case ExportPlatform.MAILY:
        return <MdEmail size={16} />;
      case ExportPlatform.SUBSTACK:
        return <SiSubstack size={16} />;
      default:
        return <IoArrowUpCircle size={16} />;
    }
  };

  const getTooltipText = () => {
    if (!platformInfo && forceVisible) {
      // For forceVisible mode, show generic export text when no platform is detected
      return t('common_export');
    }

    if (!platformInfo) return t('common_export');

    switch (platformInfo.platform) {
      case ExportPlatform.MAILY:
        return t('archiveDetailPage_exportToMaily');
      case ExportPlatform.SUBSTACK:
        return t('archiveDetailPage_exportToSubstack');
      default:
        return t('common_export');
    }
  };

  return (
    <button
      className={styles.exportButton}
      onClick={handleExport}
      disabled={isLoading}
      title={getTooltipText()}
    >
      {isLoading ? (
        <IoArrowUpCircle size={16} className={styles.spinning} />
      ) : (
        getPlatformIcon(platformInfo?.platform || ExportPlatform.UNKNOWN)
      )}
    </button>
  );
};

export default ExportButton;