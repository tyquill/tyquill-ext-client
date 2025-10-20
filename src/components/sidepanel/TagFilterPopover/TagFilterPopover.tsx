/**
 * TagFilterPopover Component
 *
 * @description Popover that displays available tags with checkboxes for filtering
 */

import React, { useState, useEffect, useMemo } from 'react';
import { IoClose, IoSearch } from 'react-icons/io5';
import { useI18n } from '../../../hooks/useI18n';
import { useContentStore } from '../../../stores/contentStore';
import styles from './TagFilterPopover.module.css';

interface TagFilterPopoverProps {
  buttonRef: React.RefObject<HTMLButtonElement>;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClose: () => void;
}

interface TagOption {
  name: string;
  count: number;
}

const TagFilterPopover: React.FC<TagFilterPopoverProps> = ({
  buttonRef,
  selectedTags,
  onTagsChange,
  onClose,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const items = useContentStore((state) => state.items);

  // Calculate position based on button
  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [buttonRef]);

  // Extract unique tags from content items with counts
  const availableTags = useMemo(() => {
    const tagMap = new Map<string, number>();

    items.forEach((item) => {
      const tags = item.type === 'SCRAP' ? item.data.tags : [];
      if (tags && Array.isArray(tags)) {
        tags.forEach((tag) => {
          const tagName = typeof tag === 'string' ? tag : tag.name;
          if (tagName) {
            tagMap.set(tagName, (tagMap.get(tagName) || 0) + 1);
          }
        });
      }
    });

    const tagOptions: TagOption[] = Array.from(tagMap.entries()).map(
      ([name, count]) => ({ name, count })
    );

    // Sort by count (descending) then by name
    tagOptions.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });

    return tagOptions;
  }, [items]);

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableTags;
    }
    const query = searchQuery.toLowerCase();
    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(query)
    );
  }, [availableTags, searchQuery]);

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div
      className={styles.popover}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      data-tag-filter-popover
    >
      <div className={styles.header}>
        <div className={styles.searchBox}>
          <IoSearch size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('search_tags')}
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
        </div>
        <button
          className={styles.closeButton}
          onClick={onClose}
          type="button"
          aria-label={t('close')}
        >
          <IoClose size={20} />
        </button>
      </div>

      <div className={styles.tagList}>
        {filteredTags.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? t('no_tags_found') : t('no_tags_available')}
          </div>
        ) : (
          filteredTags.map((tag) => (
            <label key={tag.name} className={styles.tagItem}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selectedTags.includes(tag.name)}
                onChange={() => handleTagToggle(tag.name)}
              />
              <span className={styles.tagName}>{tag.name}</span>
              <span className={styles.tagCount}>({tag.count})</span>
            </label>
          ))
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className={styles.footer}>
          <button
            className={styles.clearButton}
            onClick={handleClearAll}
            type="button"
          >
            {t('clear_all')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TagFilterPopover;
