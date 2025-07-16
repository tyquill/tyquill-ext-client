import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  if (!content) return <div className={className}></div>;

  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('# ')) {
        elements.push(
          <h1 key={key++} style={{ fontSize: '24px', fontWeight: 'bold', margin: '16px 0 8px 0' }}>
            {trimmedLine.substring(2)}
          </h1>
        );
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(
          <h2 key={key++} style={{ fontSize: '20px', fontWeight: 'bold', margin: '14px 0 6px 0' }}>
            {trimmedLine.substring(3)}
          </h2>
        );
      } else if (trimmedLine.startsWith('### ')) {
        elements.push(
          <h3 key={key++} style={{ fontSize: '18px', fontWeight: 'bold', margin: '12px 0 4px 0' }}>
            {trimmedLine.substring(4)}
          </h3>
        );
      } else if (trimmedLine.startsWith('- ')) {
        elements.push(
          <ul key={key++} style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>{trimmedLine.substring(2)}</li>
          </ul>
        );
      } else if (trimmedLine.match(/^\d+\.\s/)) {
        elements.push(
          <ol key={key++} style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>{trimmedLine.replace(/^\d+\.\s/, '')}</li>
          </ol>
        );
      } else if (trimmedLine.startsWith('> ')) {
        elements.push(
          <blockquote key={key++} style={{ 
            margin: '8px 0', 
            padding: '8px 16px', 
            borderLeft: '4px solid #e0e0e0',
            backgroundColor: '#f8f9fa',
            fontStyle: 'italic'
          }}>
            {trimmedLine.substring(2)}
          </blockquote>
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
        elements.push(
          <p key={key++} style={{ margin: '8px 0', lineHeight: '1.6' }}>
            {trimmedLine}
          </p>
        );
      } else {
        elements.push(<br key={key++} />);
      }
    });

    return elements;
  };

  return (
    <div className={className}>
      {renderMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;