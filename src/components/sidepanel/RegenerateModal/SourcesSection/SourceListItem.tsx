import React, { useMemo } from 'react';
import { IoAdd, IoDocumentTextOutline } from 'react-icons/io5';
import { ScrapResponse } from '../../../../services/scrapService';
import { useI18n } from '../../../../hooks/useI18n';
import { getScrapFaviconUrl, getScrapDomain, formatRelativeTime } from '../../../../utils/scrapHelpers';
import styles from './SourcesSection.module.css';

interface SourceListItemProps {
  scrap: ScrapResponse;
  isSelected: boolean;
  onToggle: (scrapId: number) => void;
  disabled?: boolean;
}

const SourceListItem: React.FC<SourceListItemProps> = ({
  scrap,
  isSelected,
  onToggle,
  disabled,
}) => {
  const { t } = useI18n();

  // Memoize computed values to avoid recalculation on every render
  const faviconUrl = useMemo(() => getScrapFaviconUrl(scrap), [scrap]);
  const domain = useMemo(() => getScrapDomain(scrap), [scrap]);
  const relativeDate = useMemo(
    () => scrap.createdAt ? formatRelativeTime(scrap.createdAt, t) : null,
    [scrap.createdAt, t]
  );

  const handleClick = () => {
    if (!disabled) {
      onToggle(scrap.scrapId);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && !isSelected) {
      onToggle(scrap.scrapId);
    }
  };

  return (
    <div
      className={`${styles.sourceListItem} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} source: ${scrap.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.selectCircle} aria-hidden="true" />

      <div className={styles.sourceInfo}>
        <div className={styles.sourceTitle}>{scrap.title || t('regenerateModal_untitled')}</div>

        <div className={styles.sourceMetadata}>
          {domain && (
            <div className={styles.sourceDomain}>
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt=""
                  className={styles.sourceFavicon}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <IoDocumentTextOutline size={12} />
              )}
              <span>{domain}</span>
            </div>
          )}
          {relativeDate && (
            <>
              <span>•</span>
              <span className={styles.sourceDate}>{relativeDate}</span>
            </>
          )}
        </div>

        {scrap.userComment && (
          <div className={styles.sourceComment}>"{scrap.userComment}"</div>
        )}
      </div>

      {!isSelected && (
        <button
          type="button"
          className={styles.quickAddButton}
          onClick={handleQuickAdd}
          disabled={disabled}
          aria-label="Quick add source"
        >
          <IoAdd size={12} />
          {t('regenerateModal_addSource')}
        </button>
      )}
    </div>
  );
};

export default SourceListItem;
