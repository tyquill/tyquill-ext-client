import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  if (!content) return <div className={className}></div>;

  // 볼드/이탤릭 텍스트 처리 헬퍼 함수
  const processTextFormatting = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
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
      } else if (trimmedLine.startsWith('- ')) {
        // 연속된 불릿 리스트 항목들을 하나의 ul로 그룹화
        const listItems: React.ReactElement[] = [];
        let listKey = 0;
        
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
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
            <li key={listKey++} dangerouslySetInnerHTML={{ __html: processedItem }} />
          );
          i++;
        }
        
        elements.push(
          <ol key={key++} style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'decimal' }}>
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
        
        elements.push(
          <p key={key++} style={{ margin: '8px 0', lineHeight: '1.6' }} 
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