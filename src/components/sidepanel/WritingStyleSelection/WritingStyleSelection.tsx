import React, { useState, useEffect } from 'react';
import { IoAdd, IoSparkles } from 'react-icons/io5';
import NotionAvatar, { AvatarConfig } from 'react-notion-avatar';
import styles from './WritingStyleSelection.module.css';
import { writingStyleService, WritingStyle } from '../../../services/writingStyleService';
import { useI18n } from '../../../hooks/useI18n';
import { useToastHelpers } from '../../../hooks/useToast';
import { trackArticleStyleSelectedBridge } from '../../../analytics/bridge';
import { PageType } from '../../../types/pages';

interface WritingStyleSelectionProps {
  onStyleSelected: (styleId: number | null) => void;
  onNavigate: (page: PageType) => void;
  selectedStyleId?: number | null;
}

// Generate deterministic avatar config from name
const getAvatarConfig = (name: string, index: number): AvatarConfig => {
  // Use name and index to generate consistent avatar
  // Create a simple hash from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use hash and index to generate consistent values
  const seed = Math.abs(hash + index);

  return {
    face: seed % 10,
    eye: (seed >> 2) % 10,
    eyebrow: (seed >> 4) % 10,
    glass: (seed >> 6) % 10,
    hair: (seed >> 8) % 25,
    mouth: (seed >> 10) % 10,
    nose: (seed >> 12) % 10,
    accessory: 0, // No accessories for simplicity
    beard: 0, // No beard for simplicity
    detail: 0 // No detail for simplicity
  };
};

const WritingStyleSelection: React.FC<WritingStyleSelectionProps> = ({
  onStyleSelected,
  onNavigate,
  selectedStyleId
}) => {
  const { t } = useI18n();
  const { showError } = useToastHelpers();
  const [writingStyles, setWritingStyles] = useState<WritingStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        setIsLoading(true);
        const styles = await writingStyleService.getWritingStyles();
        setWritingStyles(styles);
      } catch (error) {
        console.error('Failed to fetch writing styles:', error);
        showError(t('articleGenerate_failedToLoadStyles'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchStyles();
  }, []);

  const handleStyleClick = async (styleId: number | null, styleName: string) => {
    try {
      await trackArticleStyleSelectedBridge({
        style_id: styleId,
        style_name: styleName
      });
    } catch {}

    onStyleSelected(styleId);
  };

  const handleAddNewStyle = () => {
    onNavigate('style-management');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('writingStyleSelection_title')}</h2>
        <p className={styles.subtitle}>{t('writingStyleSelection_subtitle')}</p>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
        </div>
      ) : (
        <>
        <div className={styles.avatarGrid}>
          {/* 기본 문체 아바타 */}
          <div className={styles.avatarItem}>
            <div
              className={`${styles.avatarWrapper} ${selectedStyleId === null ? styles.selected : ''}`}
              onClick={() => handleStyleClick(null, 'default')}
              title={t('articleGenerate_defaultNewsletterStyle')}
            >
              <div className={styles.customAvatar}>
                <NotionAvatar
                  config={{
                    face: 0,
                    eye: 0,
                    eyebrow: 0,
                    glass: 0,
                    hair: 0,
                    mouth: 0,
                    nose: 0,
                    accessory: 0,
                    beard: 0,
                    detail: 0
                  }}
                  shape="circle"
                />
              </div>
              {selectedStyleId === null && (
                <div className={styles.selectedIndicator}>
                  <IoSparkles size={14} />
                </div>
              )}
            </div>
            <span className={styles.avatarLabel}>
              {t('articleGenerate_defaultNewsletterStyle')}
            </span>
          </div>

          {/* 사용자 정의 문체 아바타들 */}
          {writingStyles.map((style, index) => {
            const avatarConfig = getAvatarConfig(style.name, index);
            return (
              <div key={style.id} className={styles.avatarItem}>
                <div
                  className={`${styles.avatarWrapper} ${selectedStyleId === style.id ? styles.selected : ''}`}
                  onClick={() => handleStyleClick(style.id, style.name)}
                  title={style.name}
                >
                  <div className={styles.customAvatar}>
                    <NotionAvatar config={avatarConfig} shape="circle" />
                  </div>
                  {selectedStyleId === style.id && (
                    <div className={styles.selectedIndicator}>
                      <IoSparkles size={14} />
                    </div>
                  )}
                </div>
                <span className={styles.avatarLabel}>{style.name}</span>
              </div>
            );
          })}
        </div>

        {/* 새 문체 추가 버튼 - 그리드 밖에 별도 배치 */}
        <button
          className={styles.addNewStyleButton}
          onClick={handleAddNewStyle}
          title={t('writingStyleSelection_addNew')}
        >
          <IoAdd size={20} />
          <span>{t('writingStyleSelection_addNew')}</span>
        </button>
        </>
      )}
    </div>
  );
};

export default WritingStyleSelection;