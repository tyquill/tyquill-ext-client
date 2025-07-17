import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import TurndownService from 'turndown';
import 'react-quill/dist/quill.snow.css';
import styles from './YooptaEditor.module.css';

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
  const [editorHeight, setEditorHeight] = useState('auto');
  const turndownServiceRef = useRef<TurndownService>();
  const isUpdatingRef = useRef(false);
  const quillRef = useRef<ReactQuill>(null);

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
    
    // 밑줄 변환 규칙 추가
    service.addRule('underline', {
      filter: ['u'] as any,
      replacement: function (content) {
        return '__' + content + '__';
      }
    });
    
    turndownServiceRef.current = service;
  }, []);

  // 마크다운을 HTML로 변환
  const markdownToHtml = useCallback((markdown: string) => {
    if (!markdown) return '<p><br></p>';
    
    // 역슬래시 이스케이프 처리 먼저 수행
    let processedMarkdown = markdown
      .replace(/\\(.)/g, '$1'); // 역슬래시 이스케이프 제거
    
    // 리스트 처리 - ReactQuill 호환 방식
    const lines = processedMarkdown.split('\n');
    let inUnorderedList = false;
    let inOrderedList = false;
    const processedLines = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 헤딩 처리 (라인별로)
      if (trimmedLine.match(/^### /)) {
        // 리스트 종료
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        const headerContent = trimmedLine.substring(4);
        // 헤더 내 볼드/이탤릭 처리
        const processedHeader = headerContent
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/__([^_]+)__/g, '<u>$1</u>');
        processedLines.push(`<h3>${processedHeader}</h3>`);
      }
      else if (trimmedLine.match(/^## /)) {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        const headerContent = trimmedLine.substring(3);
        const processedHeader = headerContent
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/__([^_]+)__/g, '<u>$1</u>');
        processedLines.push(`<h2>${processedHeader}</h2>`);
      }
      else if (trimmedLine.match(/^# /)) {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        const headerContent = trimmedLine.substring(2);
        const processedHeader = headerContent
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/__([^_]+)__/g, '<u>$1</u>');
        processedLines.push(`<h1>${processedHeader}</h1>`);
      }
      // 번호 목록 처리 (1. 2. 3. 등)
      else if (trimmedLine.match(/^\d+\.\s+/)) {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        if (!inOrderedList) {
          processedLines.push('<ol>');
          inOrderedList = true;
        }
        const content = trimmedLine.replace(/^\d+\.\s+/, '');
        // 볼드/이탤릭 처리 후 HTML 이스케이프
        const processedContent = content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/__([^_]+)__/g, '<u>$1</u>');
        processedLines.push(`<li>${processedContent}</li>`);
      }
      // 불릿 포인트 처리 (* 또는 -)
      else if (trimmedLine.match(/^[\*\-]\s+/)) {
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        if (!inUnorderedList) {
          processedLines.push('<ul>');
          inUnorderedList = true;
        }
        const content = trimmedLine.replace(/^[\*\-]\s+/, '');
        // 볼드/이탤릭 처리
        const processedContent = content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/__([^_]+)__/g, '<u>$1</u>');
        processedLines.push(`<li>${processedContent}</li>`);
      }
      // 일반 텍스트
      else {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        if (trimmedLine) {
          // 볼드와 이탤릭 처리
          const processedContent = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
            .replace(/__([^_]+)__/g, '<u>$1</u>');
          processedLines.push(`<p>${processedContent}</p>`);
        } else {
          processedLines.push('<p><br></p>');
        }
      }
    }
    
    // 열린 리스트 태그 닫기
    if (inUnorderedList) {
      processedLines.push('</ul>');
    }
    if (inOrderedList) {
      processedLines.push('</ol>');
    }
    
    return processedLines.join('') || '<p><br></p>';
  }, []);

  // 에디터 높이 조정
  const adjustEditorHeight = useCallback(() => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      // const editor = quill.root;
      
      // // 에디터의 스크롤 높이를 기준으로 높이 조정
      // const scrollHeight = editor.scrollHeight;
      // const minHeight = 200; // 최소 높이
      // const maxHeight = 1000; // 최대 높이 (너무 커지지 않도록)
      
      setEditorHeight(`100%`);
    }
  }, []);

  // content가 변경될 때 HTML 업데이트
  useEffect(() => {
    if (!isUpdatingRef.current) {
      const newHtml = markdownToHtml(content);
      setHtmlContent(newHtml);
    }
  }, [content, markdownToHtml]);

  // HTML 내용이 변경된 후 높이 조정
  useEffect(() => {
    const timer = setTimeout(() => {
      adjustEditorHeight();
    }, 100); // DOM 업데이트 후 높이 조정

    return () => clearTimeout(timer);
  }, [htmlContent, adjustEditorHeight]);

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
        // 더 적극적으로 불필요한 역슬래시 이스케이프 제거
        markdownValue = markdownValue
          .replace(/\\([*_\[\]()~`>#+\-=|{}!.\w])/g, '$1')
          .replace(/\\(\d+\.)/g, '$1') // 숫자. 형태의 이스케이프 제거
          .replace(/\\\s/g, ' ') // 공백 앞의 역슬래시 제거
          .replace(/\n{2,}/g, '\n') // 연속된 개행을 단일 개행으로 변경
          .trim();
        onChange(markdownValue);
      }
      
      // 높이 조정 (약간의 지연 후)
      setTimeout(() => {
        adjustEditorHeight();
      }, 50);
    } catch (error) {
      // console.error('Error converting HTML to markdown:', error);
      const textContent = htmlValue.replace(/<[^>]*>/g, '').trim();
      onChange(textContent);
    } finally {
      // 다음 틱에서 플래그 해제
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [onChange, adjustEditorHeight]);

  return (
    <div className={styles.yooptaWrapper} style={{ 
      border: '1px solid #e0e0e0', 
      borderRadius: '8px', 
      backgroundColor: '#fff'
    }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={htmlContent}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          height: editorHeight,
        }}
      />
    </div>
  );
});

export default YooptaEditorWrapper;