import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { useContentStore } from '../../../stores/contentStore';
import { useI18n } from '../../../hooks/useI18n';
import { useToastHelpers } from '../../../hooks/useToast';
import styles from './CreateFolderModal.module.css';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#888888', // gray
];

export const CreateFolderModal: React.FC = () => {
  const { t } = useI18n();
  const { showSuccess, showError } = useToastHelpers();
  const { isCreateFolderModalOpen, closeCreateFolderModal, createFolder } = useContentStore();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[4]); // Default to blue
  const [isCreating, setIsCreating] = useState(false);

  const handleClose = () => {
    setName('');
    setColor(PRESET_COLORS[4]);
    closeCreateFolderModal();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showError(t('common_error'), t('folder_name_required'));
      return;
    }

    setIsCreating(true);
    try {
      await createFolder(name.trim(), color);
      showSuccess(t('folder_created'), t('folder_created_success'));
      handleClose();
    } catch (error: any) {
      showError(t('common_error'), error.message || t('folder_create_failed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isCreateFolderModalOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('folder_create')}</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label={t('common_close')}>
            <IoClose size={24} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('folder_name')}</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('folder_name_placeholder')}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t('folder_color')}</label>
            <div className={styles.colorPicker}>
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className={`${styles.colorButton} ${color === presetColor ? styles.selected : ''}`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                  aria-label={`Select color ${presetColor}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={handleClose} disabled={isCreating}>
            {t('common_cancel')}
          </button>
          <button
            className={styles.createButton}
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? t('folder_creating') : t('folder_create')}
          </button>
        </div>
      </div>
    </div>
  );
};
