/**
 * TagFilterButton Component
 *
 * @description Button component that opens a popover to filter content by tags
 */

import React, { useState, useRef, useEffect } from 'react';
import { IoMdPricetag } from 'react-icons/io';
import { useI18n } from '../../../hooks/useI18n';
import TagFilterPopover from '../TagFilterPopover/TagFilterPopover';
import styles from './TagFilterButton.module.css';

interface TagFilterButtonProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

const TagFilterButton: React.FC<TagFilterButtonProps> = ({
  selectedTags,
  onTagsChange,
  className = '',
}) => {
  const { t } = useI18n();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        const popover = document.querySelector('[data-tag-filter-popover]');
        if (popover && !popover.contains(event.target as Node)) {
          setIsPopoverOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopoverOpen]);

  const handleButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleTagsChange = (tags: string[]) => {
    onTagsChange(tags);
  };

  const handleClose = () => {
    setIsPopoverOpen(false);
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <button
        ref={buttonRef}
        className={`${styles.button} ${selectedTags.length > 0 ? styles.active : ''}`}
        onClick={handleButtonClick}
        type="button"
        aria-label={t('filter_by_tags')}
        aria-expanded={isPopoverOpen}
      >
        <IoMdPricetag size={16} />
        <span className={styles.buttonText}>{t('tags')}</span>
        {selectedTags.length > 0 && (
          <span className={styles.badge}>{selectedTags.length}</span>
        )}
      </button>

      {isPopoverOpen && (
        <TagFilterPopover
          buttonRef={buttonRef}
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default TagFilterButton;
