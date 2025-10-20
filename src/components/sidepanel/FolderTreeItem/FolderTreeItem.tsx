import React, { useState } from 'react';
import { IoChevronDown, IoChevronForward, IoFolder, IoTrash, IoCreate } from 'react-icons/io5';
import { FaRegFolderOpen } from 'react-icons/fa6';
import { FolderResponse, folderService } from '../../../services/folderService';
import { useContentStore } from '../../../stores/contentStore';
import { useToastHelpers } from '../../../hooks/useToast';
import { useI18n } from '../../../hooks/useI18n';
import { logger } from '../../../utils/logger';
import styles from './FolderTreeItem.module.css';
import Tooltip from '../../common/Tooltip';

/**
 * Type guard to validate drag data structure
 */
interface DragData {
  type: 'SCRAP' | 'ARTICLE';
  id: number;
}

function isDragData(data: unknown): data is DragData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'id' in data &&
    (data.type === 'SCRAP' || data.type === 'ARTICLE') &&
    typeof data.id === 'number'
  );
}

interface FolderTreeItemProps {
  folder: FolderResponse;
  isSelected: boolean;
  onSelect: (folderId: number) => void;
  onDelete: (folderId: number) => void;
  onRename: (folderId: number, newName: string) => void;
  level?: number;
}

export const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  isSelected,
  onSelect,
  onDelete,
  onRename,
  level = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const { refreshContent } = useContentStore();
  const { showSuccess, showError } = useToastHelpers();
  const { t } = useI18n();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    onSelect(folder.folderId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = t('folder_delete_confirm_message').replace('{folderName}', folder.name);
    if (confirm(message)) {
      onDelete(folder.folderId);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(folder.name);
  };

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== folder.name) {
      onRename(folder.folderId, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(folder.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Prevent drop if already moving an item
    if (isMoving) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Prevent multiple concurrent operations
    if (isMoving) {
      return;
    }

    setIsMoving(true);

    try {
      const dragDataString = e.dataTransfer.getData('application/json');
      if (!dragDataString) {
        logger.warn('No drag data found');
        return;
      }

      // Safe JSON parsing with validation
      let dragData: unknown;
      try {
        dragData = JSON.parse(dragDataString);
      } catch (parseError) {
        logger.error('Failed to parse drag data:', parseError);
        showError(t('common_error'), 'Invalid drag data format');
        return;
      }

      // Validate drag data structure
      if (!isDragData(dragData)) {
        logger.error('Invalid drag data structure:', dragData);
        showError(t('common_error'), 'Invalid item data');
        return;
      }

      logger.debug('Dropping item:', dragData, 'into folder:', folder.name);

      // Call API to move item to folder
      // Backend expects { scrapIds: number[] } or { articleIds: number[] }
      if (dragData.type === 'SCRAP') {
        await folderService.addItemsToFolder(folder.folderId, {
          scrapIds: [dragData.id],
        });
      } else if (dragData.type === 'ARTICLE') {
        await folderService.addItemsToFolder(folder.folderId, {
          articleIds: [dragData.id],
        });
      }

      showSuccess(
        t('folder_move_success') || 'Success',
        `Moved ${dragData.type.toLowerCase()} to ${folder.name}`
      );

      // Refresh content list
      await refreshContent();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to move item to folder';
      logger.error('Failed to move item:', error);
      showError(
        t('common_error') || 'Error',
        errorMessage || t('folder_move_failed') || 'Failed to move item to folder'
      );
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className={styles.folderTreeItem}>
      <div
        className={`${styles.folderRow} ${isSelected ? styles.selected : ''} ${isDragOver ? styles.dragOver : ''}`}
        style={{ paddingLeft: `${level * 12 + 6}px` }}
        onClick={handleSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.folderLeft}>
          {hasChildren ? (
            <button className={styles.chevron} onClick={handleToggle} aria-label="Toggle folder">
              {isExpanded ? <IoChevronDown size={14} /> : <IoChevronForward size={14} />}
            </button>
          ) : (
            <div className={styles.chevronPlaceholder} />
          )}

          {isSelected || (isExpanded && hasChildren) ? (
            <FaRegFolderOpen size={16} style={{ color: folder.color || '#888' }} />
          ) : (
            <IoFolder size={16} style={{ color: folder.color || '#888' }} />
          )}

          {isEditing ? (
            <input
              type="text"
              className={styles.folderInput}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={styles.folderName}>{folder.name}</span>
          )}
        </div>

        <div className={styles.folderActions}>
          {folder.itemCount !== undefined && (
            <span className={styles.itemCount}>{folder.itemCount}</span>
          )}
          <Tooltip content="Rename folder">
            <button
              className={styles.actionButton}
              onClick={handleStartEdit}
              aria-label="Rename folder"
            >
              <IoCreate size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Delete folder">
            <button
              className={styles.actionButton}
              onClick={handleDelete}
              aria-label="Delete folder"
            >
              <IoTrash size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className={styles.children}>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.folderId}
              folder={child}
              isSelected={isSelected}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
