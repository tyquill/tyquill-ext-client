import React, { useState, useMemo } from 'react';
import { IoClose, IoSearch } from 'react-icons/io5';
import { ScrapResponse } from '../../../../services/scrapService';
import { useI18n } from '../../../../hooks/useI18n';
import { useDebounce } from '../../../../hooks/useDebounce';
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
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Optimized search with debounced query
  const filteredScraps = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return allScraps;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return allScraps.filter((scrap) => {
      // Combine all searchable fields into one string for efficiency
      const searchableText = [
        scrap.title,
        scrap.url,
        scrap.userComment,
        scrap.tags?.map(t => t.name).join(' ')
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(query);
    });
  }, [allScraps, debouncedSearchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
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
        {searchQuery && (
          <button
            type="button"
            className={styles.clearSearchButton}
            onClick={handleClearSearch}
            disabled={disabled}
            aria-label="Clear search"
          >
            <IoClose size={14} />
          </button>
        )}
      </div>

      {debouncedSearchQuery && (
        <div className={styles.searchResults}>
          {filteredScraps.length} {t('archiveDetailPage_itemsCount')}
        </div>
      )}

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
