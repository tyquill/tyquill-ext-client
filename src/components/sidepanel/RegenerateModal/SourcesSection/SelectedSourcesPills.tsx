import React from 'react';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { ScrapResponse } from '../../../../services/scrapService';
import SourcePill from './SourcePill';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './SourcesSection.module.css';

interface SelectedSourcesPillsProps {
  selectedScraps: ScrapResponse[];
  onRemove: (scrapId: string) => void; // UUID
  disabled?: boolean;
}

const SelectedSourcesPills: React.FC<SelectedSourcesPillsProps> = ({
  selectedScraps,
  onRemove,
  disabled,
}) => {
  const { t } = useI18n();

  if (selectedScraps.length === 0) {
    return (
      <div className={styles.selectedPillsEmpty}>
        <IoDocumentTextOutline size={24} />
        <p className={styles.emptyMessage}>
          {t('regenerateModal_noSourcesSelected')}
        </p>
        <p className={styles.emptyHint}>
          {t('regenerateModal_selectSourcesHint')}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.selectedPillsContainer} role="list" aria-label="Selected sources">
      {selectedScraps.map((scrap) => (
        <SourcePill
          key={scrap.scrapId}
          scrap={scrap}
          onRemove={onRemove}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default SelectedSourcesPills;
