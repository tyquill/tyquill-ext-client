import React, { useEffect, useState } from 'react';
import { IoAdd, IoHome, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { useContentStore } from '../../../stores/contentStore';
import { FolderTreeItem } from '../FolderTreeItem/FolderTreeItem';
import { folderService } from '../../../services/folderService';
import { useI18n } from '../../../hooks/useI18n';
import { useToastHelpers } from '../../../hooks/useToast';
import styles from './FolderSidebar.module.css';
import Tooltip from '../../common/Tooltip';

export const FolderSidebar: React.FC = () => {
  const { t } = useI18n();
  const { showSuccess, showError } = useToastHelpers();
  const [isAllItemsDragOver, setIsAllItemsDragOver] = useState(false);

  const {
    folders,
    selectedFolderId,
    foldersLoading,
    foldersError,
    isFolderSidebarCollapsed,
    loadFolders,
    selectFolder,
    deleteFolder,
    updateFolder,
    refreshContent,
    toggleFolderSidebar,
    openCreateFolderModal,
  } = useContentStore();

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleSelectAllItems = () => {
    selectFolder(null);
  };

  const handleSelectFolder = (folderId: number) => {
    selectFolder(folderId);
  };

  const handleDeleteFolder = async (folderId: number) => {
    try {
      await deleteFolder(folderId);
      showSuccess(t('folder_deleted'), t('folder_deleted_success'));
    } catch (error: any) {
      showError(t('common_error'), error.message || t('folder_delete_failed'));
    }
  };

  const handleRenameFolder = async (folderId: number, newName: string) => {
    try {
      await updateFolder(folderId, newName);
      showSuccess(t('folder_renamed'), t('folder_renamed_success'));
    } catch (error: any) {
      showError(t('common_error'), error.message || t('folder_rename_failed'));
    }
  };

  const handleAllItemsDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsAllItemsDragOver(true);
  };

  const handleAllItemsDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAllItemsDragOver(false);
  };

  const handleAllItemsDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAllItemsDragOver(false);

    try {
      const dragDataString = e.dataTransfer.getData('application/json');
      if (!dragDataString) {
        console.warn('No drag data found');
        return;
      }

      const dragData = JSON.parse(dragDataString);
      console.log('Dropping item to remove from folder:', dragData);

      // Find which folder the item is currently in
      if (selectedFolderId) {
        // Use the backend-compatible format to remove items
        if (dragData.type === 'SCRAP') {
          await folderService.addItemsToFolder(selectedFolderId, {
            scrapIds: [dragData.id],
            targetFolderId: null, // null removes from folder
          });
        } else if (dragData.type === 'ARTICLE') {
          await folderService.addItemsToFolder(selectedFolderId, {
            articleIds: [dragData.id],
            targetFolderId: null, // null removes from folder
          });
        } else {
          throw new Error(`Unknown content type: ${dragData.type}`);
        }

        showSuccess(
          t('folder_remove_success') || 'Success',
          `Removed ${dragData.type.toLowerCase()} from folder`
        );

        // Refresh content list
        await refreshContent();
      } else {
        console.log('Item already in root folder');
      }
    } catch (error: any) {
      console.error('Failed to remove item from folder:', error);
      showError(
        t('common_error') || 'Error',
        error.message || t('folder_remove_failed') || 'Failed to remove item from folder'
      );
    }
  };

  if (isFolderSidebarCollapsed) {
    return (
      <div className={styles.collapsedSidebar}>
        <Tooltip content={t('folder_expand')} side="right">
          <button
            className={styles.toggleButton}
            onClick={toggleFolderSidebar}
            aria-label={t('folder_expand')}
          >
            <IoChevronForward size={20} />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('folders')}</h2>
        <div className={styles.headerActions}>
          <Tooltip content={t('folder_create')}>
            <button
              className={styles.headerButton}
              onClick={openCreateFolderModal}
              aria-label={t('folder_create')}
            >
              <IoAdd size={20} />
            </button>
          </Tooltip>
          <Tooltip content={t('folder_collapse')}>
            <button
              className={styles.headerButton}
              onClick={toggleFolderSidebar}
              aria-label={t('folder_collapse')}
            >
              <IoChevronBack size={20} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={styles.content}>
        {foldersLoading ? (
          <div className={styles.loading}>{t('folder_loading')}</div>
        ) : foldersError ? (
          <div className={styles.error}>{foldersError}</div>
        ) : (
          <>
            {/* All Items */}
            <div
              className={`${styles.allItemsRow} ${selectedFolderId === null ? styles.selected : ''} ${isAllItemsDragOver ? styles.dragOver : ''}`}
              onClick={handleSelectAllItems}
              onDragOver={handleAllItemsDragOver}
              onDragLeave={handleAllItemsDragLeave}
              onDrop={handleAllItemsDrop}
            >
              <IoHome size={18} />
              <span className={styles.allItemsLabel}>{t('all_items')}</span>
            </div>

            {/* Folder Tree */}
            <div className={styles.folderTree}>
              {folders.map((folder) => (
                <FolderTreeItem
                  key={folder.folderId}
                  folder={folder}
                  isSelected={selectedFolderId === folder.folderId}
                  onSelect={handleSelectFolder}
                  onDelete={handleDeleteFolder}
                  onRename={handleRenameFolder}
                />
              ))}
            </div>

            {folders.length === 0 && (
              <div className={styles.emptyState}>
                <p>{t('folder_empty')}</p>
                <button className={styles.createFirstButton} onClick={openCreateFolderModal}>
                  {t('folder_create_first')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
