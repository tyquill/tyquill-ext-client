import React, { useEffect, useState, useRef } from 'react';
import { IoAdd, IoDocuments, IoChevronBack, IoChevronForward, IoFolder } from 'react-icons/io5';
import { useContentStore } from '../../../stores/contentStore';
import { FolderTreeItem } from '../FolderTreeItem/FolderTreeItem';
import { folderService } from '../../../services/folderService';
import { useI18n } from '../../../hooks/useI18n';
import { useToastHelpers } from '../../../hooks/useToast';
import { logger } from '../../../utils/logger';
import styles from './FolderSidebar.module.css';
import Tooltip from '../../common/Tooltip';

// Minimum panel width to show toggle button (in pixels)
const MIN_PANEL_WIDTH_FOR_TOGGLE = 600;

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

export const FolderSidebar: React.FC = () => {
  const { t } = useI18n();
  const { showSuccess, showError } = useToastHelpers();
  const [isAllItemsDragOver, setIsAllItemsDragOver] = useState(false);
  const [isPanelWide, setIsPanelWide] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  // Monitor panel width and conditionally show toggle button
  useEffect(() => {
    const updatePanelWidth = () => {
      const width = window.innerWidth;
      const isWide = width >= MIN_PANEL_WIDTH_FOR_TOGGLE;
      setIsPanelWide(isWide);

      // Auto-collapse when panel is too narrow
      if (!isWide && !isFolderSidebarCollapsed) {
        toggleFolderSidebar();
      }
    };

    // Initial check
    updatePanelWidth();

    // Listen for resize events
    window.addEventListener('resize', updatePanelWidth);

    return () => {
      window.removeEventListener('resize', updatePanelWidth);
    };
  }, [isFolderSidebarCollapsed, toggleFolderSidebar]);

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleSelectUncategorized = () => {
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

  const handleUncategorizedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsAllItemsDragOver(true);
  };

  const handleUncategorizedDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAllItemsDragOver(false);
  };

  const handleUncategorizedDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAllItemsDragOver(false);

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

      logger.debug('Dropping item to remove from folder:', dragData);

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
        }

        showSuccess(
          t('folder_remove_success') || 'Success',
          `Removed ${dragData.type.toLowerCase()} from folder`
        );

        // Refresh content list
        await refreshContent();
      } else {
        logger.debug('Item already in root folder');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove item from folder';
      logger.error('Failed to remove item from folder:', error);
      showError(
        t('common_error') || 'Error',
        errorMessage || t('folder_remove_failed') || 'Failed to remove item from folder'
      );
    }
  };

  if (isFolderSidebarCollapsed) {
    return (
      <div className={styles.collapsedSidebar} ref={sidebarRef}>
        {/* Only show toggle button when panel is wide enough */}
        {isPanelWide && (
          <>
            <Tooltip content={t('folder_expand')} side="right">
              <button
                className={styles.toggleButton}
                onClick={toggleFolderSidebar}
                aria-label={t('folder_expand')}
              >
                <IoChevronForward size={18} />
              </button>
            </Tooltip>

            <div className={styles.collapsedDivider} />
          </>
        )}

        {/* Add Folder button in collapsed state */}
        <Tooltip content={t('folder_create')} side="right">
          <button
            className={styles.collapsedAddButton}
            onClick={openCreateFolderModal}
            aria-label={t('folder_create')}
          >
            <IoAdd size={20} />
          </button>
        </Tooltip>

        <div className={styles.collapsedDivider} />

        {/* Uncategorized in collapsed state */}
        <Tooltip content={t('uncategorized')} side="right">
          <div
            className={`${styles.collapsedFolderIcon} ${selectedFolderId === null ? styles.selected : ''}`}
            onClick={handleSelectUncategorized}
            role="button"
            aria-label={t('uncategorized')}
          >
            <IoDocuments size={18} />
          </div>
        </Tooltip>

        {/* Show folder icons vertically */}
        {folders.slice(0, 5).map((folder) => (
          <Tooltip key={folder.folderId} content={folder.name} side="right">
            <div
              className={`${styles.collapsedFolderIcon} ${selectedFolderId === folder.folderId ? styles.selected : ''}`}
              onClick={() => handleSelectFolder(folder.folderId)}
              role="button"
              aria-label={folder.name}
            >
              <IoFolder size={18} style={{ color: folder.color || '#888' }} />
            </div>
          </Tooltip>
        ))}

        {folders.length > 5 && (
          <div className={styles.collapsedFolderIcon} style={{ opacity: 0.5 }}>
            <span style={{ fontSize: '10px' }}>+{folders.length - 5}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.sidebar} ref={sidebarRef}>
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
          {/* Only show toggle button when panel is wide enough */}
          {isPanelWide && (
            <Tooltip content={t('folder_collapse')}>
              <button
                className={styles.headerButton}
                onClick={toggleFolderSidebar}
                aria-label={t('folder_collapse')}
              >
                <IoChevronBack size={20} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {foldersLoading ? (
          <div className={styles.loading}>{t('folder_loading')}</div>
        ) : foldersError ? (
          <div className={styles.error}>{foldersError}</div>
        ) : (
          <>
            {/* Uncategorized */}
            <div
              className={`${styles.uncategorizedRow} ${selectedFolderId === null ? styles.selected : ''} ${isAllItemsDragOver ? styles.dragOver : ''}`}
              onClick={handleSelectUncategorized}
              onDragOver={handleUncategorizedDragOver}
              onDragLeave={handleUncategorizedDragLeave}
              onDrop={handleUncategorizedDrop}
            >
              <IoDocuments size={16} />
              <span className={styles.uncategorizedLabel}>{t('uncategorized')}</span>
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
