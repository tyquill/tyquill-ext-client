import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { IoTrash, IoRefresh } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { articleService, ArticleResponse } from '../../services/articleService';
import { useI18n } from '../../hooks/useI18n';
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
  const { t } = useI18n();

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

  const handleDelete = async (id: number) => {
    if (window.confirm(t('archivePage_deleteConfirm'))) {
      try {
        await articleService.deleteArticle(id);
        setArticles(articles.filter(article => article.articleId !== id));
      } catch (err: any) {
        alert(t('archivePage_deleteFailed') + ': ' + err.message);
      }
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
            <Tooltip content={t('archivePage_refreshTooltip')} side='bottom'>
              <button 
                className={styles.refreshButton}
                onClick={loadArticles}
                disabled={loading}
                >
                <IoRefresh size={18} />
              </button>
            </Tooltip>
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
            <Tooltip content={t('archivePage_refreshTooltip')} side='bottom'>
              <button 
                className={styles.refreshButton}
                onClick={loadArticles}
                disabled={loading}
                >
                <IoRefresh size={18} />
              </button>
            </Tooltip>
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
          <Tooltip content={t('archivePage_refreshTooltip')} side='bottom'>
            <button 
              className={styles.refreshButton}
              onClick={loadArticles}
              disabled={loading}
              >
              <IoRefresh size={18} />
            </button>
          </Tooltip>
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
    </div>
  );
});

export default ArchivePage; 