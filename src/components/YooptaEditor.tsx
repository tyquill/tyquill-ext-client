import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import TurndownService from 'turndown';
import 'react-quill/dist/quill.snow.css';

interface YooptaEditorWrapperProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const YooptaEditorWrapper: React.FC<YooptaEditorWrapperProps> = React.memo(({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
  readOnly = false
}) => {
  const [htmlContent, setHtmlContent] = useState('<p><br></p>');
  const turndownServiceRef = useRef<TurndownService>();
  const isUpdatingRef = useRef(false);

  // Turndown 서비스 초기화
  useEffect(() => {
    const service = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '*',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
    });
    
    service.addRule('strikethrough', {
      filter: ['del', 's', 'strike'] as any,
      replacement: function (content) {
        return '~~' + content + '~~';
      }
    });
    
    turndownServiceRef.current = service;
  }, []);

  // 마크다운을 HTML로 변환
  const markdownToHtml = useCallback((markdown: string) => {
    if (!markdown) return '<p><br></p>';
    // 간단한 마크다운 파싱
    let html = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 헤딩
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 볼드와 이탤릭
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    
    // 리스트
    const lines = html.split('\n');
    let inList = false;
    const processedLines = [];
    
    for (const line of lines) {
      if (line.match(/^\* /)) {
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
        }
        processedLines.push(`<li>${line.substring(2)}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (line.trim()) {
          processedLines.push(`<p>${line}</p>`);
        }
      }
    }
    
    if (inList) {
      processedLines.push('</ul>');
    }
    
    return processedLines.join('') || '<p><br></p>';
  }, []);

  // content가 변경될 때 HTML 업데이트
  useEffect(() => {
    if (!isUpdatingRef.current) {
      const newHtml = markdownToHtml(content);
      setHtmlContent(newHtml);
    }
  }, [content, markdownToHtml]);

  // Quill 모듈 설정
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'blockquote', 'code-block',
    'link', 'align'
  ];

  // 에디터 변경 핸들러
  const handleChange = useCallback((htmlValue: string) => {
    if (isUpdatingRef.current) return;
    
    try {
      isUpdatingRef.current = true;
      setHtmlContent(htmlValue);
      
      if (turndownServiceRef.current) {
        let markdownValue = turndownServiceRef.current.turndown(htmlValue);
        markdownValue = markdownValue.replace(/\n{3,}/g, '\n\n').trim();
        onChange(markdownValue);
      }
    } catch (error) {
      console.error('Error converting HTML to markdown:', error);
      const textContent = htmlValue.replace(/<[^>]*>/g, '').trim();
      onChange(textContent);
    } finally {
      // 다음 틱에서 플래그 해제
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [onChange]);

  return (
    <div style={{ 
      border: '1px solid #e0e0e0', 
      borderRadius: '8px', 
      minHeight: '400px',
      backgroundColor: '#fff'
    }}>
      <ReactQuill
        theme="snow"
        value={htmlContent}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          height: '350px',
        }}
      />
    </div>
  );
});

export default YooptaEditorWrapper;