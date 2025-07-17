import React, { useState, useEffect } from 'react';
import { IoArrowBack, IoCreate } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { articleService, ArticleResponse, UpdateArticleDto, ArchiveResponse } from '../../services/articleService';
import YooptaEditorWrapper from '../../components/YooptaEditor';
import MarkdownRenderer from '../../utils/markdownRenderer';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useToastHelpers } from '../../hooks/useToast';

interface ArchiveDetailPageProps {
  draftId: string;
  onBack: () => void;
}

const ArchiveDetailPage: React.FC<ArchiveDetailPageProps> = ({ draftId, onBack }) => {
  const [article, setArticle] = useState<ArticleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [currentArchive, setCurrentArchive] = useState<ArchiveResponse | null>(null);
  const { showSuccess, showError } = useToastHelpers();

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const articleData = await articleService.getArticle(parseInt(draftId));
        setArticle(articleData);
        
        // 기본적으로 최신 버전 선택
        if (articleData.archives && articleData.archives.length > 0) {
          const latestArchive = articleData.archives[0]; // 이미 정렬된 상태
          setSelectedVersionNumber(latestArchive.versionNumber);
          setCurrentArchive(latestArchive);
          setEditTitle(latestArchive.title);
          setEditContent(latestArchive.content);
        } else {
          // 아카이브가 없는 경우 기본값 사용
          setEditTitle(articleData.title);
          setEditContent(articleData.content);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [draftId]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!article) return;
    
    try {
      setSaving(true);
      const updateData: UpdateArticleDto = {
        title: editTitle,
        content: editContent,
      };
      
      const updatedArticle = await articleService.updateArticle(article.articleId, updateData);
      setArticle(updatedArticle);
      
      // 새로운 버전이 생성되었는지 확인하고 최신 버전으로 전환
      if (updatedArticle.archives && updatedArticle.archives.length > 0) {
        const latestArchive = updatedArticle.archives[0]; // 이미 정렬된 상태
        setSelectedVersionNumber(latestArchive.versionNumber);
        setCurrentArchive(latestArchive);
        setEditTitle(latestArchive.title);
        setEditContent(latestArchive.content);
      }
      
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentArchive) {
      setEditTitle(currentArchive.title);
      setEditContent(currentArchive.content);
    } else {
      setEditTitle(article?.title || '');
      setEditContent(article?.content || '');
    }
    setIsEditing(false);
  };

  const handleVersionSelect = (versionNumber: number) => {
    if (!article || !article.archives) return;
    
    const selectedArchive = article.archives.find(archive => archive.versionNumber === versionNumber);
    if (selectedArchive) {
      setSelectedVersionNumber(versionNumber);
      setCurrentArchive(selectedArchive);
      setEditTitle(selectedArchive.title);
      setEditContent(selectedArchive.content);
      setIsEditing(false); // 버전 변경 시 편집 모드 종료
    }
  };


  if (loading) {
    return <div className={styles.loadingContainer}>로딩 중...</div>;
  }

  if (error) {
    return <div className={styles.errorContainer}>오류: {error}</div>;
  }

  if (!article) {
    return <div className={styles.errorContainer}>아티클을 찾을 수 없습니다.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <button className={styles.backButton} onClick={onBack}>
          <IoArrowBack size={20} />
        </button>
        <h1 className={styles.detailTitle}>
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={styles.editTitleInput}
              placeholder="제목을 입력하세요"
            />
          ) : (
            currentArchive?.title || article.title
          )}
        </h1>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <h2 className={styles.sectionTitle}>
              {isEditing ? '편집' : '미리보기'}
            </h2>
            <div className={styles.versionControls}>
              {article.archives && article.archives.length > 0 && (
                <div className={styles.versionSelector}>
                  <label htmlFor="version-select" className={styles.versionLabel}>
                    버전:
                  </label>
                  <select
                    id="version-select"
                    value={selectedVersionNumber || ''}
                    onChange={(e) => handleVersionSelect(parseInt(e.target.value))}
                    className={styles.versionSelect}
                    disabled={isEditing}
                  >
                    {article.archives.map(archive => (
                      <option key={archive.versionNumber} value={archive.versionNumber}>
                        {archive.versionNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {!isEditing && (
                <button 
                  className={styles.exportButton}
                  onClick={async () => {
                    const content = currentArchive?.content || article?.content || '';
                    const title = currentArchive?.title || article?.title || '';
                    
                    if (!title.trim() || !content.trim()) {
                      showError('내보내기 실패', '제목과 내용이 모두 있어야 내보낼 수 있습니다.');
                      return;
                    }

                    // 현재 활성 탭이 maily.so 편집 페이지인지 확인
                    try {
                      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                      const currentTab = tabs[0];
                      
                      if (currentTab?.url && 
                          currentTab.url.includes('maily.so') && 
                          (currentTab.url.includes('/edit') || currentTab.url.includes('/new') || currentTab.url.includes('/drafts'))) {
                        
                        // maily.so 편집 페이지가 활성화되어 있으면 content script로 붙여넣기
                        const response = await chrome.tabs.sendMessage(currentTab.id!, {
                          type: 'PASTE_TO_MAILY',
                          content: content
                        });

                        if (response.success) {
                          showSuccess('내보내기 완료', 'maily.so 페이지에 내용이 붙여넣어졌습니다.');
                        } else {
                          showError('내보내기 실패', response.error || '붙여넣기에 실패했습니다.');
                        }
                      } else {
                        // maily.so 편집 페이지가 아니면 안내 메시지
                        showError('내보내기 실패', 'maily.so 뉴스레터 편집 또는 생성 페이지에서만 사용할 수 있습니다.');
                      }
                    } catch (error) {
                      showError('내보내기 실패', '탭 정보를 확인할 수 없거나 content script와 통신에 실패했습니다.');
                    }
                  }}
                >
                  maily.so로 내보내기
                </button>
              )}
              
              <div className={styles.headerActionButtons}>
                {isEditing ? (
                  <>
                    <button 
                      className={styles.saveButton}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? '저장 중...' : '저장'}
                    </button>
                    <button 
                      className={styles.cancelButton}
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button className={styles.editButton} onClick={handleEdit} title="초안 수정하기">
                    <IoCreate size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className={styles.previewContent}>
            {isEditing ? (
              <ErrorBoundary>
                <YooptaEditorWrapper
                  key={`editor-${article.articleId}-${isEditing}`}
                  content={editContent}
                  onChange={setEditContent}
                  placeholder="내용을 입력하세요..."
                  readOnly={false}
                />
              </ErrorBoundary>
            ) : (
              <MarkdownRenderer 
                content={currentArchive?.content || article.content || ''}
                className={styles.contentDisplay}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveDetailPage; 