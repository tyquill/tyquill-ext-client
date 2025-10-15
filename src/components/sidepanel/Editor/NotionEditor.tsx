import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { htmlToMarkdown, markdownToHtml } from '../../../utils/markdownConverter';
import { SlashCommand } from './extensions/SlashCommand';
import NotionBubbleMenu from './NotionBubbleMenu';
import styles from './NotionEditor.module.css';

interface NotionEditorProps {
  content: string | object;
  contentFormat?: 'markdown' | 'tiptap-json';
  onChange: (content: string | object, format: 'markdown' | 'tiptap-json') => void;
  placeholder?: string;
  readOnly?: boolean;
  onHistoryStateChange?: (canUndo: boolean, canRedo: boolean) => void;
}

const NotionEditor: React.FC<NotionEditorProps> = ({
  content,
  contentFormat = 'markdown',
  onChange,
  placeholder = "Write, press 'space' for AI, '/' for commands…",
  readOnly = false,
  onHistoryStateChange,
}) => {
  const isUpdatingRef = useRef(false);

  const convertContentForEditor = useCallback(
    (content: string | object, format: string): string | object => {
      if (!content) return '<p></p>';

      if (format === 'tiptap-json' && typeof content === 'object') {
        return content;
      }

      if (typeof content === 'string') {
        if (content.trim().startsWith('<')) {
          return content;
        }
        return markdownToHtml(content);
      }

      return '<p></p>';
    },
    []
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        horizontalRule: {
          HTMLAttributes: {
            class: 'notion-hr',
          },
        },
      }),
      TextStyle,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      SlashCommand,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: convertContentForEditor(content, contentFormat),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'notionEditor',
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;

      try {
        isUpdatingRef.current = true;

        const json = editor.getJSON();
        onChange(json, 'tiptap-json');

        if (onHistoryStateChange) {
          const canUndo = editor.can().chain().focus().undo().run();
          const canRedo = editor.can().chain().focus().redo().run();
          onHistoryStateChange(canUndo, canRedo);
        }
      } catch (error) {
        console.error('Error getting editor content:', error);
        try {
          const html = editor.getHTML();
          const markdown = htmlToMarkdown(html);
          onChange(markdown, 'markdown');
        } catch {
          const textContent = editor.getText().trim();
          onChange(textContent, 'markdown');
        }
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
  });

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
      const newContent = convertContentForEditor(content, contentFormat);

      const currentContent =
        contentFormat === 'tiptap-json'
          ? JSON.stringify(editor.getJSON())
          : editor.getHTML();
      const newContentStr =
        typeof newContent === 'object' ? JSON.stringify(newContent) : newContent;

      if (currentContent !== newContentStr) {
        editor.commands.setContent(newContent);

        if (onHistoryStateChange) {
          setTimeout(() => {
            const canUndo = editor.can().chain().focus().undo().run();
            const canRedo = editor.can().chain().focus().redo().run();
            onHistoryStateChange(canUndo, canRedo);
          }, 0);
        }
      }
    }
  }, [content, contentFormat, editor, convertContentForEditor, onHistoryStateChange]);

  if (!editor) {
    return <div className={styles.loading}>Loading editor...</div>;
  }

  return (
    <div className={styles.editorWrapper}>
      {!readOnly && <NotionBubbleMenu editor={editor} />}
      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
};

export default NotionEditor;
