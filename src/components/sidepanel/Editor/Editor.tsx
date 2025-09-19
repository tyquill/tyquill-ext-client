import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { useHotkeys } from 'react-hotkeys-hook';
import { htmlToMarkdown, markdownToHtml } from '../../../utils/markdownConverter';
import { useI18n } from '../../../hooks/useI18n';
import { 
  RiBold, 
  RiItalic, 
  RiStrikethrough, 
  RiCodeLine, 
  RiDeleteBinLine, 
  RiListUnordered, 
  RiListOrdered, 
  RiCodeBoxLine, 
  RiDoubleQuotesL, 
  RiArrowGoBackLine, 
  RiArrowGoForwardLine, 
  RiFormatClear,
  RiUnderline,
  RiSubtractLine,
  RiText,
  RiCornerDownLeftLine} from 'react-icons/ri';
import { TbMoodPuzzled } from "react-icons/tb";
import styles from './Editor.module.css';

interface EditorWrapperProps {
  content: string; // HTML content (with backward compatibility for markdown)
  onChange: (content: string) => void; // Returns Markdown content for AI editing
  placeholder?: string;
  readOnly?: boolean;
  onHistoryStateChange?: (canUndo: boolean, canRedo: boolean) => void; // Callback for history state changes
}

interface CustomBubbleMenuProps {
  editor: any;
}

interface MenuBarProps {
  editor: Editor;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  const { t } = useI18n();
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, tooltipText: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const buttonCenterX = rect.left + rect.width / 2;
    const buttonTop = rect.top;
    
    // 툴팁이 화면 위쪽에 표시될 공간이 있는지 확인
    const tooltipHeight = 30; // 예상 툴팁 높이
    const spaceAbove = buttonTop;
    
    let tooltipX = buttonCenterX;
    let tooltipY;
    
    if (spaceAbove >= tooltipHeight + 10) {
      // 위쪽에 표시
      tooltipY = buttonTop - tooltipHeight - 5;
    } else {
      // 아래쪽에 표시
      tooltipY = rect.bottom + 5;
    }
    
    // 화면 경계 체크
    const tooltipWidth = tooltipText.length * 8 + 20; // 예상 툴팁 너비
    if (tooltipX - tooltipWidth / 2 < 10) {
      tooltipX = tooltipWidth / 2 + 10;
    } else if (tooltipX + tooltipWidth / 2 > window.innerWidth - 10) {
      tooltipX = window.innerWidth - tooltipWidth / 2 - 10;
    }
    
    setTooltip({ text: tooltipText, x: tooltipX, y: tooltipY });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Pre-compute tooltip texts to avoid build issues
  const tooltips = {
    bold: t('editor_bold'),
    italic: t('editor_italic'),
    underline: t('editor_underline'),
    strikethrough: t('editor_strikethrough'),
    inlineCode: t('editor_inlineCode'),
    clearFormatting: t('editor_clearFormatting'),
    clearNode: t('editor_clearNode'),
    paragraph: t('editor_paragraph'),
    bulletList: t('editor_bulletList'),
    orderedList: t('editor_orderedList'),
    codeBlock: t('editor_codeBlock'),
    blockquote: t('editor_blockquote'),
    horizontalRule: t('editor_horizontalRule'),
    hardBreak: t('editor_hardBreak'),
    undo: t('editor_undo'),
    redo: t('editor_redo'),
  };

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
      {/* 첫 번째 줄: 텍스트 스타일링 */}
      <div className={styles.toolbarRow}>
        <div className={styles.toolbarGroup}>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editorState.canBold}
            className={editorState.isBold ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.bold)}
            onMouseLeave={handleMouseLeave}
          >
            <RiBold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editorState.canItalic}
            className={editorState.isItalic ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.italic)}
            onMouseLeave={handleMouseLeave}
          >
            <RiItalic size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editorState.canUnderline}
            className={editorState.isUnderline ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.underline)}
            onMouseLeave={handleMouseLeave}
          >
            <RiUnderline size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editorState.canStrike}
            className={editorState.isStrike ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.strikethrough)}
            onMouseLeave={handleMouseLeave}
          >
            <RiStrikethrough size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editorState.canCode}
            className={editorState.isCode ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.inlineCode)}
            onMouseLeave={handleMouseLeave}
          >
            <RiCodeLine size={16} />
          </button>
        </div>

        <div className={styles.toolbarDivider} />

        <div className={styles.toolbarGroup}>
          <button
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.clearFormatting)}
            onMouseLeave={handleMouseLeave}
          >
            <RiFormatClear size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().clearNodes().run()}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.clearNode)}
            onMouseLeave={handleMouseLeave}
          >
            <RiDeleteBinLine size={16} />
          </button>
        </div>

        <div className={styles.toolbarDivider} />

        <div className={styles.toolbarGroup}>
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={editorState.isParagraph ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.paragraph)}
            onMouseLeave={handleMouseLeave}
          >
            <RiText size={16} />
          </button>
          <select
            value={
               editorState.isHeading1 ? 'h1' :
               editorState.isHeading2 ? 'h2' :
               editorState.isHeading3 ? 'h3' :
               editorState.isHeading4 ? 'h4' :
               editorState.isHeading5 ? 'h5' :
               editorState.isHeading6 ? 'h6' :
               'p'
             }
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'p') {
                editor.chain().focus().setParagraph().run();
              } else {
                const level = parseInt(value.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
            className={styles.headingSelect}
          >
            <option value="p">{t('editor_paragraphOption')}</option>
            <option value="h1">{t('editor_heading1')}</option>
            <option value="h2">{t('editor_heading2')}</option>
            <option value="h3">{t('editor_heading3')}</option>
            <option value="h4">{t('editor_heading4')}</option>
            <option value="h5">{t('editor_heading5')}</option>
            <option value="h6">{t('editor_heading6')}</option>
          </select>
        </div>
      </div>

      {/* 두 번째 줄: 블록 요소들 */}
      <div className={styles.toolbarRow}>
        <div className={styles.toolbarGroup}>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editorState.isBulletList ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.bulletList)}
            onMouseLeave={handleMouseLeave}
          >
            <RiListUnordered size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editorState.isOrderedList ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.orderedList)}
            onMouseLeave={handleMouseLeave}
          >
            <RiListOrdered size={16} />
          </button>
        </div>

        <div className={styles.toolbarDivider} />

        <div className={styles.toolbarGroup}>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editorState.isCodeBlock ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.codeBlock)}
            onMouseLeave={handleMouseLeave}
          >
            <RiCodeBoxLine size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editorState.isBlockquote ? styles.isActive : ''}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.blockquote)}
            onMouseLeave={handleMouseLeave}
          >
            <RiDoubleQuotesL size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.horizontalRule)}
            onMouseLeave={handleMouseLeave}
          >
            <RiSubtractLine size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setHardBreak().run()}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.hardBreak)}
            onMouseLeave={handleMouseLeave}
          >
            <RiCornerDownLeftLine size={16} />
          </button>
        </div>

        <div className={styles.toolbarDivider} />

        <div className={styles.toolbarGroup}>
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editorState.canUndo}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.undo)}
            onMouseLeave={handleMouseLeave}
          >
            <RiArrowGoBackLine size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editorState.canRedo}
            onMouseEnter={(e) => handleMouseEnter(e, tooltips.redo)}
            onMouseLeave={handleMouseLeave}
          >
            <RiArrowGoForwardLine size={16} />
          </button>
        </div>
      </div>
      
      {/* 커스텀 툴팁 */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 9999,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            pointerEvents: 'none',
          }}
        >
          {tooltip.text}
        </div>
      )}
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
    
    // 선택된 텍스트의 중앙 위치 계산 (절대 좌표)
    let left = (start.left + end.left) / 2;
    
    // 기본적으로 선택된 텍스트 바로 위에 배치 (절대 좌표)
    let top = start.top - menuHeight - 10;
    
    // 좌우 경계 체크 (화면 기준)
    if (left - menuWidth / 2 < 10) {
      left = menuWidth / 2 + 10;
    } else if (left + menuWidth / 2 > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth / 2 - 10;
    }
    
    // 상단 경계 체크 - 메뉴가 화면 위로 나가면 선택된 텍스트 아래로 이동
    if (top < 10) {
      top = end.bottom + 10;
    }
    
    // 하단 경계 체크 - 메뉴가 화면 아래로 나가면 선택된 텍스트 위로 이동
    if (top + menuHeight > window.innerHeight - 10) {
      top = start.top - menuHeight - 10;
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
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        gap: '4px',
        zIndex: 9999,
        pointerEvents: 'all',
        whiteSpace: 'nowrap',
        minWidth: '120px'
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
          backgroundColor: editor.isActive('bold') ? '#f0f0f0' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <RiBold size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? styles.active : ''}
        style={{ 
          padding: '4px 8px', 
          border: 'none', 
          borderRadius: '2px', 
          cursor: 'pointer',
          backgroundColor: editor.isActive('italic') ? '#f0f0f0' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <RiItalic size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? styles.active : ''}
        style={{ 
          padding: '4px 8px', 
          border: 'none', 
          borderRadius: '2px', 
          cursor: 'pointer',
          backgroundColor: editor.isActive('underline') ? '#f0f0f0' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <RiUnderline size={14} />
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <RiSubtractLine size={14} />
      </button>
      <div style={{ width: '1px', height: '20px', backgroundColor: '#e0e0e0', margin: '0 4px' }}></div>
      {/* AI 편집 기능 추가 예정 */}
      {/*
      <button
        onClick={() => {
          const selectedText = editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to
          );
          if (selectedText.trim()) {
            // console.log('AI 편집 요청:', selectedText);
            // TODO: AI 편집 기능 구현
          }
        }}
        style={{ 
          padding: '4px 8px', 
          border: 'none', 
          borderRadius: '2px', 
          cursor: 'pointer',
          backgroundColor: '#f0f9ff',
          color: '#0369a1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '500'
        }}
      >
        <TbMoodPuzzled size={14} />
        <span style={{ marginLeft: '4px' }}>AI</span>
      </button> */}
    </div>
  );
};

const EditorWrapper: React.FC<EditorWrapperProps> = React.memo(({
  content,
  onChange,
  placeholder,
  readOnly = false,
  onHistoryStateChange
}) => {
  const { t } = useI18n();
  const actualPlaceholder = placeholder || t('editor_placeholder');
  const isUpdatingRef = useRef(false);

  // Markdown을 HTML로 변환하는 함수 (입력 호환성을 위해)
  const convertMarkdownToHtml = useCallback((markdown: string): string => {
    if (!markdown) return '<p></p>';
    
    // 이미 HTML인지 확인 (< 태그로 시작하는지)
    if (markdown.trim().startsWith('<')) {
      return markdown;
    }
    
    // markdownConverter의 함수 사용
    return markdownToHtml(markdown);
  }, []);

  const extensions = useMemo(() => {
    const list = [
      TextStyle,
      StarterKit.configure({
        // StarterKit이 이미 Heading을 포함하고 있으므로 추가 설정
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ];
    const seen = new Set<string>();
    return list.filter((ext: any) => {
      const name = ext?.name as string | undefined;
      if (name && seen.has(name)) return false;
      if (name) seen.add(name);
      return true;
    });
  }, []);

  const editor = useEditor({
    extensions,
    content: convertMarkdownToHtml(content),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      
      try {
        isUpdatingRef.current = true;
        const html = editor.getHTML();
        // AI 편집을 위해 마크다운으로 변환하여 반환
        const markdown = htmlToMarkdown(html);
        onChange(markdown);
        
        // 히스토리 상태 변경 알림
        if (onHistoryStateChange) {
          const canUndo = editor.can().chain().focus().undo().run();
          const canRedo = editor.can().chain().focus().redo().run();
          onHistoryStateChange(canUndo, canRedo);
        }
      } catch (error) {
        console.error('Error converting HTML to Markdown:', error);
        // 변환 실패 시 텍스트만 반환
        const textContent = editor.getText().trim();
        onChange(textContent);
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
  });

  // 편집기 생성 시 초기 히스토리 상태 설정
  useEffect(() => {
    if (editor && onHistoryStateChange) {
      setTimeout(() => {
        const canUndo = editor.can().chain().focus().undo().run();
        const canRedo = editor.can().chain().focus().redo().run();
        onHistoryStateChange(canUndo, canRedo);
      }, 0);
    }
  }, [editor, onHistoryStateChange]);

  useEffect(() => {
    if (editor && !isUpdatingRef.current) {
      const newHtml = convertMarkdownToHtml(content);
      if (editor.getHTML() !== newHtml) {
        editor.commands.setContent(newHtml);
        
        // 콘텐츠 설정 후 히스토리 상태 업데이트
        if (onHistoryStateChange) {
          setTimeout(() => {
            const canUndo = editor.can().chain().focus().undo().run();
            const canRedo = editor.can().chain().focus().redo().run();
            onHistoryStateChange(canUndo, canRedo);
          }, 0);
        }
      }
    }
  }, [content, editor, convertMarkdownToHtml, onHistoryStateChange]);

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
          {actualPlaceholder}
        </div>
      )}
    </div>
  );
});

export default EditorWrapper;