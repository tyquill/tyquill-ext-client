import React, { useState, useEffect } from 'react';
import { IoAdd, IoSparkles, IoClose, IoTrash } from 'react-icons/io5';
import NotionAvatar, { AvatarConfig } from 'react-notion-avatar';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './WritingStyleSelection.module.css';
import { writingStyleService, WritingStyle } from '../../../services/writingStyleService';
import { useI18n } from '../../../hooks/useI18n';
import { useToastHelpers } from '../../../hooks/useToast';
import { trackArticleStyleSelectedBridge } from '../../../analytics/bridge';
import { PageType } from '../../../types/pages';
import StyleManagementPage from '../../../sidepanel_unused/pages/StyleManagementPage';

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
  const { showError, showSuccess } = useToastHelpers();
  const [writingStyles, setWritingStyles] = useState<WritingStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStyleManagement, setShowStyleManagement] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    show: boolean;
    styleId: number | null;
    styleName: string;
  }>({
    show: false,
    styleId: null,
    styleName: ''
  });

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
    setShowStyleManagement(true);
  };

  const handleCloseModal = async () => {
    setShowStyleManagement(false);
    // Refresh the styles list after closing the modal
    try {
      const styles = await writingStyleService.getWritingStyles();
      setWritingStyles(styles);
    } catch (error) {
      console.error('Failed to refresh writing styles:', error);
    }
  };

  const handleDeleteStyle = async (styleId: number, styleName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent avatar click/selection

    // Show confirmation modal instead of window.confirm
    setDeleteConfirmModal({
      show: true,
      styleId,
      styleName
    });
  };

  const confirmDeleteStyle = async () => {
    const { styleId, styleName } = deleteConfirmModal;
    if (!styleId) return;

    try {
      setDeletingIds(prev => new Set(prev).add(styleId));
      await writingStyleService.deleteWritingStyle(styleId);

      // Update local state
      setWritingStyles(prev => prev.filter(s => s.id !== styleId));

      // Note: Don't call onStyleSelected here to avoid page navigation
      // The parent component will handle the invalid selectedStyleId gracefully

      showSuccess(t('stylePage_styleDeleteSuccess'));
    } catch (error) {
      console.error('Failed to delete style:', error);
      showError(t('stylePage_styleDeleteError'));
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(styleId);
        return next;
      });
      // Close modal
      setDeleteConfirmModal({ show: false, styleId: null, styleName: '' });
    }
  };

  const cancelDeleteStyle = () => {
    setDeleteConfirmModal({ show: false, styleId: null, styleName: '' });
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
            const isDeleting = deletingIds.has(style.id);

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

                  {/* Delete Button */}
                  <button
                    className={`${styles.avatarDeleteButton} ${isDeleting ? styles.deleting : ''}`}
                    onClick={(e) => handleDeleteStyle(style.id, style.name, e)}
                    disabled={isDeleting}
                    aria-label={`Delete ${style.name}`}
                    type="button"
                  >
                    {isDeleting ? (
                      <div className={styles.deleteSpinner} />
                    ) : (
                      <IoTrash size={12} />
                    )}
                  </button>
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

      {/* Style Management Modal */}
      <AnimatePresence>
        {showStyleManagement && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ y: '100%', opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                transition: {
                  type: 'spring',
                  damping: 25,
                  stiffness: 300
                }
              }}
              exit={{
                y: '100%',
                opacity: 0,
                transition: {
                  duration: 0.2
                }
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 300 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 150) {
                  handleCloseModal();
                }
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.dragHandleContainer}>
                <div className={styles.dragHandle} />
                <button
                  className={styles.modalCloseButton}
                  onClick={handleCloseModal}
                  aria-label="Close"
                >
                  <IoClose size={16} />
                </button>
              </div>
              <StyleManagementPage onClose={handleCloseModal} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmModal.show && (
          <motion.div
            className={styles.deleteConfirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelDeleteStyle}
          >
            <motion.div
              className={styles.deleteConfirmModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.deleteConfirmHeader}>
                <h3 className={styles.deleteConfirmTitle}>
                  {t('common_delete')}
                </h3>
              </div>

              <div className={styles.deleteConfirmContent}>
                <p className={styles.deleteConfirmMessage}>
                  {t('stylePage_confirmDelete')}
                </p>
                <p className={styles.deleteConfirmStyleName}>
                  "{deleteConfirmModal.styleName}"
                </p>
              </div>

              <div className={styles.deleteConfirmActions}>
                <button
                  className={styles.deleteConfirmCancelButton}
                  onClick={cancelDeleteStyle}
                >
                  {t('common_cancel')}
                </button>
                <button
                  className={styles.deleteConfirmDeleteButton}
                  onClick={confirmDeleteStyle}
                >
                  {t('common_delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WritingStyleSelection;