import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { TextStyle } from '@tiptap/extension-text-style';
import { useHotkeys } from 'react-hotkeys-hook';
import styles from './Editor.module.css';

interface EditorWrapperProps {
  content: string; // HTML content (with backward compatibility for markdown)
  onChange: (content: string) => void; // Returns HTML content
  placeholder?: string;
  readOnly?: boolean;
}

interface CustomBubbleMenuProps {
  editor: any;
}

interface MenuBarProps {
  editor: Editor;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  const editorState = useEditorState({
    editor,
    selector: ctx => {
      return {
        isBold: ctx.editor.isActive('bold'),
        canBold: ctx.editor.can().chain().focus().toggleBold().run(),
        isItalic: ctx.editor.isActive('italic'),
        canItalic: ctx.editor.can().chain().focus().toggleItalic().run(),
        isUnderline: ctx.editor.isActive('underline'),
        canUnderline: ctx.editor.can().chain().focus().toggleUnderline().run(),
        isStrike: ctx.editor.isActive('strike'),
        canStrike: ctx.editor.can().chain().focus().toggleStrike().run(),
        isCode: ctx.editor.isActive('code'),
        canCode: ctx.editor.can().chain().focus().toggleCode().run(),
        canClearMarks: ctx.editor.can().chain().focus().unsetAllMarks().run(),
        isParagraph: ctx.editor.isActive('paragraph'),
        isHeading1: ctx.editor.isActive('heading', { level: 1 }),
        isHeading2: ctx.editor.isActive('heading', { level: 2 }),
        isHeading3: ctx.editor.isActive('heading', { level: 3 }),
        isHeading4: ctx.editor.isActive('heading', { level: 4 }),
        isHeading5: ctx.editor.isActive('heading', { level: 5 }),
        isHeading6: ctx.editor.isActive('heading', { level: 6 }),
        isBulletList: ctx.editor.isActive('bulletList'),
        isOrderedList: ctx.editor.isActive('orderedList'),
        isCodeBlock: ctx.editor.isActive('codeBlock'),
        isBlockquote: ctx.editor.isActive('blockquote'),
        canUndo: ctx.editor.can().chain().focus().undo().run(),
        canRedo: ctx.editor.can().chain().focus().redo().run(),
      }
    },
  });

  return (
    <div className={styles.controlGroup}>
      <div className={styles.buttonGroup}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editorState.canBold}
          className={editorState.isBold ? styles.isActive : ''}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editorState.canItalic}
          className={editorState.isItalic ? styles.isActive : ''}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editorState.canUnderline}
          className={editorState.isUnderline ? styles.isActive : ''}
        >
          Underline
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editorState.canStrike}
          className={editorState.isStrike ? styles.isActive : ''}
        >
          Strike
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editorState.canCode}
          className={editorState.isCode ? styles.isActive : ''}
        >
          Code
        </button>
        <button onClick={() => editor.chain().focus().unsetAllMarks().run()}>
          Clear marks
        </button>
        <button onClick={() => editor.chain().focus().clearNodes().run()}>
          Clear nodes
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={editorState.isParagraph ? styles.isActive : ''}
        >
          Paragraph
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editorState.isHeading1 ? styles.isActive : ''}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editorState.isHeading2 ? styles.isActive : ''}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editorState.isHeading3 ? styles.isActive : ''}
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={editorState.isHeading4 ? styles.isActive : ''}
        >
          H4
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
          className={editorState.isHeading5 ? styles.isActive : ''}
        >
          H5
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
          className={editorState.isHeading6 ? styles.isActive : ''}
        >
          H6
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editorState.isBulletList ? styles.isActive : ''}
        >
          Bullet list
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editorState.isOrderedList ? styles.isActive : ''}
        >
          Ordered list
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editorState.isCodeBlock ? styles.isActive : ''}
        >
          Code block
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editorState.isBlockquote ? styles.isActive : ''}
        >
          Blockquote
        </button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          Horizontal rule
        </button>
        <button onClick={() => editor.chain().focus().setHardBreak().run()}>
          Hard break
        </button>
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editorState.canUndo}>
          Undo
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editorState.canRedo}>
          Redo
        </button>
      </div>
    </div>
  );
};

const CustomBubbleMenu: React.FC<CustomBubbleMenuProps> = ({ editor }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    const { selection } = editor.state;
    const { from, to } = selection;
    
    if (from === to) {
      setIsVisible(false);
      return;
    }

    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const editorRect = editor.view.dom.getBoundingClientRect();
    
    // 메뉴 요소의 실제 크기 가져오기
    const menuElement = menuRef.current;
    const menuWidth = menuElement ? menuElement.offsetWidth : 120;
    const menuHeight = menuElement ? menuElement.offsetHeight : 40;
    
    let left = (start.left + end.left) / 2 - editorRect.left;
    let top = start.top - editorRect.top - menuHeight - 10;
    
    // 좌우 경계 체크
    if (left - menuWidth / 2 < 0) {
      left = menuWidth / 2 + 5;
    } else if (left + menuWidth / 2 > editorRect.width) {
      left = editorRect.width - menuWidth / 2 - 5;
    }
    
    // 상단 경계 체크 - 메뉴가 에디터 위로 나가면 선택된 텍스트 아래로 이동
    if (top < 0) {
      top = end.top - editorRect.top + 10;
    }
    
    setPosition({ top, left });
    setIsVisible(true);
  }, [editor]);

  useEffect(() => {
    const handleSelectionUpdate = () => {
      calculatePosition();
    };

    const handleTransaction = () => {
      setTimeout(handleSelectionUpdate, 0);
    };

    if (editor) {
      editor.on('selectionUpdate', handleTransaction);
      editor.on('transaction', handleTransaction);
      
      return () => {
        editor.off('selectionUpdate', handleTransaction);
        editor.off('transaction', handleTransaction);
      };
    }
  }, [editor]);

  // 메뉴가 렌더링된 후 위치 재계산
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  if (!isVisible || !editor) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        padding: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '4px',
        zIndex: 9999,
        pointerEvents: 'all',
        whiteSpace: 'nowrap'
      }}
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? styles.active : ''}
        style={{ 
          padding: '4px 8px', 
          border: 'none', 
          borderRadius: '2px', 
          cursor: 'pointer',
          backgroundColor: editor.isActive('bold') ? '#f0f0f0' : 'transparent'
        }}
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? styles.active : ''}
        style={{ 
          padding: '4px 8px', 
          border: 'none', 
          borderRadius: '2px', 
          cursor: 'pointer',
          backgroundColor: editor.isActive('italic') ? '#f0f0f0' : 'transparent'
        }}
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? styles.active : ''}
        style={{ 
          padding: '4px 8px', 
          border: 'none', 
          borderRadius: '2px', 
          cursor: 'pointer',
          backgroundColor: editor.isActive('underline') ? '#f0f0f0' : 'transparent'
        }}
      >
        U
      </button>
      <div style={{ width: '1px', height: '20px', backgroundColor: '#e0e0e0', margin: '0 4px' }}></div>
      <select
        value={
          editor.isActive('heading', { level: 1 }) ? 'h1' :
          editor.isActive('heading', { level: 2 }) ? 'h2' :
          editor.isActive('heading', { level: 3 }) ? 'h3' :
          editor.isActive('heading', { level: 4 }) ? 'h4' :
          editor.isActive('heading', { level: 5 }) ? 'h5' :
          editor.isActive('heading', { level: 6 }) ? 'h6' :
          'p'
        }
        onChange={(e) => {
          const value = e.target.value;
          if (value === 'p') {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = parseInt(value.replace('h', ''));
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
        style={{
          padding: '2px 4px',
          border: '1px solid #e0e0e0',
          borderRadius: '2px',
          fontSize: '12px',
          cursor: 'pointer',
          backgroundColor: 'white'
        }}
      >
        <option value="p">P</option>
        <option value="h1">H1</option>
        <option value="h2">H2</option>
        <option value="h3">H3</option>
        <option value="h4">H4</option>
        <option value="h5">H5</option>
        <option value="h6">H6</option>
      </select>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        style={{ 
          padding: '4px 8px', 
          border: 'none', 
          borderRadius: '2px', 
          cursor: 'pointer',
          backgroundColor: 'transparent',
          fontSize: '12px'
        }}
        title="구분선 추가"
      >
        —
      </button>
    </div>
  );
};

const EditorWrapper: React.FC<EditorWrapperProps> = React.memo(({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
  readOnly = false
}) => {
  const isUpdatingRef = useRef(false);

  // Markdown을 HTML로 변환하는 간단한 함수 (입력 호환성을 위해)
  const convertMarkdownToHtml = useCallback((markdown: string): string => {
    if (!markdown) return '<p></p>';
    
    // 이미 HTML인지 확인 (< 태그로 시작하는지)
    if (markdown.trim().startsWith('<')) {
      return markdown;
    }
    
    // 간단한 마크다운 변환만 수행
    return markdown
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        // 헤딩 변환
        if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
        if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
        if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
        if (trimmed.startsWith('#### ')) return `<h4>${trimmed.slice(5)}</h4>`;
        if (trimmed.startsWith('##### ')) return `<h5>${trimmed.slice(6)}</h5>`;
        if (trimmed.startsWith('###### ')) return `<h6>${trimmed.slice(7)}</h6>`;
        
        // 리스트 변환
        const orderedMatch = trimmed.match(/^(\d+)\. (.+)$/);
        if (orderedMatch) {
          return `<ol><li>${orderedMatch[2]}</li></ol>`;
        }
        
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return `<ul><li>${trimmed.slice(2)}</li></ul>`;
        }
        
        // 일반 문단
        return `<p>${trimmed}</p>`;
      })
      .filter(Boolean)
      .join('');
  }, []);

  const editor = useEditor({
    extensions: [
      TextStyle,
      StarterKit.configure({
        // StarterKit이 이미 Heading을 포함하고 있으므로 추가 설정
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      HorizontalRule,
    ],
    content: convertMarkdownToHtml(content),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      
      try {
        isUpdatingRef.current = true;
        const html = editor.getHTML();
        onChange(html); // HTML을 직접 반환
      } catch (error) {
        console.error('Error getting HTML content:', error);
        const textContent = editor.getText().trim();
        onChange(textContent);
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
  });

  useEffect(() => {
    if (editor && !isUpdatingRef.current) {
      const newHtml = convertMarkdownToHtml(content);
      if (editor.getHTML() !== newHtml) {
        editor.commands.setContent(newHtml);
      }
    }
  }, [content, editor, convertMarkdownToHtml]);

  // 키보드 단축키 설정
  useHotkeys('ctrl+alt+1, cmd+alt+1', () => {
    if (editor) editor.chain().focus().toggleHeading({ level: 1 }).run();
  }, { enableOnFormTags: true });

  useHotkeys('ctrl+alt+2, cmd+alt+2', () => {
    if (editor) editor.chain().focus().toggleHeading({ level: 2 }).run();
  }, { enableOnFormTags: true });

  useHotkeys('ctrl+alt+3, cmd+alt+3', () => {
    if (editor) editor.chain().focus().toggleHeading({ level: 3 }).run();
  }, { enableOnFormTags: true });

  useHotkeys('ctrl+alt+4, cmd+alt+4', () => {
    if (editor) editor.chain().focus().toggleHeading({ level: 4 }).run();
  }, { enableOnFormTags: true });

  useHotkeys('ctrl+alt+0, cmd+alt+0', () => {
    if (editor) editor.chain().focus().setParagraph().run();
  }, { enableOnFormTags: true });

  useHotkeys('ctrl+shift+minus, cmd+shift+minus', () => {
    if (editor) editor.chain().focus().setHorizontalRule().run();
  }, { enableOnFormTags: true });

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className={styles.editorWrapper} style={{ 
      border: '1px solid #e0e0e0', 
      borderRadius: '8px', 
      backgroundColor: '#fff',
      minHeight: '200px',
      position: 'relative',
      overflow: 'visible'
    }}>
      {editor && !readOnly && (
        <MenuBar editor={editor} />
      )}
      
      {editor && (
        <CustomBubbleMenu editor={editor} />
      )}

      <EditorContent 
        editor={editor} 
        className={styles.editorContent}
        style={{ 
          minHeight: '200px', 
          padding: '16px',
        }}
      />
      
      {!content && (
        <div style={{
          position: 'absolute',
          top: editor && !readOnly ? '60px' : '16px',
          left: '16px',
          color: '#aaa',
          pointerEvents: 'none',
          fontSize: '16px'
        }}>
          {placeholder}
        </div>
      )}
    </div>
  );
});

export default EditorWrapper;