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

// Validation constants
const MAX_FOLDER_NAME_LENGTH = 100;
const INVALID_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/g; // Filesystem unsafe characters

/**
 * Validates folder name
 * @returns error message if invalid, null if valid
 */
function validateFolderName(name: string): string | null {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return 'folder_name_required';
  }

  if (trimmedName.length > MAX_FOLDER_NAME_LENGTH) {
    return `Folder name must be ${MAX_FOLDER_NAME_LENGTH} characters or less`;
  }

  if (INVALID_CHARS_REGEX.test(trimmedName)) {
    return 'Folder name contains invalid characters (< > : " / \\ | ? *)';
  }

  return null;
}

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
    // Validate folder name
    const validationError = validateFolderName(name);
    if (validationError) {
      showError(t('common_error'), t(validationError as any) || validationError);
      return;
    }

    setIsCreating(true);
    try {
      await createFolder(name.trim(), color);
      showSuccess(t('folder_created'), t('folder_created_success'));
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('folder_create_failed');
      showError(t('common_error'), errorMessage);
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
              maxLength={MAX_FOLDER_NAME_LENGTH}
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
