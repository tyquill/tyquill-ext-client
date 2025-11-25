import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IoCheckmarkCircle, IoClose } from 'react-icons/io5';
import { useI18n } from '../../../hooks/useI18n';
import styles from './ScrapToast.module.css';
import Confetti from '../../sidepanel/Confetti/Confetti';
import { browser } from 'wxt/browser';
import type { FolderResponse } from '../../../services/folderService';
import type { ScrapResponse, TagResponse } from '../../../services/scrapService';

interface ScrapToastProps {
  scrapId: string;
  title: string;
  url?: string;
  tags?: ScrapResponse['tags'];
  onClose: () => void;
  duration?: number;
}

const ScrapToast: React.FC<ScrapToastProps> = ({
  scrapId,
  title,
  url,
  onClose,
  tags,
  duration = 0,
}) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [availableFolders, setAvailableFolders] = useState<Array<{
    id: number;
    label: string;
    depth: number;
  }>>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | ''>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialTagsRef = useRef(tags || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    () => (tags || []).map((tag) => tag.name).filter(Boolean)
  );
  const [tagInput, setTagInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'default' | 'success' | 'error'>('default');
  const flattenFolders = useCallback((
    folders: FolderResponse[],
    parentPath = '',
    depth = 0
  ): Array<{
    id: number;
    label: string;
    depth: number;
  }> => folders.flatMap((folder) => {
    const currentPath = parentPath ? `${parentPath} / ${folder.name}` : folder.name;
    const current = { id: folder.folderId, label: currentPath, depth };
    const children = folder.children?.length
      ? flattenFolders(folder.children, currentPath, depth + 1)
      : [];
    return [current, ...children];
  }), []);

  const fetchFolders = useCallback(async (): Promise<FolderResponse[]> => {
    try {
      const response = await browser.runtime.sendMessage({ action: 'scrapToast:getFolders' });
      if (response?.success) return response.data as FolderResponse[];
      throw new Error(response?.error || 'Failed to load folders');
    } catch (error) {
      console.error('ScrapToast: background folder fetch failed, retrying direct', error);
      // 최후 수단으로 직접 호출 (CORS에 따라 실패할 수 있음)
      const { folderService } = await import('../../../services/folderService');
      return folderService.getFolders();
    }
  }, []);

  const fetchTagNames = useCallback(async (): Promise<string[]> => {
    try {
      const response = await browser.runtime.sendMessage({ action: 'scrapToast:getTagNames' });
      if (response?.success) return (response.data as string[]) || [];
      throw new Error(response?.error || 'Failed to load tags');
    } catch (error) {
      console.error('ScrapToast: background tag fetch failed, retrying direct', error);
      const { tagService } = await import('../../../services/tagService');
      return tagService.getTagNames();
    }
  }, []);

  useEffect(() => {
    // 컴포넌트 마운트 후 애니메이션 시작
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 폴더, 태그 목록 불러오기
    const loadFoldersAndTags = async () => {
      setIsOptionsLoading(true);
      setLoadError(null);
      try {
        const [folders, tagNames] = await Promise.all([
          fetchFolders(),
          fetchTagNames(),
        ]);
        setAvailableFolders(flattenFolders(folders));
        setAvailableTags(tagNames || []);
      } catch (error) {
        // 네트워크 에러는 토스트에서 조용히 처리
        console.error('Failed to load folders/tags for scrap toast', error);
        setLoadError(t('scrapToast_loadFailed'));
      }
      setIsOptionsLoading(false);
    };

    loadFoldersAndTags();
  }, [fetchFolders, fetchTagNames, flattenFolders]);

  useEffect(() => {
    // Confetti는 2초 후 숨김
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 2000);

    // Toast는 duration 후 닫힘
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => {
        clearTimeout(timer);
        clearTimeout(confettiTimer);
      };
    }

    return () => clearTimeout(confettiTimer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300); // 애니메이션 시간과 맞춤
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || selectedTags.includes(trimmed)) return;
    setSelectedTags((prev) => [...prev, trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || isCreatingFolder) return;
    try {
      setIsCreatingFolder(true);
      const createResponse = await browser.runtime.sendMessage({
        action: 'scrapToast:createFolder',
        name: trimmed
      });
      if (!createResponse?.success) {
        throw new Error(createResponse?.error || 'Failed to create folder');
      }
      const created = createResponse.data as FolderResponse;
      const updatedFolders = await fetchFolders();
      setAvailableFolders(flattenFolders(updatedFolders));
      setSelectedFolderId(created.folderId);
      setNewFolderName('');
      setStatusMessage(t('scrapToast_folderCreated'));
      setStatusType('success');
    } catch (error) {
      console.error('Failed to create folder from scrap toast', error);
      setStatusMessage(t('scrapToast_folderCreateFailed'));
      setStatusType('error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSaveSelections = async () => {
    if (!scrapId) {
      setStatusMessage(t('scrapToast_missingScrapId'));
      setStatusType('error');
      return;
    }

    try {
      setIsSaving(true);
      setStatusMessage(t('scrapToast_saving'));
      setStatusType('default');
      setLoadError(null);

      if (selectedFolderId) {
        const folderResponse = await browser.runtime.sendMessage({
          action: 'scrapToast:addToFolder',
          folderId: selectedFolderId,
          scrapId,
        });
        if (!folderResponse?.success) {
          throw new Error(folderResponse?.error || 'Failed to add to folder');
        }
      }

      const initialTagsMap = new Map(
        (initialTagsRef.current || [])
          .filter((tag) => !!tag.name)
          .map((tag) => [tag.name.toLowerCase(), tag])
      );
      const tagsToAdd = selectedTags.filter(
        (tag) => !initialTagsMap.has(tag.toLowerCase())
      );
      const tagsToRemove = (initialTagsRef.current || []).filter(
        (tag) => tag.name && !selectedTags.some((selected) => selected.toLowerCase() === tag.name.toLowerCase())
      );

      const addedTagResponses: ScrapResponse['tags'] = [];

      for (const tag of tagsToAdd) {
        const addResponse = await browser.runtime.sendMessage({
          action: 'scrapToast:addTagToScrap',
          scrapId,
          tagName: tag,
        });
        if (!addResponse?.success) {
          throw new Error(addResponse?.error || 'Failed to add tag');
        }
        const added = addResponse.data as TagResponse;
        addedTagResponses.push({
          ...added,
          name: added.name || tag,
        });
        if (!availableTags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
          setAvailableTags((prev) => [...prev, tag]);
        }
      }

      for (const tag of tagsToRemove) {
        if (tag.tagId) {
          const removeResponse = await browser.runtime.sendMessage({
            action: 'scrapToast:removeTagFromScrap',
            scrapId,
            tagId: tag.tagId,
          });
          if (!removeResponse?.success) {
            throw new Error(removeResponse?.error || 'Failed to remove tag');
          }
        }
      }

      const removedIds = new Set(tagsToRemove.map((tag) => tag.tagId).filter(Boolean));
      const removedNames = new Set(
        tagsToRemove.map((tag) => tag.name?.toLowerCase()).filter(Boolean)
      );
      const remainingTags = (initialTagsRef.current || []).filter((tag) => {
        const lowerName = tag.name?.toLowerCase();
        if (tag.tagId && removedIds.has(tag.tagId)) return false;
        if (lowerName && removedNames.has(lowerName)) return false;
        return true;
      });
      initialTagsRef.current = [...remainingTags, ...(addedTagResponses || [])];

      setStatusMessage(t('scrapToast_saved'));
      setStatusType('success');
    } catch (error) {
      console.error('Failed to save folder/tags from scrap toast', error);
      setStatusMessage(t('scrapToast_saveFailed'));
      setStatusType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTagSuggestions = useMemo(() => {
    const keyword = tagInput.trim().toLowerCase();
    if (!keyword) return [];
    return availableTags
      .filter(
        (tag) =>
          tag.toLowerCase().includes(keyword) &&
          !selectedTags.some((selected) => selected.toLowerCase() === tag.toLowerCase())
      )
      .slice(0, 5);
  }, [availableTags, selectedTags, tagInput]);

  return (
    <div
      className={`${styles.toastContainer} ${isVisible ? styles.visible : ''} ${isLeaving ? styles.leaving : ''}`}
    >
      {/* Confetti Effect */}
      {showConfetti && (
        <div className={styles.confettiWrapper}>
          <Confetti
            particleCount={60}
            durationMs={2000}
            colors={['#DE7356', '#E89278', '#F2A68A', '#FFC4B0', '#FFD9CC']}
          />
        </div>
      )}

      {/* Toast Content */}
      <div className={styles.toast}>
        <button className={styles.closeButton} onClick={handleClose} aria-label={t('common_close')}>
          <IoClose size={18} />
        </button>
        <div className={styles.iconContainer}>
          <IoCheckmarkCircle className={styles.icon} />
        </div>
        <div className={styles.content}>
          <div className={styles.title}>{t('scrapPage_scrapSuccess')}</div>
          <div className={styles.pageTitle}>{title}</div>
          {url && <div className={styles.url}>{url}</div>}
          <div className={styles.metaSection}>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <span className={styles.fieldLabel}>{t('scrapToast_folderLabel')}</span>
                {isOptionsLoading && <span className={styles.helperText}>{t('scrapToast_loading')}</span>}
                {loadError && (
                  <button
                    className={styles.linkButton}
                    onClick={() => {
                      setStatusMessage(null);
                      setLoadError(null);
                      // retry load
                      (async () => {
                        setIsOptionsLoading(true);
                        try {
                          const [folders, tagNames] = await Promise.all([fetchFolders(), fetchTagNames()]);
                          setAvailableFolders(flattenFolders(folders));
                          setAvailableTags(tagNames || []);
                        } catch (error) {
                          console.error('Retry load failed', error);
                          setLoadError(t('scrapToast_loadFailed'));
                        } finally {
                          setIsOptionsLoading(false);
                        }
                      })();
                    }}
                  >
                    {t('scrapToast_retry')}
                  </button>
                )}
              </div>
              <div className={styles.folderRow}>
                {availableFolders.length === 0 && !isOptionsLoading ? (
                  <div className={styles.helperText}>{loadError || t('scrapToast_noFolders')}</div>
                ) : (
                  <select
                    className={styles.folderSelect}
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value ? Number(e.target.value) : '')}
                    disabled={isSaving || isOptionsLoading}
                  >
                    <option value="">{t('scrapToast_noFolder')}</option>
                    {availableFolders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.label}
                      </option>
                    ))}
                  </select>
                )}
                <div className={styles.newFolder}>
                  <input
                    className={styles.newFolderInput}
                    type="text"
                    placeholder={t('scrapToast_newFolderPlaceholder')}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    disabled={isSaving || isCreatingFolder}
                  />
                  <button
                    className={styles.secondaryButton}
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || isCreatingFolder || isSaving}
                  >
                    {isCreatingFolder ? t('scrapToast_creating') : t('scrapToast_createFolder')}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabel}>{t('scrapToast_tagLabel')}</div>
              <div className={styles.tagInputArea} onClick={() => !isSaving && !isCreatingFolder && (document.getElementById('scrap-toast-tag-input') as HTMLInputElement | null)?.focus()}>
                <div className={styles.tagList}>
                  {selectedTags.map((tag) => (
                    <span key={tag} className={styles.tagChip}>
                      {tag}
                      <button
                        className={styles.removeTagButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }}
                        aria-label={t('scrapToast_removeTag')}
                        disabled={isSaving}
                      >
                        <IoClose size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    id="scrap-toast-tag-input"
                    className={styles.tagInput}
                    type="text"
                    placeholder={t('scrapToast_tagPlaceholder')}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      } else if (e.key === 'Backspace' && !tagInput) {
                        setSelectedTags((prev) => prev.slice(0, -1));
                      }
                    }}
                    disabled={isSaving}
                  />
                </div>
                {filteredTagSuggestions.length > 0 && (
                  <div className={styles.tagSuggestions}>
                    {filteredTagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        className={styles.tagSuggestion}
                        onClick={() => handleAddTag(tag)}
                        type="button"
                        disabled={isSaving}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actionsRow}>
              {statusMessage && (
                <span
                  className={`${styles.status} ${
                    statusType === 'success'
                      ? styles.statusSuccess
                      : statusType === 'error'
                        ? styles.statusError
                        : ''
                  }`}
                >
                  {statusMessage}
                </span>
              )}
              <div className={styles.actionButtons}>
                <button className={styles.secondaryButton} onClick={handleClose} disabled={isSaving}>
                  {t('scrapToast_close')}
                </button>
                <button className={styles.primaryButton} onClick={handleSaveSelections} disabled={isSaving}>
                  {isSaving ? t('scrapToast_saving') : t('scrapToast_save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrapToast;
