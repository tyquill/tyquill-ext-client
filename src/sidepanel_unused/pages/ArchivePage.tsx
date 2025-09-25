import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { IoTrash } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { articleService, ArticleResponse } from '../../services/articleService';
import { useI18n } from '../../hooks/useI18n';
import { useToastHelpers } from '../../hooks/useToast';
import Tooltip from '../../components/common/Tooltip';

interface ArchivePageProps {
  onDraftClick: (draftId: string) => void;
}

export interface ArchivePageRef {
  refreshList: () => void;
}

const ArchivePage = forwardRef<ArchivePageRef, ArchivePageProps>(({ onDraftClick }, ref) => {
  const [articles, setArticles] = useState<ArticleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleteTimeoutId, setDeleteTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [deletedArticle, setDeletedArticle] = useState<ArticleResponse | null>(null);
  const { t } = useI18n();
  const { showSuccess, showError } = useToastHelpers();

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await articleService.getArticles();
      setArticles(response);
    } catch (error: any) {
      setError(error.message || t('archivePage_loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  // ref를 통해 refreshList 함수 노출
  useImperativeHandle(ref, () => ({
    refreshList: loadArticles
  }));

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutId) {
        clearTimeout(deleteTimeoutId);
      }
    };
  }, [deleteTimeoutId]);

  const handleDelete = (id: number) => {
    // If there's already a pending delete, complete it immediately
    if (pendingDeleteId !== null && deleteTimeoutId) {
      clearTimeout(deleteTimeoutId);
      executeDelete(pendingDeleteId);
    }

    // Find and store the article to be deleted
    const articleToDelete = articles.find(article => article.articleId === id);
    if (!articleToDelete) return;

    // Mark as pending delete and remove from UI immediately
    setPendingDeleteId(id);
    setDeletedArticle(articleToDelete);
    setArticles(articles.filter(article => article.articleId !== id));

    // Show success toast with undo information
    showSuccess(
      t('archivePage_deleteSuccess'),
      t('archivePage_undoMessage'),
      6000 // 6 seconds to see the message
    );

    // Set timeout to actually delete after 5 seconds
    const timeoutId = setTimeout(() => {
      executeDelete(id);
    }, 5000);

    setDeleteTimeoutId(timeoutId);
  };

  const handleUndo = () => {
    if (pendingDeleteId && deleteTimeoutId && deletedArticle) {
      clearTimeout(deleteTimeoutId);
      setDeleteTimeoutId(null);

      // Restore the article to the list in the correct position
      setArticles(prevArticles => {
        const restored = [...prevArticles, deletedArticle].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return restored;
      });

      setPendingDeleteId(null);
      setDeletedArticle(null);
      showSuccess(t('archivePage_undoSuccess'), '', 3000);
    }
  };

  const executeDelete = async (id: number) => {
    try {
      await articleService.deleteArticle(id);
      setPendingDeleteId(null);
      setDeletedArticle(null);
      setDeleteTimeoutId(null);
    } catch (err: any) {
      // If delete fails, restore the article
      if (deletedArticle) {
        setArticles(prevArticles => {
          return [...prevArticles, deletedArticle].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
      setPendingDeleteId(null);
      setDeletedArticle(null);
      setDeleteTimeoutId(null);
      showError(t('archivePage_deleteFailed'), err.message || t('archivePage_deleteError'));
    }
  };

  const getPreviewContent = (content: string | undefined) => {
    if (!content) return t('archivePage_noContent');
    
    // 마크다운을 일반 텍스트로 변환
    let text = content
      .replace(/^#{1,6}\s+/gm, '') // 헤딩 제거
      .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
      .replace(/\*(.*?)\*/g, '$1') // 이탤릭 제거
      .replace(/~~(.*?)~~/g, '$1') // 취소선 제거
      .replace(/__(.*?)__/g, '$1') // 밑줄 제거
      .replace(/`([^`]+)`/g, '$1') // 인라인 코드 제거
      .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
      .replace(/^\*\s+/gm, '• ') // 불릿 포인트로 변환
      .replace(/^\d+\.\s+/gm, '') // 번호 목록 제거
      .replace(/^\>\s+/gm, '') // 인용구 제거
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 링크 텍스트만 유지
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // 이미지 제거
      .replace(/\\(.)/g, '$1') // 역슬래시 이스케이프 제거
      .replace(/\n+/g, ' ') // 줄바꿈을 공백으로
      .replace(/\s+/g, ' ') // 연속된 공백을 하나로
      .trim();
    
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerControls}>
            <h1 className={styles.pageTitle}>{t('archivePage_title')}</h1>
          </div>
        </div>
        <div className={styles.loadingContainer}>{t('archivePage_loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerControls}>
            <h1 className={styles.pageTitle}>{t('archivePage_title')}</h1>
          </div>
        </div>
        <div className={styles.errorContainer}>{t('archivePage_error')}: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerControls}>
          <h1 className={styles.pageTitle}>{t('archivePage_title')}</h1>
        </div>
      </div>

      <div className={styles.archiveList}>
        {articles.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyMessage}>{t('archivePage_emptyMessage')}</div>
            <div className={styles.emptySubMessage}>
              {t('archivePage_createFirstDraft')}
            </div>
          </div>
        ) : (
          articles.map(article => (
            <div 
              key={article.articleId} 
              className={styles.archiveItem}
              onClick={() => onDraftClick(article.articleId.toString())}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.archiveGrid}>
                <div className={styles.archiveContent}>
                  <div className={styles.archiveTitle}>{article.title || t('archivePage_noTitle')}</div>
                  <div className={styles.archiveInfo}>
                    <span>{new Date(article.createdAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }).replace(/(\d+)\. (\d+)\. (\d+)\.? (\d+):(\d+)/, '$1. $2. $3. $4:$5')}</span>
                    {/* {article.updatedAt !== article.createdAt && (
                      <>
                        <span className={styles.dot} />
                        <span>{new Date(article.updatedAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        }).replace(/(\d+)\. (\d+)\. (\d+)\.? (\d+):(\d+)/, '$1. $2. $3. $4:$5')}</span>
                      </>
                    )} */}
                  </div>
                </div>
                <div className={styles.archiveActions}>
                  <Tooltip content={t('archivePage_deleteTooltip')}>
                    <button
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(article.articleId);
                      }}
                      >
                      <IoTrash size={18} />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className={styles.archivePreview}>
                {getPreviewContent(article.content)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Undo Button */}
      {pendingDeleteId && (
        <div className={styles.undoContainer}>
          <button
            className={styles.undoButton}
            onClick={handleUndo}
            aria-label={t('archivePage_undo')}
          >
            {t('archivePage_undo')}
          </button>
        </div>
      )}
    </div>
  );
});

export default ArchivePage; 