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
import { TagAddButton } from '../../components/sidepanel/TagAddButton/TagAddButton';
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

  const lastItemRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver>();

  // Dynamic maxVisibleTags based on card width
  const [cardWidth, setCardWidth] = useState<number>(200);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Calculate maxVisibleTags based on card width
  // Tags container reserves 80px for date, ~28px for add button, ~65px per tag
  const getMaxVisibleTags = (width: number): number => {
    if (width < 230) return 1;
    if (width < 290) return 2;
    if (width < 360) return 3;
    return 4;
  };

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

  // ResizeObserver to detect card width changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        // All cards have same width in grid, use first entry
        const width = entries[0].contentRect.width;
        setCardWidth(width);
      }
    });

    // Observe only the first card (all cards have same width in grid layout)
    const cards = Array.from(cardRefs.current.values());
    if (cards.length > 0) {
      resizeObserver.observe(cards[0]);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [items.length]);

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
      // Success toast is shown in content script, no need to show again in sidepanel

      await refreshContent();

      setTimeout(() => setClipStatus('idle'), 2000);
    } catch (error: any) {
      setClipStatus('error');
      showError(t('common_error'), error.message || t('scrapPage_scrapFailed'));
      setTimeout(() => setClipStatus('idle'), 2000);
    } finally {
      setIsClipping(false);
    }
  }, [isClipping, showError, refreshContent, t]);

  const handlePDFUploadSuccess = useCallback(() => {
    refreshContent();
    showSuccess(t('common_success'), t('pdfUpload_uploadSuccess'));
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
          // Optimistic update: update tags locally without full page reload
          const updatedTags = await scrapService.getScrapTags(itemId);
          const updatedItems = items.map(item => {
            if (item.type === 'SCRAP' && item.data.scrapId === itemId) {
              return { ...item, data: { ...item.data, tags: updatedTags } };
            }
            return item;
          });
          // Update store directly without full reload
          useContentStore.setState({ items: updatedItems });
        }
      }
      // Article tags would be handled similarly if backend supports it
    } catch (error: any) {
      showError(t('common_error'), error.message || t('scrapPage_tagRemoveFailed'));
    }
  };

  const handleAddTag = async (itemType: 'SCRAP' | 'ARTICLE', itemId: number, tagName: string) => {
    try {
      if (itemType === 'SCRAP') {
        // Find current item and check for duplicate tags
        const currentItem = items.find(item => item.type === 'SCRAP' && item.data.scrapId === itemId);
        if (currentItem && currentItem.type === 'SCRAP') {
          const existingTags = currentItem.data.tags || [];
          const isDuplicate = existingTags.some((tag: any) => {
            const tagNameStr = typeof tag === 'string' ? tag : tag.name;
            return tagNameStr.toLowerCase() === tagName.toLowerCase();
          });

          if (isDuplicate) {
            showError(t('common_error'), `Tag "${tagName}" already exists`);
            return;
          }
        }

        await scrapService.addTagToScrap(itemId, tagName);
        // Optimistic update: update tags locally without full page reload
        const updatedTags = await scrapService.getScrapTags(itemId);
        const updatedItems = items.map(item => {
          if (item.type === 'SCRAP' && item.data.scrapId === itemId) {
            return { ...item, data: { ...item.data, tags: updatedTags } };
          }
          return item;
        });
        // Update store directly without full reload
        useContentStore.setState({ items: updatedItems });
        showSuccess(t('common_success'), `Tag "${tagName}" added`);
      }
      // Article tags would be handled similarly if backend supports it
    } catch (error: any) {
      showError(t('common_error'), error.message || 'Failed to add tag');
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

    // Visual feedback using CSS class
    const target = e.currentTarget as HTMLElement;
    target.classList.add(styles.dragging);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove(styles.dragging);
  };

  const renderContentItem = (item: any, index: number) => {
    const isLast = index === items.length - 1;
    const maxVisibleTags = getMaxVisibleTags(cardWidth);

    if (item.type === 'SCRAP') {
      const scrap = item.data;
      return (
        <div
          key={`scrap-${scrap.scrapId}`}
          className={styles.contentItem}
          ref={(el) => {
            if (isLast) {
              lastItemRef.current = el;
            }
            if (el) cardRefs.current.set(`scrap-${scrap.scrapId}`, el);
            else cardRefs.current.delete(`scrap-${scrap.scrapId}`);
          }}
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
              <TagAddButton
                onAddTag={(tagName) => handleAddTag('SCRAP', scrap.scrapId, tagName)}
              />
              <TagList
                tags={scrap.tags ? scrap.tags.map((t: any) => t.name) : []}
                maxVisibleTags={maxVisibleTags}
                onTagRemove={(tagName) => handleRemoveTag('SCRAP', scrap.scrapId, tagName)}
                showRemoveButton={true}
              />
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
          ref={(el) => {
            if (isLast) {
              lastItemRef.current = el;
            }
            if (el) cardRefs.current.set(`article-${article.articleId}`, el);
            else cardRefs.current.delete(`article-${article.articleId}`);
          }}
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
            <div className={styles.tags}>
            <TagAddButton
                onAddTag={(tagName) => handleAddTag('ARTICLE', article.articleId, tagName)}
              />
              <TagList
                tags={article.tags ? article.tags.map((t: any) => t.name) : []}
                maxVisibleTags={maxVisibleTags}
                onTagRemove={(tagName) => handleRemoveTag('ARTICLE', article.articleId, tagName)}
                showRemoveButton={true}
              />
            </div>
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
          {/* Row 1: Search */}
          <div className={styles.searchRow}>
            <div className={styles.searchBar}>
              <IoSearch size={18} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t('search_placeholder')}
              />
            </div>
          </div>

          {/* Row 2: Sort dropdown | Action buttons */}
          <div className={styles.actionsRow}>
            {/* Left: Sort dropdown */}
            <Tooltip content={t('sort_by')}>
              <select
                className={styles.sortSelect}
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('_');
                  setSorting(newSortBy as any, newSortOrder as any);
                }}
                aria-label={t('sort_by')}
              >
                <option value="createdAt_DESC">{t('sort_newest')}</option>
                <option value="createdAt_ASC">{t('sort_oldest')}</option>
              </select>
            </Tooltip>

            {/* Right: Action buttons */}
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
        onUploadSuccess={handlePDFUploadSuccess}
      />
    </div>
  );
};

export default UnifiedContentPage;
