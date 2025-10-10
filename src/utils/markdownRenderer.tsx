import React, { useEffect, useRef } from 'react';
import { browser } from 'wxt/browser';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  if (!content) return <div className={className} ref={containerRef}></div>;

  // 볼드/이탤릭/취소선 텍스트 처리 헬퍼 함수 (개선된 패턴)
  const processTextFormatting = (text: string) => {
    return text
      // 이미지 처리: ![alt](url "optional title") → <img>
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img src="$2" alt="$1" referrerpolicy="no-referrer" loading="lazy" style="max-width: 100%; height: auto; display: inline-block;" />')
      // 볼드 처리: **text** (한글과 특수문자 포함하여 더 넓게 매칭)
      .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
      // 이탤릭 처리: *text* (볼드와 겹치지 않도록 개선)
      .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
      // 취소선 처리: ~~text~~
      .replace(/~~([^~\n]+?)~~/g, '<del>$1</del>')
      // 밑줄 처리: __text__
      .replace(/__([^_\n]+?)__/g, '<u>$1</u>')
      // 인라인 코드 처리: `code`
      .replace(/`([^`\n]+?)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
      // 링크 처리: [text](url) - 이미지가 아닌 경우만 (! 로 시작하지 않는 경우)
      .replace(/(?<!\!)\[([^\[\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">$1</a>');
  };

  const renderMarkdown = (markdown: string) => {
    // 멀티라인 링크/이미지 구문을 먼저 HTML로 치환하여 줄 단위 파싱 한계를 보완
    const normalized = markdown
      // 멀티라인 이미지: ![alt...\n\n...](url)
      .replace(/!\[([\s\S]*?)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g, (_m, alt: string, url: string) => {
        const collapsedAlt = (alt as string).replace(/\s+/g, ' ').trim();
        return `<img src="${url}" alt="${collapsedAlt}" referrerpolicy="no-referrer" loading="lazy" style="max-width: 100%; height: auto; display: inline-block;" />`;
      })
      // 멀티라인 링크: [text...\n\n...](url) - 이미지가 아닌 경우만 (! 로 시작하지 않는 경우)
      .replace(/(?<!\!)\[([^\[\]]*(?:\n[^\[\]]*)*?)\]\(\s*([^\)]+?)\s*\)/g, (_m, text: string, url: string) => {
        const collapsedText = (text as string).replace(/\s+/g, ' ').trim();
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">${collapsedText}</a>`;
      });

    const lines = normalized.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;
    let i = 0;

    while (i < lines.length) {
      const trimmedLine = lines[i].trim();
      
      if (trimmedLine.startsWith('# ')) {
        const headerContent = trimmedLine.substring(2);
        const processedHeader = processTextFormatting(headerContent);
        elements.push(
          <h1 key={key++} style={{ fontSize: '24px', fontWeight: 'bold', margin: '16px 0 8px 0' }}
              dangerouslySetInnerHTML={{ __html: processedHeader }} />
        );
      } else if (trimmedLine.startsWith('## ')) {
        const headerContent = trimmedLine.substring(3);
        const processedHeader = processTextFormatting(headerContent);
        elements.push(
          <h2 key={key++} style={{ fontSize: '20px', fontWeight: 'bold', margin: '14px 0 6px 0' }}
              dangerouslySetInnerHTML={{ __html: processedHeader }} />
        );
      } else if (trimmedLine.startsWith('### ')) {
        const headerContent = trimmedLine.substring(4);
        const processedHeader = processTextFormatting(headerContent);
        elements.push(
          <h3 key={key++} style={{ fontSize: '18px', fontWeight: 'bold', margin: '12px 0 4px 0' }}
              dangerouslySetInnerHTML={{ __html: processedHeader }} />
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // 연속된 불릿 리스트 항목들을 하나의 ul로 그룹화 (- 와 * 모두 지원)
        const listItems: React.ReactElement[] = [];
        let listKey = 0;
        
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          const item = lines[i].trim().substring(2);
          const processedItem = processTextFormatting(item);
          listItems.push(
            <li key={listKey++} dangerouslySetInnerHTML={{ __html: processedItem }} />
          );
          i++;
        }
        
        elements.push(
          <ul key={key++} style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'disc' }}>
            {listItems}
          </ul>
        );
        
        i--; // while 루프에서 i++가 되므로 1 감소
      } else if (trimmedLine.match(/^\d+\.\s/)) {
        // 연속된 번호 리스트 항목들을 하나의 ol로 그룹화
        const listItems: React.ReactElement[] = [];
        let listKey = 0;
        
        while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
          const item = lines[i].trim().replace(/^\d+\.\s/, '');
          const processedItem = processTextFormatting(item);
          listItems.push(
            <li key={listKey++} style={{ 
              display: 'list-item', 
              listStyleType: 'decimal',
              listStylePosition: 'outside',
              paddingLeft: '0',
              marginBottom: '4px'
            }} dangerouslySetInnerHTML={{ __html: processedItem }} />
          );
          i++;
        }
        
        elements.push(
          <ol key={key++} style={{ 
            margin: '8px 0', 
            paddingLeft: '30px', 
            listStyleType: 'decimal',
            listStylePosition: 'outside',
            listStyle: 'decimal outside'
          }}>
            {listItems}
          </ol>
        );
        
        i--; // while 루프에서 i++가 되므로 1 감소
      } else if (trimmedLine.startsWith('> ')) {
        const quoteContent = trimmedLine.substring(2);
        const processedQuote = processTextFormatting(quoteContent);
        elements.push(
          <blockquote key={key++} style={{
            margin: '4px 0',
            padding: '3px 0 3px 14px',
            borderLeft: '3px solid currentcolor',
            backgroundColor: 'transparent',
            color: 'inherit',
            fontStyle: 'normal',
            fontSize: '1em',
            lineHeight: '1.6'
          }} dangerouslySetInnerHTML={{ __html: processedQuote }} />
        );
      } else if (trimmedLine.startsWith('```')) {
        // 코드 블록 시작: 다음 ```까지 모든 라인 수집
        const language = trimmedLine.substring(3).trim();
        const codeLines: string[] = [];
        i++;

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        elements.push(
          <pre key={key++} style={{
            margin: '8px 0',
            padding: '12px',
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '13px',
            lineHeight: '1.5',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace'
          }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
      } else if (trimmedLine === '---') {
        elements.push(
          <hr key={key++} style={{ 
            margin: '16px 0', 
            border: 'none', 
            borderTop: '1px solid #e0e0e0' 
          }} />
        );
      } else if (trimmedLine) {
        // 볼드 및 이탤릭 텍스트 처리
        const processedText = processTextFormatting(trimmedLine);
        
        // 콜론으로 끝나는 라인은 약간 다른 스타일 적용 (소제목 느낌)
        const isSubheading = trimmedLine.endsWith(':') && trimmedLine.length < 100;
        
        elements.push(
          <p key={key++} style={{ 
            margin: isSubheading ? '16px 0 8px 0' : '8px 0', 
            lineHeight: '1.6',
            fontWeight: isSubheading ? '600' : 'normal',
            fontSize: isSubheading ? '16px' : '14px'
          }} 
             dangerouslySetInnerHTML={{ __html: processedText }} />
        );
      } else {
        elements.push(<br key={key++} />);
      }
      
      i++;
    }

    return elements;
  };

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
    imgs.forEach((img) => {
      try { img.setAttribute('referrerpolicy', 'no-referrer'); } catch {}
      try { img.setAttribute('loading', 'lazy'); } catch {}

      const originalSrc = img.getAttribute('data-tyquill-original-src') || img.getAttribute('src') || '';
      if (!img.getAttribute('data-tyquill-original-src') && originalSrc) {
        img.setAttribute('data-tyquill-original-src', originalSrc);
      }

      const onError = async () => {
        if ((img as any)._tyquillImgBusy) return;
        (img as any)._tyquillImgBusy = true;
        try {
          const triedProxy = img.getAttribute('data-tyquill-proxy-tried') === '1';
          const triedWsrv = img.getAttribute('data-tyquill-wsrv-tried') === '1';
          const src0 = img.getAttribute('data-tyquill-original-src') || img.src || '';
          if (!src0) return;

          if (!triedWsrv) {
            img.setAttribute('data-tyquill-wsrv-tried', '1');
            const wsrv = `https://wsrv.nl/?url=${encodeURIComponent(src0)}`;
            img.src = wsrv;
            (img as any)._tyquillImgBusy = false;
            return;
          }

          if (!triedProxy) {
            img.setAttribute('data-tyquill-proxy-tried', '1');
            try {
              const resp = await browser.runtime.sendMessage({ action: 'proxyImage', url: src0 });
              if (resp?.success && resp?.dataUrl) {
                img.src = resp.dataUrl;
              }
            } catch {}
          }
        } finally {
          (img as any)._tyquillImgBusy = false;
        }
      };

      img.removeEventListener('error', onError as any);
      img.addEventListener('error', onError as any, { once: false });
    });
  });

  return (
    <div className={className} ref={containerRef}>
      {renderMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;