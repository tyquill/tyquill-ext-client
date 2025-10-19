import React, { useState, useRef, useEffect } from 'react';
import { IoAdd } from 'react-icons/io5';
import styles from '../../../sidepanel_unused/pages/PageStyles.module.css';

interface TagAddButtonProps {
  onAddTag: (tagName: string) => Promise<void>;
  className?: string;
}

export const TagAddButton: React.FC<TagAddButtonProps> = ({
  onAddTag,
  className = ''
}) => {
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [tagValue, setTagValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when visible
  useEffect(() => {
    if (isInputVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputVisible]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsInputVisible(false);
        setTagValue('');
      }
    };

    if (isInputVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isInputVisible]);

  const handleSubmit = async () => {
    const trimmedTag = tagValue.trim();
    if (!trimmedTag || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddTag(trimmedTag);
      setTagValue('');
      setIsInputVisible(false);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Failed to add tag:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsInputVisible(false);
      setTagValue('');
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsInputVisible(!isInputVisible);
  };

  return (
    <div
      className={className}
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        className={styles.addTagButton}
        onClick={handleButtonClick}
        aria-label="Add tag"
        title="Add tag"
      >
        <IoAdd size={14} />
      </button>

      {isInputVisible && (
        <div
          className={styles.tagInputTooltip}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="text"
            className={styles.tagInput}
            placeholder="Tag name"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            maxLength={30}
          />
          <button
            className={styles.tagSubmitButton}
            onClick={handleSubmit}
            disabled={!tagValue.trim() || isSubmitting}
          >
            {isSubmitting ? '...' : 'Add'}
          </button>
        </div>
      )}
    </div>
  );
};
