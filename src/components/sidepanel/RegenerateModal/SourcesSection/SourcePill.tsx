import React, { useState } from 'react';
import { IoClose, IoDocumentTextOutline } from 'react-icons/io5';
import { ScrapResponse } from '../../../../services/scrapService';
import styles from './SourcesSection.module.css';

interface SourcePillProps {
  scrap: ScrapResponse;
  onRemove: (scrapId: number) => void;
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

  const getFaviconUrl = () => {
    if (scrap.webpage?.site?.favicon_url) {
      return scrap.webpage.site.favicon_url;
    }
    if (scrap.faviconUrl) {
      return scrap.faviconUrl;
    }
    return null;
  };

  const faviconUrl = getFaviconUrl();

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
