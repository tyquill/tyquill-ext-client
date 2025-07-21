import React, { useState, useEffect } from 'react';
import { IoArrowBack, IoCreate } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { articleService, ArticleResponse, UpdateArticleDto, ArchiveResponse } from '../../services/articleService';
import YooptaEditorWrapper from '../../components/Editor';
import MarkdownRenderer from '../../utils/markdownRenderer';
import ErrorBoundary from '../../components/ErrorBoundary';
import ExportButton from '../components/ExportButton';
import { useEditor } from '@tiptap/react'
import { CharacterCount } from '@tiptap/extension-character-count'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

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

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const articleData = await articleService.getArticle(parseInt(draftId));
        
        // 연속된 개행 정리 - 저장 시마다 개행이 늘어나는 문제 해결
        const normalizeContent = (content: string) => {
          return content.replace(/\n{2,}/g, '\n').trim();
        };

        // 아티클 데이터 정리
        const normalizedArticle = {
          ...articleData,
          content: normalizeContent(articleData.content),
          archives: articleData.archives?.map(archive => ({
            ...archive,
            content: normalizeContent(archive.content)
          }))
        };
        
        setArticle(normalizedArticle);
        
        // 기본적으로 최신 버전 선택
        if (normalizedArticle.archives && normalizedArticle.archives.length > 0) {
          const latestArchive = normalizedArticle.archives[0]; // 이미 정렬된 상태
          setSelectedVersionNumber(latestArchive.versionNumber);
          setCurrentArchive(latestArchive);
          setEditTitle(latestArchive.title);
          setEditContent(latestArchive.content);
        } else {
          // 아카이브가 없는 경우 기본값 사용
          setEditTitle(normalizedArticle.title);
          setEditContent(normalizedArticle.content);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [draftId]);

  // Character count를 위한 별도 에디터 (읽기 전용)
  const countEditor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      CharacterCount.configure({
        limit: null, // 제한 없음
        mode: 'textSize', // 텍스트만 카운트 (HTML 태그 제외)
      })
    ],
    content: '', // 빈 내용으로 시작
    editable: false,
    onCreate: ({ editor }) => {
      // 에디터가 생성된 후 초기 내용을 설정
      const initialContent = currentArchive?.content || article?.content || '';
      if (initialContent) {
        editor.commands.setContent(initialContent);
      }
    },
  });

  // Character count 강제 업데이트를 위한 state
  const [characterCount, setCharacterCount] = useState({ characters: 0, words: 0 });

  // 컨텐츠가 변경될 때마다 카운트 에디터 업데이트
  useEffect(() => {
    if (!countEditor) return;
    
    // 편집 중일 때는 editContent를, 그렇지 않을 때는 현재 아카이브나 아티클 내용을 사용
    const contentToCount = isEditing 
      ? editContent 
      : (currentArchive?.content || article?.content || '');
    
    // 내용이 있을 때만 업데이트
    if (contentToCount !== undefined && contentToCount !== null) {
      countEditor.commands.setContent(contentToCount);
      
      // 설정 후 잠시 기다린 다음 character count 업데이트
      setTimeout(() => {
        if (countEditor.storage.characterCount) {
          setCharacterCount({
            characters: countEditor.storage.characterCount.characters(),
            words: countEditor.storage.characterCount.words()
          });
        }
      }, 50); // 50ms 지연으로 에디터가 내용을 처리할 시간 제공
    }
  }, [countEditor, currentArchive?.content, article?.content, editContent, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!article) return;
    
    try {
      setSaving(true);
      
      // 저장 전에 콘텐츠 정리
      const normalizedContent = editContent.replace(/\n{2,}/g, '\n').trim();
      
      const updateData: UpdateArticleDto = {
        title: editTitle,
        content: normalizedContent,
      };
      
      const updatedArticle = await articleService.updateArticle(article.articleId, updateData);
      
      // 응답 데이터 정리
      const normalizedResponse = {
        ...updatedArticle,
        content: updatedArticle.content.replace(/\n{2,}/g, '\n').trim(),
        archives: updatedArticle.archives?.map(archive => ({
          ...archive,
          content: archive.content.replace(/\n{2,}/g, '\n').trim()
        }))
      };
      
      setArticle(normalizedResponse);
      
      // 새로운 버전이 생성되었는지 확인하고 최신 버전으로 전환
      if (normalizedResponse.archives && normalizedResponse.archives.length > 0) {
        const latestArchive = normalizedResponse.archives[0]; // 이미 정렬된 상태
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
        <div style={{ flex: 1 }}>
          <h1 className={styles.detailTitle}>
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                style={{width: '100%'}}
                onChange={(e) => setEditTitle(e.target.value)}
                className={styles.editTitleInput}
                placeholder="제목을 입력하세요"
              />
            ) : (
              currentArchive?.title || article.title
            )}
          </h1>
          <div className={styles.characterCount} style={{display: 'flex', justifyContent: 'flex-end'}}>
            <span>글자수: {characterCount.characters}</span>
            <span style={{ marginLeft: '12px' }}>단어수: {characterCount.words}</span>
          </div>
        </div>
      </div>

      <div className={styles.actionButtons}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div className={styles.rightActionButtons}>
          {!isEditing && (
            <>
              <ExportButton 
                title={currentArchive?.title || article.title}
                content={currentArchive?.content || article.content}
              />
              <button className={styles.editButton} onClick={handleEdit} title="초안 수정하기">
                <IoCreate size={20} />
                수정
              </button>
            </>
          )}
          {isEditing && (
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
          )}
          </div>
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
          </div>
        </div>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.previewContainer}>
          {/* <div className={styles.previewHeader}>
            <h2 className={styles.sectionTitle}>
              {isEditing ? '편집' : '미리보기'}
            </h2>
          </div> */}
          
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