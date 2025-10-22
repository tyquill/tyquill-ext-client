import React, { useState, useEffect, useCallback } from 'react';
import { IoAdd } from 'react-icons/io5';
import { scrapService, ScrapResponse } from '../../../../services/scrapService';
import { useI18n } from '../../../../hooks/useI18n';
import SelectedSourcesPills from './SelectedSourcesPills';
import AddSourcePanel from './AddSourcePanel';
import styles from './SourcesSection.module.css';

interface SourcesSectionProps {
  selectedScrapIds: number[];
  onSelectionChange: (scrapIds: number[]) => void;
  disabled?: boolean;
}

const SourcesSection: React.FC<SourcesSectionProps> = ({
  selectedScrapIds,
  onSelectionChange,
  disabled,
}) => {
  const { t } = useI18n();
  const [allScraps, setAllScraps] = useState<ScrapResponse[]>([]);
  const [isLoadingScraps, setIsLoadingScraps] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all scraps on mount
  useEffect(() => {
    const fetchScraps = async () => {
      setIsLoadingScraps(true);
      setError(null);

      try {
        const scraps = await scrapService.getScraps();
        setAllScraps(scraps);
      } catch (err) {
        console.error('Failed to fetch scraps:', err);
        setError(t('regenerateModal_loadScrapsFailed'));
      } finally {
        setIsLoadingScraps(false);
      }
    };

    fetchScraps();
  }, [t]);

  // Get selected scraps for display
  const selectedScraps = allScraps.filter((scrap) =>
    selectedScrapIds.includes(scrap.scrapId)
  );

  const handleRemoveSource = useCallback(
    (scrapId: number) => {
      const newSelection = selectedScrapIds.filter((id) => id !== scrapId);
      onSelectionChange(newSelection);
    },
    [selectedScrapIds, onSelectionChange]
  );

  const handleToggleSource = useCallback(
    (scrapId: number) => {
      const isSelected = selectedScrapIds.includes(scrapId);
      const newSelection = isSelected
        ? selectedScrapIds.filter((id) => id !== scrapId)
        : [...selectedScrapIds, scrapId];
      onSelectionChange(newSelection);
    },
    [selectedScrapIds, onSelectionChange]
  );

  const handleOpenPanel = () => {
    if (!disabled) {
      setIsPanelOpen(true);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  if (error) {
    return (
      <div className={styles.sourcesSection}>
        <div className={styles.emptyState} role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sourcesSection}>
      {/* Selected Sources Pills */}
      <SelectedSourcesPills
        selectedScraps={selectedScraps}
        onRemove={handleRemoveSource}
        disabled={disabled}
      />

      {/* Add Source Button */}
      <button
        type="button"
        className={styles.addSourceButton}
        onClick={handleOpenPanel}
        disabled={disabled || isLoadingScraps}
        aria-expanded={isPanelOpen}
        aria-controls="add-source-panel"
      >
        <IoAdd size={16} />
        {t('regenerateModal_addSourceButton')}
      </button>

      {/* Add Source Panel (expandable) */}
      {isPanelOpen && (
        <AddSourcePanel
          allScraps={allScraps}
          selectedScrapIds={selectedScrapIds}
          onToggleSource={handleToggleSource}
          onClose={handleClosePanel}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default SourcesSection;
