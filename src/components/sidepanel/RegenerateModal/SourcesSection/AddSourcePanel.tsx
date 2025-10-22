import React, { useState, useMemo } from 'react';
import { IoClose, IoSearch } from 'react-icons/io5';
import { ScrapResponse } from '../../../../services/scrapService';
import { useI18n } from '../../../../hooks/useI18n';
import SourceListItem from './SourceListItem';
import styles from './SourcesSection.module.css';

interface AddSourcePanelProps {
  allScraps: ScrapResponse[];
  selectedScrapIds: number[];
  onToggleSource: (scrapId: number) => void;
  onClose: () => void;
  disabled?: boolean;
}

const AddSourcePanel: React.FC<AddSourcePanelProps> = ({
  allScraps,
  selectedScrapIds,
  onToggleSource,
  onClose,
  disabled,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');

  // Debounced search (using useMemo for simple case)
  const filteredScraps = useMemo(() => {
    if (!searchQuery.trim()) {
      return allScraps;
    }

    const query = searchQuery.toLowerCase();
    return allScraps.filter((scrap) => {
      // Search in title
      if (scrap.title?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in URL
      if (scrap.url?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in user comment
      if (scrap.userComment?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in tags
      if (scrap.tags?.some((tag) => tag.name?.toLowerCase().includes(query))) {
        return true;
      }

      return false;
    });
  }, [allScraps, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={styles.addSourcePanel} role="region" aria-label="Add source panel">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{t('regenerateModal_availableSources')}</span>
        <button
          type="button"
          className={styles.panelCloseButton}
          onClick={onClose}
          disabled={disabled}
          aria-label={t('common_close')}
        >
          <IoClose size={16} />
        </button>
      </div>

      <div className={styles.searchInputWrapper}>
        <IoSearch size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={t('regenerateModal_searchSources')}
          disabled={disabled}
          aria-label="Search sources"
        />
      </div>

      <div className={styles.availableSourcesList} role="list">
        {filteredScraps.length === 0 ? (
          <div className={styles.emptyState} role="status">
            {searchQuery.trim()
              ? t('regenerateModal_noSearchResults')
              : t('regenerateModal_noAvailableSources')}
          </div>
        ) : (
          filteredScraps.map((scrap) => (
            <SourceListItem
              key={scrap.scrapId}
              scrap={scrap}
              isSelected={selectedScrapIds.includes(scrap.scrapId)}
              onToggle={onToggleSource}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AddSourcePanel;
