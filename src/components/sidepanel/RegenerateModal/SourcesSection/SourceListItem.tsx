import React from 'react';
import { IoAdd, IoDocumentTextOutline } from 'react-icons/io5';
import { ScrapResponse } from '../../../../services/scrapService';
import { useI18n } from '../../../../hooks/useI18n';
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

  const getFaviconUrl = () => {
    if (scrap.webpage?.site?.favicon_url) {
      return scrap.webpage.site.favicon_url;
    }
    if (scrap.faviconUrl) {
      return scrap.faviconUrl;
    }
    return null;
  };

  const getDomain = () => {
    if (scrap.webpage?.site?.host) {
      return scrap.webpage.site.host;
    }
    try {
      const url = new URL(scrap.url);
      return url.hostname;
    } catch {
      return '';
    }
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}${t('articleGenerate_minutes')} ${t('common_ago')}`;
    }
    if (diffHours < 24) {
      return `${diffHours}${t('common_hoursAgo')}`;
    }
    if (diffDays < 7) {
      return `${diffDays}${t('common_daysAgo')}`;
    }
    return date.toLocaleDateString();
  };

  const faviconUrl = getFaviconUrl();
  const domain = getDomain();

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
          {scrap.createdAt && (
            <>
              <span>•</span>
              <span className={styles.sourceDate}>{getRelativeDate(scrap.createdAt)}</span>
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
