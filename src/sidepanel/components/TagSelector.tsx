import React, { useState, useRef, useEffect } from 'react';
import { IoChevronDown, IoChevronUp, IoClose } from 'react-icons/io5';
import styles from './TagSelector.module.css';

interface TagSelectorProps {
  availableTags: string[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onTagRemove: (tag: string) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags,
  selectedTags,
  onTagSelect,
  onTagRemove
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleTagSelect = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onTagSelect(tag);
  };

  const handleTagRemove = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onTagRemove(tag);
  };

  const toggleDropdown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDropdownOpen(prev => !prev);
  };

  return (
    <div className={styles.tagFilterContainer}>
      <button
        className={styles.tagFilterButton}
        onClick={toggleDropdown}
        ref={dropdownRef}
        tabIndex={-1}
      >
        태그 선택
        {isDropdownOpen ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}
      </button>
      
      <div className={`${styles.tagFilterDropdown} ${isDropdownOpen ? styles.visible : ''}`}>
        {availableTags.map(tag => (
          <div
            key={tag}
            className={`${styles.tagOption} ${selectedTags.includes(tag) ? styles.selected : ''}`}
            onClick={(e) => handleTagSelect(tag, e)}
          >
            {tag}
          </div>
        ))}
      </div>
      
      {selectedTags.length > 0 && (
        <div className={styles.selectedTags}>
          {selectedTags.map(tag => (
            <span key={tag} className={styles.selectedTag}>
              #{tag}
              <button onClick={(e) => handleTagRemove(tag, e)}>
                <IoClose size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}; 