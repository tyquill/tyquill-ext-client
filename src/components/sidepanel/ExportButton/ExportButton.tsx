import React, { useState, useEffect, SVGProps } from 'react';
import { IoArrowUpCircle, IoDocument } from 'react-icons/io5';
import { SiSubstack, SiLinkedin } from 'react-icons/si';
import { MdEmail } from 'react-icons/md';
import styles from './ExportButton.module.css';
import { useToastHelpers } from '../../../hooks/useToast';
import { useI18n } from '../../../hooks/useI18n';
import { detectPlatform, ExportPlatform, PlatformInfo, isSupportedPlatform, getPlatformDisplayName } from '../../../utils/platformDetection';

// Ghost icon component
function SimpleIconsGhost(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12s12-5.373 12-12S18.627 0 12 0m.256 2.313c2.47.005 5.116 2.008 5.898 2.962l.244.3c1.64 1.994 3.569 4.34 3.569 6.966c0 3.719-2.98 5.808-6.158 7.508c-1.433.766-2.98 1.508-4.748 1.508c-4.543 0-8.366-3.569-8.366-8.112c0-.706.17-1.425.342-2.15c.122-.515.244-1.033.307-1.549c.548-4.539 2.967-6.795 8.422-7.408a4 4 0 0 1 .49-.026Z" />
    </svg>
  );
}

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
  const [showSuccessState, setShowSuccessState] = useState(false);

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
            setShowSuccessState(true);
            setTimeout(() => setShowSuccessState(false), 2000);
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
            setShowSuccessState(true);
            setTimeout(() => setShowSuccessState(false), 2000);
            showSuccess(t('export_success'), t('export_substackSuccess'));
            onExportSuccess?.('substack');
          } else {
            showError(t('export_failed'), exportResult.error || t('export_substackNotFound'));
          }

        } else if (currentPlatformInfo.platform === ExportPlatform.LINKEDIN) {
          // LinkedIn article editor export - using safer approach with proper timing
          const exportToLinkedIn = async (titleToExport: string, contentToExport: string) => {
            try {
              // Find title field
              const titleField = document.querySelector('textarea#article-editor-headline__textarea') as HTMLTextAreaElement;
              if (!titleField) {
                return { success: false, error: 'Title field not found' };
              }

              // Set title first
              if (titleToExport.trim()) {
                titleField.value = titleToExport.trim();
                titleField.focus();

                // Trigger input events to ensure LinkedIn recognizes the change
                const inputEvent = new Event('input', { bubbles: true });
                const changeEvent = new Event('change', { bubbles: true });
                titleField.dispatchEvent(inputEvent);
                titleField.dispatchEvent(changeEvent);
                titleField.blur();
              }

              // Wait a bit before handling content to let title settle
              await new Promise(resolve => setTimeout(resolve, 200));

              // Find content editor (ProseMirror)
              let contentEditor = document.querySelector('div.ProseMirror[contenteditable="true"][role="textbox"]') as HTMLElement;
              if (!contentEditor) {
                return { success: false, error: 'Content editor not found' };
              }

              // Set content with proper initialization
              if (contentToExport.trim()) {

                // Convert markdown to clean HTML for LinkedIn
                const convertMarkdownToHtml = (markdown: string): string => {
                  const lines = markdown.split('\n');
                  const htmlElements: string[] = [];
                  let i = 0;

                  // Process inline formatting
                  const processInlineFormatting = (text: string): string => {
                    // Bold (must come before italic)
                    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                    // Italic
                    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                    // Links
                    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
                    // Inline code
                    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
                    // Images
                    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

                    return text;
                  };

                  while (i < lines.length) {
                    const line = lines[i];
                    const trimmedLine = line.trim();

                    // Skip empty lines but add a break
                    if (!trimmedLine) {
                      htmlElements.push('<p><br></p>');
                      i++;
                      continue;
                    }

                    // Headers
                    if (trimmedLine.match(/^#{1,6}\s+/)) {
                      const level = trimmedLine.match(/^(#{1,6})\s+/)![1].length;
                      const headerContent = trimmedLine.substring(level + 1);
                      const processedHeader = processInlineFormatting(headerContent);
                      htmlElements.push(`<h${level}>${processedHeader}</h${level}>`);
                    }
                    // Horizontal rule
                    else if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
                      htmlElements.push('<hr>');
                    }
                    // Unordered list
                    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                      const listItems: string[] = [];
                      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
                        const item = lines[i].trim().substring(2);
                        const processedItem = processInlineFormatting(item);
                        listItems.push(`<li>${processedItem}</li>`);
                        i++;
                      }
                      htmlElements.push(`<ul>${listItems.join('')}</ul>`);
                      i--; // Back up one
                    }
                    // Ordered list
                    else if (trimmedLine.match(/^\d+\.\s/)) {
                      const listItems: string[] = [];
                      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
                        const item = lines[i].trim().replace(/^\d+\.\s/, '');
                        const processedItem = processInlineFormatting(item);
                        listItems.push(`<li>${processedItem}</li>`);
                        i++;
                      }
                      htmlElements.push(`<ol>${listItems.join('')}</ol>`);
                      i--; // Back up one
                    }
                    // Blockquote
                    else if (trimmedLine.startsWith('> ')) {
                      const quoteLine = trimmedLine.substring(2);
                      const processedQuote = processInlineFormatting(quoteLine);
                      htmlElements.push(`<blockquote>${processedQuote}</blockquote>`);
                    }
                    // Code block
                    else if (trimmedLine.startsWith('```')) {
                      const codeLines: string[] = [];
                      i++; // Skip opening ```
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
                    }
                    // Regular paragraph
                    else {
                      const processedText = processInlineFormatting(trimmedLine);
                      htmlElements.push(`<p>${processedText}</p>`);
                    }

                    i++;
                  }

                  return htmlElements.join('');
                };

                // Clean and convert content
                const cleanedContent = contentToExport
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();

                const htmlContent = convertMarkdownToHtml(cleanedContent);

                // Initialize editor state properly
                // First, ensure editor is in a clean state by simulating user interaction
                contentEditor.click();
                await new Promise(resolve => setTimeout(resolve, 300));

                // Check if there's existing content and position cursor
                if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
                  // If there's content, select all
                  const selection = window.getSelection();
                  if (selection) {
                    selection.removeAllRanges();
                    const range = document.createRange();
                    range.selectNodeContents(contentEditor);
                    selection.addRange(range);
                  }
                } else {
                  // If empty, just focus
                  contentEditor.focus();
                }

                // Wait for ProseMirror to stabilize
                await new Promise(resolve => setTimeout(resolve, 200));

                // Attempt to insert content
                const insertContent = async (): Promise<boolean> => {
                  try {
                    // Method 1: Try using clipboard API with proper paste event
                    const clipboardData = new DataTransfer();
                    clipboardData.setData('text/html', htmlContent);
                    clipboardData.setData('text/plain', cleanedContent);

                    const pasteEvent = new ClipboardEvent('paste', {
                      bubbles: true,
                      cancelable: true,
                      clipboardData: clipboardData
                    });

                    // Dispatch paste event
                    let pasteResult = false;
                    try {
                      pasteResult = contentEditor.dispatchEvent(pasteEvent);

                      // If paste succeeded and wasn't prevented, we're done
                      if (pasteResult && !pasteEvent.defaultPrevented) {
                        // Give ProseMirror time to process the paste
                        await new Promise(resolve => setTimeout(resolve, 300));

                        // Check if content was inserted
                        if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
                          return true;
                        }
                      }
                    } catch (pasteError) {
                      console.log('Paste event error, trying next method');
                    }

                    // Method 2: Try execCommand as fallback
                    try {
                      // First clear if needed
                      if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
                        document.execCommand('selectAll', false);
                        await new Promise(resolve => setTimeout(resolve, 50));
                        document.execCommand('delete', false);
                        await new Promise(resolve => setTimeout(resolve, 100));
                      }

                      // Insert HTML
                      const insertResult = document.execCommand('insertHTML', false, htmlContent);
                      if (insertResult) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
                          return true;
                        }
                      }
                    } catch (execError) {
                      console.log('execCommand error, trying final method');
                    }

                    // Method 3: Direct innerHTML as last resort
                    contentEditor.innerHTML = htmlContent;

                    // Trigger input event for ProseMirror
                    const inputEvent = new Event('input', { bubbles: true });
                    const changeEvent = new Event('change', { bubbles: true });
                    contentEditor.dispatchEvent(inputEvent);
                    contentEditor.dispatchEvent(changeEvent);

                    await new Promise(resolve => setTimeout(resolve, 200));
                    return contentEditor.textContent?.trim().length! > 0;

                  } catch (error) {
                    console.log('Content insertion error:', error);
                    return false;
                  }
                };

                // Try to insert content with internal retry
                let success = await insertContent();

                // If first attempt failed, wait and retry once more
                if (!success) {
                  console.log('First insertion attempt failed, retrying after delay...');

                  // Wait for any LinkedIn state changes to complete
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  // Re-query and re-focus the editor
                  contentEditor = document.querySelector('div.ProseMirror[contenteditable="true"][role="textbox"]') as HTMLElement;
                  if (contentEditor) {
                    contentEditor.click();
                    contentEditor.focus();
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // Try insertion again
                    success = await insertContent();
                  }
                }

                if (!success) {
                  // If still failed, copy to clipboard as fallback
                  try {
                    await navigator.clipboard.writeText(cleanedContent);
                    return { success: false, error: 'Content copied to clipboard. Please paste manually (Ctrl/Cmd+V).' };
                  } catch (clipErr) {
                    return { success: false, error: 'Failed to insert content. Please try again.' };
                  }
                }

                return { success: true };
              }

              return { success: true };

            } catch (error) {
              return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
          };

          // Execute the LinkedIn export function
          const exportResult = await exportToLinkedIn(title, content);
          if (exportResult.success) {
            setShowSuccessState(true);
            setTimeout(() => setShowSuccessState(false), 2000);
            showSuccess(t('export_success'), t('export_linkedinSuccess'));
            onExportSuccess?.('linkedin');
          } else {
            showError(t('export_failed'), exportResult.error || t('export_linkedinNotFound'));
          }

        } else if (currentPlatformInfo.platform === ExportPlatform.GHOST) {
          // Ghost export - using safer approach for Lexical editor
          const exportToGhost = async (titleToExport: string, contentToExport: string) => {
            try {
              // Find title field - try multiple selectors for Ghost editor
              const titleField = document.querySelector('textarea.gh-editor-title, textarea[data-test-editor-title-input]') as HTMLTextAreaElement;
              if (!titleField) {
                return { success: false, error: 'Title field not found' };
              }

              // Set title using standard form field approach
              if (titleToExport.trim()) {
                titleField.value = titleToExport.trim();
                titleField.focus();

                // Trigger input events for Ghost to recognize the change
                const inputEvent = new Event('input', { bubbles: true });
                const changeEvent = new Event('change', { bubbles: true });
                titleField.dispatchEvent(inputEvent);
                titleField.dispatchEvent(changeEvent);
                titleField.blur();
              }

              // Wait a bit before handling content to let title settle
              await new Promise(resolve => setTimeout(resolve, 200));

              // Find content editor - Ghost uses Lexical with contenteditable div
              let contentEditor = document.querySelector('div[data-kg="editor"] div.kg-prose[contenteditable="true"]') as HTMLElement;
              if (!contentEditor) {
                return { success: false, error: 'Content editor not found' };
              }

              // Set content with proper initialization
              if (contentToExport.trim()) {
                // Convert markdown to clean HTML for Lexical
                const convertMarkdownToHtml = (markdown: string): string => {
                  const lines = markdown.split('\n');
                  const htmlElements: string[] = [];
                  let i = 0;

                  // Process inline formatting
                  const processInlineFormatting = (text: string): string => {
                    // Process formatting without escaping first (to preserve user content)
                    // Bold (must come before italic)
                    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                    // Italic
                    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                    // Links
                    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
                    // Inline code
                    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
                    // Images
                    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

                    return text;
                  };

                  while (i < lines.length) {
                    const line = lines[i];
                    const trimmedLine = line.trim();

                    // Skip empty lines but add a break
                    if (!trimmedLine) {
                      htmlElements.push('<p><br></p>');
                      i++;
                      continue;
                    }

                    // Headers
                    if (trimmedLine.match(/^#{1,6}\s+/)) {
                      const level = trimmedLine.match(/^(#{1,6})\s+/)![1].length;
                      const headerContent = trimmedLine.substring(level + 1);
                      const processedHeader = processInlineFormatting(headerContent);
                      htmlElements.push(`<h${level}>${processedHeader}</h${level}>`);
                    }
                    // Horizontal rule
                    else if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
                      htmlElements.push('<hr>');
                    }
                    // Unordered list
                    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                      const listItems: string[] = [];
                      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
                        const item = lines[i].trim().substring(2);
                        const processedItem = processInlineFormatting(item);
                        listItems.push(`<li>${processedItem}</li>`);
                        i++;
                      }
                      htmlElements.push(`<ul>${listItems.join('')}</ul>`);
                      i--; // Back up one
                    }
                    // Ordered list
                    else if (trimmedLine.match(/^\d+\.\s/)) {
                      const listItems: string[] = [];
                      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
                        const item = lines[i].trim().replace(/^\d+\.\s/, '');
                        const processedItem = processInlineFormatting(item);
                        listItems.push(`<li>${processedItem}</li>`);
                        i++;
                      }
                      htmlElements.push(`<ol>${listItems.join('')}</ol>`);
                      i--; // Back up one
                    }
                    // Blockquote
                    else if (trimmedLine.startsWith('> ')) {
                      const quoteLine = trimmedLine.substring(2);
                      const processedQuote = processInlineFormatting(quoteLine);
                      htmlElements.push(`<blockquote>${processedQuote}</blockquote>`);
                    }
                    // Code block
                    else if (trimmedLine.startsWith('```')) {
                      const codeLines: string[] = [];
                      i++; // Skip opening ```
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
                    }
                    // Regular paragraph
                    else {
                      const processedText = processInlineFormatting(trimmedLine);
                      htmlElements.push(`<p>${processedText}</p>`);
                    }

                    i++;
                  }

                  return htmlElements.join('');
                };

                // Clean and convert content
                const cleanedContent = contentToExport
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();

                const htmlContent = convertMarkdownToHtml(cleanedContent);

                // Initialize editor state properly
                // First, ensure editor is in a clean state by simulating user interaction
                contentEditor.click();
                await new Promise(resolve => setTimeout(resolve, 300));

                // Check if there's existing content and position cursor
                if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
                  // If there's content, select all
                  const selection = window.getSelection();
                  if (selection) {
                    selection.removeAllRanges();
                    const range = document.createRange();
                    range.selectNodeContents(contentEditor);
                    selection.addRange(range);
                  }
                } else {
                  // If empty, just focus
                  contentEditor.focus();
                }

                // Wait for Lexical to stabilize
                await new Promise(resolve => setTimeout(resolve, 200));

                // Attempt to insert content
                const insertContent = async (): Promise<boolean> => {
                  try {
                    // Method 1: Try using clipboard API with proper paste event
                    const clipboardData = new DataTransfer();
                    clipboardData.setData('text/html', htmlContent);
                    clipboardData.setData('text/plain', cleanedContent);

                    const pasteEvent = new ClipboardEvent('paste', {
                      bubbles: true,
                      cancelable: true,
                      clipboardData: clipboardData
                    });

                    // Dispatch paste event
                    let pasteResult = false;
                    try {
                      pasteResult = contentEditor.dispatchEvent(pasteEvent);

                      // If paste succeeded and wasn't prevented, we're done
                      if (pasteResult && !pasteEvent.defaultPrevented) {
                        // Give Lexical time to process the paste
                        await new Promise(resolve => setTimeout(resolve, 300));

                        // Check if content was inserted
                        if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
                          return true;
                        }
                      }
                    } catch (pasteError) {
                      console.log('Paste event error, trying next method');
                    }

                    // Method 2: Try execCommand as fallback
                    try {
                      // First clear if needed
                      if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
                        document.execCommand('selectAll', false);
                        await new Promise(resolve => setTimeout(resolve, 50));
                        document.execCommand('delete', false);
                        await new Promise(resolve => setTimeout(resolve, 100));
                      }

                      // Insert HTML
                      const insertResult = document.execCommand('insertHTML', false, htmlContent);
                      if (insertResult) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        if (contentEditor.textContent && contentEditor.textContent.trim().length > 0) {
                          return true;
                        }
                      }
                    } catch (execError) {
                      console.log('execCommand error, trying final method');
                    }

                    // Method 3: Direct innerHTML as last resort
                    contentEditor.innerHTML = htmlContent;

                    // Trigger input event for Lexical
                    const inputEvent = new Event('input', { bubbles: true });
                    contentEditor.dispatchEvent(inputEvent);

                    await new Promise(resolve => setTimeout(resolve, 200));
                    return contentEditor.textContent?.trim().length! > 0;

                  } catch (error) {
                    console.log('Content insertion error:', error);
                    return false;
                  }
                };

                // Try to insert content with internal retry
                let success = await insertContent();

                // If first attempt failed, wait and retry once more
                if (!success) {
                  console.log('First insertion attempt failed, retrying after delay...');

                  // Wait for any Ghost state changes to complete
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  // Re-query and re-focus the editor
                  contentEditor = document.querySelector('div[data-kg="editor"] div.kg-prose[contenteditable="true"]') as HTMLElement;
                  if (contentEditor) {
                    contentEditor.click();
                    contentEditor.focus();
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // Try insertion again
                    success = await insertContent();
                  }
                }

                if (!success) {
                  // If still failed, copy to clipboard as fallback
                  try {
                    await navigator.clipboard.writeText(cleanedContent);
                    return { success: false, error: 'Content copied to clipboard. Please paste manually (Ctrl/Cmd+V).' };
                  } catch (clipErr) {
                    return { success: false, error: 'Failed to insert content. Please try again.' };
                  }
                }

                return { success: true };
              }

              return { success: true };

            } catch (error) {
              return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
          };

          // Execute the Ghost export function
          const exportResult = await exportToGhost(title, content);
          if (exportResult.success) {
            setShowSuccessState(true);
            setTimeout(() => setShowSuccessState(false), 2000);
            showSuccess(t('export_success'), t('export_ghostSuccess'));
            onExportSuccess?.('ghost');
          } else {
            showError(t('export_failed'), exportResult.error || t('export_ghostNotFound'));
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
      case ExportPlatform.GHOST:
        return <SimpleIconsGhost style={{ width: '22px', height: '22px', transform: 'scale(1.1)' }} />;
      case ExportPlatform.LINKEDIN:
        return <SiLinkedin size={16} />;
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
      case ExportPlatform.GHOST:
        return t('archiveDetailPage_exportToGhost');
      case ExportPlatform.LINKEDIN:
        return t('archiveDetailPage_exportToLinkedIn');
      default:
        return t('common_export');
    }
  };

  // Determine button state classes
  const getButtonClasses = () => {
    const classes = [styles.exportButton];

    // Add available class when platform is detected and supported
    const isPlatformAvailable = platformInfo &&
      platformInfo.isEditorPage &&
      isSupportedPlatform(platformInfo.platform);

    if (isPlatformAvailable || forceVisible) {
      classes.push(styles.available);
    }

    if (showSuccessState) {
      classes.push(styles.success);
    }

    return classes.join(' ');
  };

  return (
    <div className={styles.tooltipContainer}>
      <button
        className={getButtonClasses()}
        onClick={handleExport}
        disabled={isLoading}
      >
        {/* Button icon */}
        {isLoading ? (
          <IoArrowUpCircle size={16} className={styles.spinning} />
        ) : (
          getPlatformIcon(platformInfo?.platform || ExportPlatform.UNKNOWN)
        )}
      </button>
      <div className={styles.tooltip}>
        {getTooltipText()}
      </div>
    </div>
  );
};

export default ExportButton;