import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  if (!content) return <div className={className}></div>;

  // 볼드/이탤릭/취소선 텍스트 처리 헬퍼 함수 (개선된 패턴)
  const processTextFormatting = (text: string) => {
    return text
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
      // 링크 처리: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">$1</a>');
  };

  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
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
            margin: '8px 0', 
            padding: '8px 16px', 
            borderLeft: '4px solid #e0e0e0',
            backgroundColor: '#f8f9fa',
            fontStyle: 'italic'
          }} dangerouslySetInnerHTML={{ __html: processedQuote }} />
        );
      } else if (trimmedLine.startsWith('```')) {
        elements.push(
          <pre key={key++} style={{ 
            margin: '8px 0', 
            padding: '12px', 
            backgroundColor: '#f4f4f4',
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            <code>{trimmedLine.substring(3)}</code>
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

  return (
    <div className={className}>
      {renderMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;