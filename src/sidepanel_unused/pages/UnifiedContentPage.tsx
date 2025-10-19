import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useContentStore } from '../../stores/contentStore';
import { FolderSidebar } from '../../components/sidepanel/FolderSidebar/FolderSidebar';
import { CreateFolderModal } from '../../components/sidepanel/CreateFolderModal/CreateFolderModal';
import { useI18n } from '../../hooks/useI18n';
import { useToastHelpers } from '../../hooks/useToast';
import { IoSearch, IoDocumentText, IoGlobe, IoDocument, IoTrash, IoCheckmark, IoClose, IoCloudUpload } from 'react-icons/io5';
import { FaBookmark } from 'react-icons/fa6';
import { browser } from 'wxt/browser';
import styles from './UnifiedContentPage.module.css';
import layoutStyles from './CommonLayout.module.css';
import Tooltip from '../../components/common/Tooltip';
import { TagList } from '../../components/sidepanel/TagList/TagList';
import { scrapService } from '../../services/scrapService';
import { articleService } from '../../services/articleService';
import { clipAndScrapCurrentPage, ScrapStatus } from '../../utils/scrapHelper';
import { PDFUploadModal } from '../../components/sidepanel/PDFUploadModal/PDFUploadModal';
import { trackPDFUploadModalOpenedBridge } from '../../analytics/bridge';

interface UnifiedContentPageProps {
  onNavigateToDetail: (articleId: number) => void;
}

export const UnifiedContentPage: React.FC<UnifiedContentPageProps> = ({ onNavigateToDetail }) => {
  const { t } = useI18n();
  const { showSuccess, showError } = useToastHelpers();

  const {
    items,
    itemsLoading,
    itemsError,
    itemsHasMore,
    contentTypeFilter,
    searchQuery,
    selectedTags,
    sortBy,
    sortOrder,
    loadContent,
    loadMoreContent,
    refreshContent,
    setContentTypeFilter,
    setSearchQuery,
    setSelectedTags,
    setSorting,
  } = useContentStore();

  // Clipping state
  const [isClipping, setIsClipping] = useState(false);
  const [clipStatus, setClipStatus] = useState<ScrapStatus>('idle');

  // PDF Upload state
  const [showPDFUploadModal, setShowPDFUploadModal] = useState(false);

  const lastItemRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // Load content on mount
  useEffect(() => {
    loadContent();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (itemsLoading || !itemsHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && itemsHasMore && !itemsLoading) {
          loadMoreContent();
        }
      },
      { threshold: 0.5 }
    );

    if (lastItemRef.current) {
      observer.observe(lastItemRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [itemsLoading, itemsHasMore, loadMoreContent]);

  const handleDeleteScrap = async (scrapId: number) => {
    if (!confirm(t('scrapPage_confirmDelete'))) return;

    try {
      await scrapService.deleteScrap(scrapId);
      showSuccess(t('common_success'), t('scrapPage_deleteSuccess'));
      await refreshContent();
    } catch (error: any) {
      showError(t('common_error'), error.message || t('scrapPage_deleteFailed'));
    }
  };

  const handleDeleteArticle = async (articleId: number) => {
    if (!confirm(t('archivePage_confirmDelete'))) return;

    try {
      await articleService.deleteArticle(articleId);
      showSuccess(t('common_success'), t('archivePage_deleteSuccess'));
      await refreshContent();
    } catch (error: any) {
      showError(t('common_error'), error.message || t('archivePage_deleteFailed'));
    }
  };

  const handleClipCurrentPage = useCallback(async () => {
    if (isClipping) return;

    try {
      setIsClipping(true);
      setClipStatus('loading');

      await clipAndScrapCurrentPage();

      setClipStatus('success');
      showSuccess(t('scrapPage_scrapSuccess'), t('scrapPage_scrapSuccess'));

      await refreshContent();

      setTimeout(() => setClipStatus('idle'), 2000);
    } catch (error: any) {
      setClipStatus('error');
      showError(t('common_error'), error.message || t('scrapPage_scrapFailed'));
      setTimeout(() => setClipStatus('idle'), 2000);
    } finally {
      setIsClipping(false);
    }
  }, [isClipping, showSuccess, showError, refreshContent, t]);

  const handlePDFUploadSuccess = useCallback(() => {
    refreshContent();
    showSuccess(t('common_success'), t('scrapPage_uploadSuccess'));
  }, [refreshContent, showSuccess, t]);

  const openScrapInNewTab = useCallback(async (scrapId: number, scrapType?: string) => {
    try {
      const viewerType = scrapType === 'webclip' ? 'SCRAP' : 'UPLOAD';
      const url = browser.runtime.getURL(`/webviewer.html#type=${viewerType}&id=${scrapId}`);
      await browser.runtime.sendMessage({ action: 'openViewer', url, type: viewerType, id: scrapId });
    } catch (error) {
      showError(t('common_error'), t('scrapPage_openViewerError'));
    }
  }, [showError, t]);

  const openArticleInEditor = useCallback((articleId: number) => {
    onNavigateToDetail(articleId);
  }, [onNavigateToDetail]);

  const handleRemoveTag = async (itemType: 'SCRAP' | 'ARTICLE', itemId: number, tagName: string) => {
    try {
      if (itemType === 'SCRAP') {
        const tags = await scrapService.getScrapTags(itemId);
        const tag = tags.find(t => t.name === tagName);
        if (tag) {
          await scrapService.removeTagFromScrap(itemId, tag.tagId);
          await refreshContent();
        }
      }
      // Article tags would be handled similarly if backend supports it
    } catch (error: any) {
      showError(t('common_error'), error.message || t('scrapPage_tagRemoveFailed'));
    }
  };

  const handleDragStart = (e: React.DragEvent, itemType: 'SCRAP' | 'ARTICLE', itemId: number) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';

    const dragData = {
      type: itemType,
      id: itemId,
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));

    // Visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.style.cursor = 'grabbing';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.style.cursor = 'grab';
  };

  const renderContentItem = (item: any, index: number) => {
    const isLast = index === items.length - 1;

    if (item.type === 'SCRAP') {
      const scrap = item.data;
      return (
        <div
          key={`scrap-${scrap.scrapId}`}
          className={styles.contentItem}
          ref={isLast ? lastItemRef : null}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, 'SCRAP', scrap.scrapId)}
          onDragEnd={handleDragEnd}
          onClick={() => openScrapInNewTab(scrap.scrapId, scrap.type)}
        >
          <div className={styles.itemHeader}>
            <div className={`${styles.itemType} ${styles.itemTypeScrap}`}>
              {scrap.type === 'webclip' ? (
                <IoGlobe size={16} />
              ) : (
                <IoDocument size={16} />
              )}
              <span>{scrap.type === 'webclip' ? t('content_type_scrap') : 'PDF/File'}</span>
            </div>
            <Tooltip content={t('common_delete')}>
              <button
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteScrap(scrap.scrapId);
                }}
              >
                <IoTrash size={16} />
              </button>
            </Tooltip>
          </div>

          <h3 className={styles.itemTitle}>{scrap.title}</h3>

          <div className={styles.itemContent}>
            {scrap.contentInfo?.text || scrap.content}
          </div>

          <div className={styles.itemFooter}>
            <div className={styles.tags}>
              {scrap.tags && scrap.tags.length > 0 && (
                <TagList
                  tags={scrap.tags.map((t: any) => t.name)}
                  onTagRemove={(tagName) => handleRemoveTag('SCRAP', scrap.scrapId, tagName)}
                  showRemoveButton={true}
                />
              )}
            </div>
            <div className={styles.itemDate}>
              {new Date(scrap.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      );
    } else if (item.type === 'ARTICLE') {
      const article = item.data;
      return (
        <div
          key={`article-${article.articleId}`}
          className={styles.contentItem}
          ref={isLast ? lastItemRef : null}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, 'ARTICLE', article.articleId)}
          onDragEnd={handleDragEnd}
          onClick={() => openArticleInEditor(article.articleId)}
        >
          <div className={styles.itemHeader}>
            <div className={`${styles.itemType} ${styles.itemTypeArticle}`}>
              <IoDocumentText size={16} />
              <span>{t('content_type_article')}</span>
            </div>
            <Tooltip content={t('common_delete')}>
              <button
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteArticle(article.articleId);
                }}
              >
                <IoTrash size={16} />
              </button>
            </Tooltip>
          </div>

          <h3 className={styles.itemTitle}>{article.title || t('archivePage_noTitle')}</h3>

          <div className={styles.itemContent}>
            {article.content ? article.content.substring(0, 200) : t('archivePage_noContent')}
          </div>

          <div className={styles.itemFooter}>
            <div className={styles.itemDate}>
              {new Date(article.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.unifiedPage}>
      <FolderSidebar />

      <div className={styles.mainContent}>
        <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <IoSearch size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.actionButtons}>
            <Tooltip content={t('scrapPage_pageScrap')}>
              <button
                className={`${styles.actionButton} ${
                  clipStatus === 'success' ? styles.actionButtonSuccess :
                  clipStatus === 'error' ? styles.actionButtonError : ''
                }`}
                onClick={handleClipCurrentPage}
                disabled={isClipping}
                aria-label={t('scrapPage_pageScrap')}
              >
                {clipStatus === 'loading' && (
                  <div className={styles.spinner} />
                )}
                {clipStatus === 'success' && (
                  <IoCheckmark size={18} />
                )}
                {clipStatus === 'error' && (
                  <IoClose size={18} />
                )}
                {clipStatus === 'idle' && (
                  <FaBookmark size={16} />
                )}
              </button>
            </Tooltip>

            <Tooltip content={t('scrapPage_pdf')}>
              <button
                className={styles.actionButton}
                onClick={() => {
                  setShowPDFUploadModal(true);
                  trackPDFUploadModalOpenedBridge();
                }}
                aria-label={t('scrapPage_pdf')}
              >
                <IoCloudUpload size={18} />
              </button>
            </Tooltip>
          </div>

          <div className={styles.filters}>
            <Tooltip content={t('filter_content_type')}>
              <select
                className={styles.filterSelect}
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value as any)}
              >
                <option value="all">{t('filter_all')}</option>
                <option value="scrap">{t('filter_scraps')}</option>
                <option value="article">{t('filter_articles')}</option>
              </select>
            </Tooltip>

            <Tooltip content={t('sort_by')}>
              <select
                className={styles.filterSelect}
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('_');
                  setSorting(newSortBy as any, newSortOrder as any);
                }}
              >
                <option value="createdAt_DESC">{t('sort_newest')}</option>
                <option value="createdAt_ASC">{t('sort_oldest')}</option>
                <option value="title_ASC">{t('sort_title_asc')}</option>
                <option value="title_DESC">{t('sort_title_desc')}</option>
              </select>
            </Tooltip>
          </div>
        </div>

        <div className={styles.contentList}>
          {itemsLoading && items.length === 0 ? (
            <div className={styles.loading}>{t('loading')}</div>
          ) : itemsError ? (
            <div className={styles.error}>{itemsError}</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <p>{t('no_content_found')}</p>
            </div>
          ) : (
            <>
              {items.map((item, index) => renderContentItem(item, index))}

              {itemsLoading && itemsHasMore && (
                <div className={styles.loadingMore}>{t('loading_more')}</div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateFolderModal />
      <PDFUploadModal
        isOpen={showPDFUploadModal}
        onClose={() => setShowPDFUploadModal(false)}
        onSuccess={handlePDFUploadSuccess}
      />
    </div>
  );
};

export default UnifiedContentPage;
