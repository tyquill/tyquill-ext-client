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
  const [retryCount, setRetryCount] = useState(0);

  // Fetch all scraps on mount (including PDFs)
  useEffect(() => {
    const fetchScraps = async () => {
      setIsLoadingScraps(true);
      setError(null);

      try {
        // Use v3 API without type filter to get both webclips and uploads (PDFs)
        const response = await scrapService.getScrapsV3({
          sortBy: 'updated_at',
          sortOrder: 'DESC',
        });
        setAllScraps(response.scraps);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : t('regenerateModal_loadScrapsFailed');
        console.error('Failed to fetch scraps:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoadingScraps(false);
      }
    };

    fetchScraps();
  }, [t, retryCount]);

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

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (error) {
    return (
      <div className={styles.sourcesSection}>
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className={styles.retryButton}
            disabled={isLoadingScraps}
          >
            {isLoadingScraps ? t('common_loading') : t('common_retry')}
          </button>
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
