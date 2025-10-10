import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  RiBold,
  RiItalic,
  RiUnderline,
  RiStrikethrough,
  RiCodeLine,
  RiH1,
  RiH2,
  RiH3,
} from 'react-icons/ri';
import styles from './NotionBubbleMenu.module.css';

interface NotionBubbleMenuProps {
  editor: Editor;
}

const NotionBubbleMenu: React.FC<NotionBubbleMenuProps> = ({ editor }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    const { selection } = editor.state;
    const { from, to } = selection;

    // Hide if no selection
    if (from === to) {
      setIsVisible(false);
      return;
    }

    // Get selection coordinates
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);

    const menuElement = menuRef.current;
    const menuWidth = menuElement ? menuElement.offsetWidth : 200;
    const menuHeight = menuElement ? menuElement.offsetHeight : 40;

    // Center horizontally
    let left = (start.left + end.left) / 2;

    // Position above selection
    let top = start.top - menuHeight - 8;

    // Boundary checks
    if (left - menuWidth / 2 < 10) {
      left = menuWidth / 2 + 10;
    } else if (left + menuWidth / 2 > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth / 2 - 10;
    }

    if (top < 10) {
      top = end.bottom + 8;
    }

    setPosition({ top, left });
    setIsVisible(true);
  }, [editor]);

  useEffect(() => {
    const handleSelectionUpdate = () => {
      setTimeout(calculatePosition, 0);
    };

    if (editor) {
      editor.on('selectionUpdate', handleSelectionUpdate);
      editor.on('transaction', handleSelectionUpdate);

      return () => {
        editor.off('selectionUpdate', handleSelectionUpdate);
        editor.off('transaction', handleSelectionUpdate);
      };
    }
  }, [editor, calculatePosition]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  if (!isVisible || !editor) return null;

  return (
    <div
      ref={menuRef}
      className={styles.bubbleMenu}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 10000,
      }}
    >
      <div className={styles.menuGroup}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? styles.isActive : ''}
          title="Bold (⌘B)"
        >
          <RiBold size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? styles.isActive : ''}
          title="Italic (⌘I)"
        >
          <RiItalic size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? styles.isActive : ''}
          title="Underline (⌘U)"
        >
          <RiUnderline size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? styles.isActive : ''}
          title="Strikethrough (⌘⇧X)"
        >
          <RiStrikethrough size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? styles.isActive : ''}
          title="Code (⌘E)"
        >
          <RiCodeLine size={16} />
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.menuGroup}>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? styles.isActive : ''}
          title="Heading 1"
        >
          <RiH1 size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? styles.isActive : ''}
          title="Heading 2"
        >
          <RiH2 size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? styles.isActive : ''}
          title="Heading 3"
        >
          <RiH3 size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotionBubbleMenu;
