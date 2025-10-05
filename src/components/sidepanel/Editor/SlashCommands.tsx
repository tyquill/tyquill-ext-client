import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  RiH1,
  RiH2,
  RiH3,
  RiListUnordered,
  RiListOrdered,
  RiCodeBoxLine,
  RiDoubleQuotesL,
  RiSubtractLine,
  RiText
} from 'react-icons/ri';
import styles from './SlashCommands.module.css';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: () => void;
}

interface SlashCommandsProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandsRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashCommands = forwardRef<SlashCommandsRef, SlashCommandsProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    return (
      <div className={styles.slashCommands}>
        {items.length > 0 ? (
          items.map((item, index) => (
            <button
              key={index}
              className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
              onClick={() => selectItem(index)}
            >
              <div className={styles.icon}>{item.icon}</div>
              <div className={styles.content}>
                <div className={styles.title}>{item.title}</div>
                <div className={styles.description}>{item.description}</div>
              </div>
            </button>
          ))
        ) : (
          <div className={styles.empty}>No results</div>
        )}
      </div>
    );
  }
);

SlashCommands.displayName = 'SlashCommands';

export function getSuggestionItems({ editor }: { editor: any }): SlashCommandItem[] {
  return [
    {
      title: 'Text',
      description: 'Just start typing with plain text.',
      icon: <RiText size={18} />,
      command: () => editor.chain().focus().clearNodes().run(),
    },
    {
      title: 'Heading 1',
      description: 'Big section heading.',
      icon: <RiH1 size={18} />,
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading.',
      icon: <RiH2 size={18} />,
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Heading 3',
      description: 'Small section heading.',
      icon: <RiH3 size={18} />,
      command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bullet list.',
      icon: <RiListUnordered size={18} />,
      command: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Numbered List',
      description: 'Create a list with numbering.',
      icon: <RiListOrdered size={18} />,
      command: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: 'Quote',
      description: 'Capture a quote.',
      icon: <RiDoubleQuotesL size={18} />,
      command: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Code Block',
      description: 'Display code with syntax highlighting.',
      icon: <RiCodeBoxLine size={18} />,
      command: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: 'Divider',
      description: 'Visually divide blocks.',
      icon: <RiSubtractLine size={18} />,
      command: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];
}
