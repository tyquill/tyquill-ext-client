import React, { useState, useEffect } from 'react';
import { IoTrash } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { articleService, ArticleResponse } from '../../services/articleService';

interface ArchivePageProps {
  onDraftClick: (draftId: string) => void;
}

const ArchivePage: React.FC<ArchivePageProps> = ({ onDraftClick }) => {
  const [articles, setArticles] = useState<ArticleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const articleList = await articleService.getArticles();
        setArticles(articleList);
      } catch (err: any) {
        setError(err.message || 'Failed to load articles');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('이 아티클을 삭제하시겠습니까?')) {
      try {
        await articleService.deleteArticle(parseInt(id));
        setArticles(articles.filter(article => article.articleId !== parseInt(id)));
      } catch (err: any) {
        alert('삭제에 실패했습니다: ' + err.message);
      }
    }
  };

  const getPreviewContent = (content: string | undefined) => {
    if (!content) return '내용이 없습니다.';
    
    // 마크다운을 일반 텍스트로 변환
    let text = content
      .replace(/^#{1,6}\s+/gm, '') // 헤딩 제거
      .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
      .replace(/\*(.*?)\*/g, '$1') // 이탤릭 제거
      .replace(/^\*\s+/gm, '• ') // 불릿 포인트로 변환
      .replace(/\n+/g, ' ') // 줄바꿈을 공백으로
      .trim();
    
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>보관함</h1>
        </div>
        <div className={styles.loadingContainer}>로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>보관함</h1>
        </div>
        <div className={styles.errorContainer}>오류: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>보관함</h1>
      </div>

      <div className={styles.archiveList}>
        {articles.length === 0 ? (
          <div className={styles.emptyState}>
            생성된 아티클이 없습니다.
          </div>
        ) : (
          articles.map(article => (
            <div key={article.articleId} className={styles.archiveItem}>
              <div 
                className={styles.archiveContent}
                onClick={() => onDraftClick(article.articleId.toString())}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.archiveTitle}>{article.title}</div>
                <div className={styles.archiveInfo}>
                  생성일: {new Date(article.createdAt).toLocaleDateString()}
                  {article.updatedAt !== article.createdAt && (
                    <> • 수정일: {new Date(article.updatedAt).toLocaleDateString()}</>
                  )}
                </div>
                <div className={styles.archivePreview}>
                  {getPreviewContent(article.content)}
                </div>
              </div>
              <div className={styles.archiveActions}>
                <button
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(article.articleId.toString());
                  }}
                  title="삭제"
                >
                  <IoTrash size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArchivePage; 