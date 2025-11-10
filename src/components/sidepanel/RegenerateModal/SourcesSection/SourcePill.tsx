import React, { useState, useMemo } from 'react';
import { IoClose, IoDocumentTextOutline } from 'react-icons/io5';
import { ScrapResponse } from '../../../../services/scrapService';
import { getScrapFaviconUrl } from '../../../../utils/scrapHelpers';
import styles from './SourcesSection.module.css';

interface SourcePillProps {
  scrap: ScrapResponse;
  onRemove: (scrapId: string) => void; // UUID
  disabled?: boolean;
}

const SourcePill: React.FC<SourcePillProps> = ({ scrap, onRemove, disabled }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    if (disabled || isRemoving) return;

    setIsRemoving(true);
    // Wait for animation to complete before actually removing
    setTimeout(() => {
      onRemove(scrap.scrapId);
    }, 150);
  };

  // Memoize favicon URL computation
  const faviconUrl = useMemo(() => getScrapFaviconUrl(scrap), [scrap]);

  return (
    <div className={`${styles.sourcePill} ${isRemoving ? styles.removing : ''}`}>
      <div className={styles.pillIcon}>
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <IoDocumentTextOutline size={14} color="rgba(55, 53, 47, 0.5)" />
        )}
      </div>
      <span className={styles.pillTitle} title={scrap.title}>
        {scrap.title || 'Untitled'}
      </span>
      <button
        type="button"
        className={styles.pillRemoveButton}
        onClick={handleRemove}
        disabled={disabled || isRemoving}
        aria-label="Remove source"
      >
        <IoClose size={14} />
      </button>
    </div>
  );
};

export default SourcePill;
