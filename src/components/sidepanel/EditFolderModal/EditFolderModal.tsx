import React, { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { FolderResponse } from '../../../services/folderService';
import { FOLDER_ICON_OPTIONS, type FolderIconOption } from '../../../lib/folder-icons';
import { useI18n } from '../../../hooks/useI18n';
import { useToastHelpers } from '../../../hooks/useToast';
import styles from './EditFolderModal.module.css';

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
const INVALID_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/g;

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

interface EditFolderModalProps {
  isOpen: boolean;
  folder: FolderResponse | null;
  onClose: () => void;
  onSubmit: (folderId: number, name: string, color: string, icon: string) => Promise<void>;
}

export const EditFolderModal: React.FC<EditFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();
  const { showSuccess, showError } = useToastHelpers();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[4]); // Default to blue
  const [selectedIcon, setSelectedIcon] = useState<FolderIconOption>(FOLDER_ICON_OPTIONS[0]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update form when folder changes
  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setColor(folder.color || PRESET_COLORS[4]);

      const iconOption = FOLDER_ICON_OPTIONS.find((opt) => opt.id === folder.icon);
      if (iconOption) {
        setSelectedIcon(iconOption);
      } else {
        setSelectedIcon(FOLDER_ICON_OPTIONS[0]);
      }
    }
  }, [folder]);

  const handleClose = () => {
    onClose();
  };

  const handleUpdate = async () => {
    if (!folder) return;

    // Validate folder name
    const validationError = validateFolderName(name);
    if (validationError) {
      showError(t('common_error'), t(validationError as any) || validationError);
      return;
    }

    setIsUpdating(true);
    try {
      await onSubmit(folder.folderId, name.trim(), color, selectedIcon.id);
      showSuccess(t('folder_updated'), t('folder_updated_success'));
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('folder_update_failed');
      showError(t('common_error'), errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isUpdating) {
      handleUpdate();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen || !folder) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('folder_edit')}</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label={t('common_close')}>
            <IoClose size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Folder Name */}
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

          {/* Icon Selection */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('folder_icon')}</label>
            <div className={styles.iconGrid}>
              {FOLDER_ICON_OPTIONS.map((iconOption) => {
                const IconComponent = iconOption.icon;
                const isSelected = selectedIcon.id === iconOption.id;

                return (
                  <button
                    key={iconOption.id}
                    type="button"
                    onClick={() => setSelectedIcon(iconOption)}
                    className={`${styles.iconButton} ${isSelected ? styles.selected : ''}`}
                    title={iconOption.name}
                  >
                    <IconComponent size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
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

          {/* Preview */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('folder_preview')}</label>
            <div className={styles.preview}>
              <div className={styles.previewIcon}>
                {(() => {
                  const IconComponent = selectedIcon.icon;
                  return <IconComponent size={24} style={{ color }} />;
                })()}
              </div>
              <div className={styles.previewText}>
                <p className={styles.previewName}>{name || t('folder_preview_default')}</p>
                <p className={styles.previewMeta}>
                  {selectedIcon.name} • {color}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={handleClose} disabled={isUpdating}>
            {t('common_cancel')}
          </button>
          <button
            className={styles.updateButton}
            onClick={handleUpdate}
            disabled={isUpdating || !name.trim()}
          >
            {isUpdating ? t('folder_updating') : t('folder_update')}
          </button>
        </div>
      </div>
    </div>
  );
};
