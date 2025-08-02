/**
 * HTML to Markdown Converter
 * 
 * @description HTML 콘텐츠를 마크다운 형식으로 변환하는 유틸리티
 */

/**
 * HTML을 마크다운으로 변환
 * @param html HTML 문자열
 * @returns 마크다운 문자열
 */
export const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  
  // HTML 파싱을 위한 임시 div 생성
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  return processNode(tempDiv);
};

/**
 * DOM 노드를 마크다운으로 변환
 */
const processNode = (node: Node): string => {
  let markdown = '';
  
  // 텍스트 노드 처리
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  
  // 요소 노드 처리
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'h1':
        markdown += `# ${getTextContent(element)}\n\n`;
        break;
      case 'h2':
        markdown += `## ${getTextContent(element)}\n\n`;
        break;
      case 'h3':
        markdown += `### ${getTextContent(element)}\n\n`;
        break;
      case 'h4':
        markdown += `#### ${getTextContent(element)}\n\n`;
        break;
      case 'h5':
        markdown += `##### ${getTextContent(element)}\n\n`;
        break;
      case 'h6':
        markdown += `###### ${getTextContent(element)}\n\n`;
        break;
      case 'p':
        const pContent = processChildNodes(element);
        if (pContent.trim()) {
          markdown += `${pContent}\n\n`;
        }
        break;
      case 'ul':
        markdown += processUnorderedList(element);
        break;
      case 'ol':
        markdown += processOrderedList(element);
        break;
      case 'li':
        // li는 ul/ol 내부에서 처리됨
        markdown += processChildNodes(element);
        break;
      case 'blockquote':
        const quoteContent = processChildNodes(element);
        if (quoteContent.trim()) {
          markdown += `> ${quoteContent.replace(/\n/g, '\n> ')}\n\n`;
        }
        break;
      case 'code':
        if (element.parentElement?.tagName.toLowerCase() === 'pre') {
          // 코드 블록 내부의 code 태그는 그대로 유지
          markdown += element.textContent || '';
        } else {
          // 인라인 코드
          markdown += `\`${element.textContent || ''}\``;
        }
        break;
      case 'pre':
        const codeContent = element.textContent || '';
        if (codeContent.trim()) {
          markdown += `\`\`\`\n${codeContent}\n\`\`\`\n\n`;
        }
        break;
      case 'hr':
        markdown += '---\n\n';
        break;
      case 'br':
        markdown += '\n';
        break;
      case 'strong':
      case 'b':
        markdown += `**${processChildNodes(element)}**`;
        break;
      case 'em':
      case 'i':
        markdown += `*${processChildNodes(element)}*`;
        break;
      case 'u':
        markdown += `__${processChildNodes(element)}__`;
        break;
      case 'del':
      case 's':
        markdown += `~~${processChildNodes(element)}~~`;
        break;
      case 'a':
        const href = element.getAttribute('href');
        const linkText = processChildNodes(element);
        if (href && linkText) {
          markdown += `[${linkText}](${href})`;
        } else {
          markdown += processChildNodes(element);
        }
        break;
      default:
        // 기타 태그는 자식 노드들만 처리
        markdown += processChildNodes(element);
    }
  }
  
  return markdown;
};

/**
 * 자식 노드들을 마크다운으로 변환
 */
const processChildNodes = (element: Element): string => {
  let markdown = '';
  for (const child of Array.from(element.childNodes)) {
    markdown += processNode(child);
  }
  return markdown;
};

/**
 * 순서 없는 목록 처리
 */
const processUnorderedList = (ul: Element): string => {
  let markdown = '';
  const items = ul.querySelectorAll('li');
  
  for (const item of Array.from(items)) {
    const itemContent = processChildNodes(item);
    if (itemContent.trim()) {
      markdown += `- ${itemContent.trim()}\n`;
    }
  }
  
  return markdown + '\n';
};

/**
 * 순서 있는 목록 처리
 */
const processOrderedList = (ol: Element): string => {
  let markdown = '';
  const items = ol.querySelectorAll('li');
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemContent = processChildNodes(item);
    if (itemContent.trim()) {
      markdown += `${i + 1}. ${itemContent.trim()}\n`;
    }
  }
  
  return markdown + '\n';
};

/**
 * 요소의 텍스트 내용만 추출 (HTML 태그 제거)
 */
const getTextContent = (element: Element): string => {
  return element.textContent?.trim() || '';
};

/**
 * 마크다운을 HTML로 변환 (기존 MarkdownRenderer와 호환)
 */
export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  // 간단한 마크다운 to HTML 변환
  return markdown
    // 헤딩
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 볼드
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 이탤릭
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 취소선
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    // 밑줄
    .replace(/__(.*?)__/g, '<u>$1</u>')
    // 인라인 코드
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // 링크
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // 줄바꿈
    .replace(/\n/g, '<br>');
};

/**
 * 마크다운을 플레인 텍스트로 변환하고 미리보기용으로 자르기
 * @param markdownContent 마크다운 문자열
 * @param maxLength 최대 길이 (기본값: 150)
 * @returns 플레인 텍스트 미리보기
 */
export const markdownToPlainTextPreview = (markdownContent: string, maxLength: number = 150): string => {
  if (!markdownContent) return '';

  // 마크다운 문법 제거
  let plainText = markdownContent
    // 헤더 제거 (# ## ### 등)
    .replace(/^#{1,6}\s+(.*)$/gm, '$1')
    // 볼드 제거 (**text** or __text__)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // 이탤릭 제거 (*text* or _text_)
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // 취소선 제거 (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // 링크 제거 [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 이미지 제거 ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // 코드 블록 제거 ```code```
    .replace(/```[\s\S]*?```/g, '')
    // 인라인 코드 제거 `code`
    .replace(/`([^`]+)`/g, '$1')
    // 인용문 제거 > text
    .replace(/^>\s+(.*)$/gm, '$1')
    // 리스트 마커 제거 - * +
    .replace(/^[-*+]\s+(.*)$/gm, '$1')
    // 번호 리스트 제거 1. text
    .replace(/^\d+\.\s+(.*)$/gm, '$1')
    // 수평선 제거 --- or ***
    .replace(/^[-*]{3,}$/gm, '')
    // 여러 개의 연속된 공백을 하나로
    .replace(/\s+/g, ' ')
    // 여러 개의 연속된 줄바꿈을 하나로
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 길이 제한
  if (plainText.length > maxLength) {
    // 단어 단위로 자르기 (더 자연스러운 절단)
    const truncated = plainText.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    return truncated + '...';
  }

  return plainText;
};

 