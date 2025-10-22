import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IoArrowBack, IoCreate, IoClose, IoCheckmark, IoChevronDown, IoChevronUp, IoBrush, IoDocumentText, IoLink, IoTimeOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { CgArrowsExpandRight } from "react-icons/cg";
import { browser } from 'wxt/browser';
import styles from './PageStyles.module.css';
import detailStyles from './ArchiveDetailPage.module.css';
import layoutStyles from './CommonLayout.module.css';
import { articleService, ArticleResponse, UpdateArticleDto, ArchiveResponse } from '../../services/articleService';
import EditorWrapper from '../../components/sidepanel/Editor/Editor';
import MarkdownRenderer from '../../utils/markdownRenderer';
import { markdownToHtml } from '../../utils/markdownConverter';
import ErrorBoundary from '../../components/ErrorBoundary';
import ExportButton from '../../components/sidepanel/ExportButton/ExportButton';
import CopyButton from '../../components/sidepanel/CopyButton/CopyButton';
import { useEditor } from '@tiptap/react';
import { generateHTML } from '@tiptap/core';
import { CharacterCount } from '@tiptap/extension-character-count';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Tooltip from '../../components/common/Tooltip'; // Tooltip 컴포넌트 import
import { useI18n } from '../../hooks/useI18n';
import { formatRelativeTime } from '../../utils/timeFormat';
import {
  trackArchiveContentCopiedBridge,
  trackArchiveExportedBridge,
  trackArchiveEditStartedBridge,
  trackArchiveEditSavedBridge,
  trackArchiveEditCancelledBridge,
  trackArchiveFullscreenEditorOpenedBridge,
  trackArchiveVersionChangedBridge
} from '../../analytics/bridge';

interface ArchiveDetailPageProps {
  draftId: string;
  onBack: () => void;
}

// Scraps Section Component with collapsible functionality
interface ScrapsSectionProps {
  scraps: Array<{
    scrapId: number;
    title: string;
    url: string;
    userComment?: string;
  }>;
}

const ScrapsSectionComponent: React.FC<ScrapsSectionProps> = ({ scraps }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { t } = useI18n();

  return (
    <div className={detailStyles.metadataRow}>
      <span className={detailStyles.metadataLabel}>
        <IoDocumentText size={14} className={detailStyles.metadataIcon} />
        {t('archiveDetailPage_sources')}
      </span>
      <div
        className={detailStyles.scrapsBadge}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={detailStyles.scrapsCount}>{scraps.length}{t('archiveDetailPage_itemsCount')}</span>
        <IoChevronDown
          size={14}
          className={`${detailStyles.chevronIcon} ${isExpanded ? detailStyles.expanded : ''}`}
        />
      </div>
      {isExpanded && (
        <div className={detailStyles.scrapsList} style={{ width: '100%' }}>
          {scraps.map((scrap) => (
            <div key={scrap.scrapId} className={detailStyles.scrapItem}>
              <div className={detailStyles.scrapTitle}>
                <IoDocumentText size={12} className={detailStyles.scrapTitleIcon} />
                <span>{scrap.title || 'Untitled'}</span>
              </div>

              {scrap.url && (
                <div className={detailStyles.scrapUrl}>
                  <IoLink size={10} className={detailStyles.scrapUrlIcon} />
                  <span>{scrap.url}</span>
                </div>
              )}

              {scrap.userComment && (
                <div className={detailStyles.scrapComment}>
                  "{scrap.userComment}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ArchiveDetailPage: React.FC<ArchiveDetailPageProps> = ({ draftId, onBack }) => {
  const { t } = useI18n();
  const [article, setArticle] = useState<ArticleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState<string | object>('');
  const [editContentFormat, setEditContentFormat] = useState<'markdown' | 'tiptap-json'>('markdown');
  const [saving, setSaving] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [currentArchive, setCurrentArchive] = useState<ArchiveResponse | null>(null);
  const [showWidthTip, setShowWidthTip] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [previewingVersion, setPreviewingVersion] = useState<ArchiveResponse | null>(null);
  const [isEditorPageOpen, setIsEditorPageOpen] = useState(false);

  // 툴팁 표시 여부 확인
  useEffect(() => {
    browser.storage.local.get('tyquill-width-tip-dismissed', (result) => {
      const hasSeenWidthTip = result['tyquill-width-tip-dismissed'];
      if (!hasSeenWidthTip) {
        setShowWidthTip(true);
        setTimeout(() => {
          setTipVisible(true);
        }, 100);
      }
    });
  }, []);

  // 편집기 페이지 상태 확인
  useEffect(() => {
    if (!article) return;

    const checkEditorPageStatus = () => {
      browser.storage.local.get(`tyquill-editor-open-${article.articleId}`, (result) => {
        const editorStatus = result[`tyquill-editor-open-${article.articleId}`];
        const isOpen = editorStatus && (Date.now() - editorStatus.timestamp < 5 * 60 * 1000); // 5분 타임아웃
        
        setIsEditorPageOpen(isOpen);
        
        // 편집기 페이지가 열려있고 현재 편집 모드라면 편집 모드 종료
        if (isOpen && isEditing) {
          setIsEditing(false);
        }
      });
    };

    // 초기 확인
    checkEditorPageStatus();

    // storage 변화 감지
    const handleStorageChange = (changes: any) => {
      if (changes[`tyquill-editor-open-${article.articleId}`]) {
        checkEditorPageStatus();
      }
      
      // 편집기에서 저장 완료 신호 감지
      if (changes[`tyquill-editor-saved-${article.articleId}`]) {
        // 저장 신호 정리
        browser.storage.local.remove(`tyquill-editor-saved-${article.articleId}`);
        
        // 아티클 데이터만 새로고침
        setTimeout(async () => {
          await refreshArticleData();
        }, 1000);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    // 주기적으로 상태 확인 (5초마다)
    const interval = setInterval(checkEditorPageStatus, 5000);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
      clearInterval(interval);
    };
  }, [article?.articleId, isEditing]);

  // 아티클 데이터 새로고침 함수 (전체 페이지 리로드 없이)
  const refreshArticleData = useCallback(async () => {
    try {
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
      
      // 편집기에서 저장한 후이므로 항상 최신 버전으로 전환
      if (normalizedArticle.archives && normalizedArticle.archives.length > 0) {
        const latestArchive = normalizedArticle.archives[0]; // 이미 정렬된 상태 (최신 버전)
        
        setSelectedVersionNumber(latestArchive.versionNumber);
        setCurrentArchive(latestArchive);
        setEditTitle(latestArchive.title);
        setEditContent(latestArchive.content);
      } else {
        // 아카이브가 없는 경우 기본값 사용
        setEditTitle(normalizedArticle.title);
        setEditContent(normalizedArticle.content);
      }
      
      // 편집 모드 종료 (편집기 페이지에서 저장한 후이므로)
      setIsEditing(false);
      
    } catch (err: any) {
      console.error('Failed to refresh article data:', err);
      // 에러가 발생해도 사용자에게 알리지 않음 (백그라운드 새로고침)
    }
  }, [draftId]);

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
        setError(err.message || t('archiveDetailPage_loadArticleError'));
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

  const handleEdit = async () => {
    // 편집기 페이지가 열려있으면 편집 모드 진입 방지
    if (isEditorPageOpen) {
      alert(t('archiveDetailPage_editingInPageEditorAlert'));
      return;
    }

    try {
      await trackArchiveEditStartedBridge({
        article_id: article?.articleId,
        version_number: selectedVersionNumber,
        has_versions: (article?.archives?.length || 0) > 0,
        character_count: characterCount.characters,
        word_count: characterCount.words
      });
    } catch {}

    // Content format 확인 및 설정
    const archive = currentArchive || article?.archives?.[0];
    const format = (archive as any)?.contentFormat || 'markdown';
    setEditContentFormat(format);

    // JSON 형식이면 파싱
    if (format === 'tiptap-json' && typeof editContent === 'string') {
      try {
        setEditContent(JSON.parse(editContent));
      } catch {
        // 파싱 실패 시 마크다운으로 처리
        setEditContentFormat('markdown');
      }
    }

    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!article) return;

    try {
      setSaving(true);

      // Content 준비 (JSON 형식이면 문자열로 변환)
      const contentToSave = typeof editContent === 'object'
        ? JSON.stringify(editContent)
        : editContent.replace(/\n{2,}/g, '\n').trim();

      const updateData: UpdateArticleDto = {
        title: editTitle,
        content: contentToSave,
        contentFormat: editContentFormat,
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
      let newVersionNumber = null;
      if (normalizedResponse.archives && normalizedResponse.archives.length > 0) {
        const latestArchive = normalizedResponse.archives[0]; // 이미 정렬된 상태
        newVersionNumber = latestArchive.versionNumber;
        setSelectedVersionNumber(latestArchive.versionNumber);
        setCurrentArchive(latestArchive);
        setEditTitle(latestArchive.title);
        setEditContent(latestArchive.content);
      }

      // 저장 완료 이벤트 추적
      try {
        await trackArchiveEditSavedBridge({
          article_id: article.articleId,
          previous_version: selectedVersionNumber,
          new_version: newVersionNumber,
          content_changed: contentToSave !== (currentArchive?.content || article.content),
          title_changed: editTitle !== (currentArchive?.title || article.title),
          character_count_before: characterCount.characters,
          character_count_after: contentToSave.length
        });
      } catch {}

      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || t('archiveDetailPage_saveArticleError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      await trackArchiveEditCancelledBridge({
        article_id: article?.articleId,
        version_number: selectedVersionNumber,
        had_changes: editTitle !== (currentArchive?.title || article?.title) ||
                     editContent !== (currentArchive?.content || article?.content)
      });
    } catch {}

    if (currentArchive) {
      setEditTitle(currentArchive.title);
      setEditContent(currentArchive.content);
    } else {
      setEditTitle(article?.title || '');
      setEditContent(article?.content || '');
    }
    setIsEditing(false);
  };

  const handleOpenFullscreenEditor = async () => {
    if (!article) return;

    try {
      await trackArchiveFullscreenEditorOpenedBridge({
        article_id: article.articleId,
        version_number: selectedVersionNumber,
        character_count: characterCount.characters,
        word_count: characterCount.words,
        from_edit_mode: isEditing
      });
    } catch {}

    try {
      // 편집기로 전달할 데이터 준비
      const archive = currentArchive || article.archives?.[0];
      const contentFormat = (archive as any)?.contentFormat || 'markdown';

      // Content를 문자열로 변환 (JSON 형식이면 stringify)
      const contentToPass = typeof editContent === 'object'
        ? JSON.stringify(editContent)
        : editContent;

      const originalContent = currentArchive?.content || article.content;
      const originalContentToPass = typeof originalContent === 'object'
        ? JSON.stringify(originalContent)
        : originalContent;

      // originalContentFormat은 originalContent와 동일한 소스에서 파생
      const originalContentFormat = currentArchive
        ? ((currentArchive as any)?.contentFormat || 'markdown')
        : ((article as any)?.contentFormat || 'markdown');

      const editorData = {
        articleId: article.articleId,
        title: editTitle,
        content: contentToPass,
        contentFormat: contentFormat,
        originalTitle: currentArchive?.title || article.title,
        originalContent: originalContentToPass,
        originalContentFormat: originalContentFormat
      };

      // browser.storage.local을 사용하여 안전하게 데이터 전달 (anchor 링크나 특수 문자 처리)
      const sessionKey = `tyquill-editor-data-${Date.now()}-${Math.random()}`;
      await browser.storage.local.set({
        [sessionKey]: editorData
      });
      const editorUrl = `${browser.runtime.getURL('/editor.html')}?sessionKey=${sessionKey}`;

      // 새 탭에서 편집기 열기 - background script를 통해 처리
      const response = await browser.runtime.sendMessage({
        action: 'openFullscreenEditor',
        editorUrl
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to open fullscreen editor');
      }
    } catch (error) {
      console.error('Failed to open fullscreen editor:', error);
      // 사용자에게 에러 알림
      alert('Failed to open fullscreen editor. Please try again.');
    }
  };

  const handleVersionSelect = async (archive: ArchiveResponse) => {
    if (!article || !article.archives) return;

    const previousVersion = selectedVersionNumber;

    try {
      await trackArchiveVersionChangedBridge({
        article_id: article.articleId,
        previous_version: previousVersion,
        new_version: archive.versionNumber,
        total_versions: article.archives.length,
        was_editing: isEditing
      });
    } catch {}

    // Preview the selected version
    setPreviewingVersion(archive);
    setSelectedVersionNumber(archive.versionNumber);
    setCurrentArchive(archive);
    setEditTitle(archive.title);
    setEditContent(archive.content);
    setIsEditing(false); // 버전 변경 시 편집 모드 종료
  };

  const handleBackToCurrent = useCallback(async () => {
    if (!article || !article.archives) return;

    // Load the latest version
    const latestArchive = article.archives[0];
    if (latestArchive) {
      setSelectedVersionNumber(latestArchive.versionNumber);
      setCurrentArchive(latestArchive);
      setEditTitle(latestArchive.title);
      setEditContent(latestArchive.content);
      setPreviewingVersion(null);
    }
  }, [article]);

  const handleCloseTip = () => {
    setTipVisible(false);
    browser.storage.local.set({ 'tyquill-width-tip-dismissed': 'true' });
    setTimeout(() => {
      setShowWidthTip(false);
    }, 300);
  };


  if (loading) {
    return <div className={styles.loadingContainer}>{t('archiveDetailPage_loading')}</div>;
  }

  if (error) {
    return <div className={styles.errorContainer}>{t('archiveDetailPage_error')}: {error}</div>;
  }

  if (!article) {
    return <div className={styles.errorContainer}>{t('archiveDetailPage_articleNotFound')}</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={`${styles.page} ${layoutStyles.pageLayout}`}>
        <div className={layoutStyles.scrollableContent}>
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
                  placeholder={t('archiveDetailPage_titlePlaceholder')}
                />
              ) : (
                currentArchive?.title || article.title
              )}
            </h1>
          </div>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          {isEditorPageOpen && (
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'white'
              }} className={detailStyles.pulse}></div>
              {t('archiveDetailPage_editingInPageEditor')}
            </div>
          )}
          <div className={styles.characterCount} style={{display: 'flex'}}>
            <span>{t('archiveDetailPage_characterCount')}: {characterCount.characters}</span>
            <span style={{ marginLeft: '12px' }}>{t('archiveDetailPage_wordCount')}: {characterCount.words}</span>
          </div>
        </div>

        <div className={styles.actionButtons}>
          {!isEditing ? (
            // 미리보기 페이지: 한 줄 레이아웃 (왼쪽: 버전, 오른쪽: 액션 버튼들)
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div className={styles.versionControls}>
                {article.archives && article.archives.length > 0 && (
                  <Tooltip content={t('archiveDetailPage_versionHistory')} side='top'>
                    <button
                      className={detailStyles.versionHistoryButton}
                      onClick={() => setShowVersionHistory(true)}
                    >
                      <IoTimeOutline size={18} />
                      <span className={detailStyles.versionLabel}>v{selectedVersionNumber || ''}</span>
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className={styles.rightActionButtons} style={{display: 'flex'}}>
                {/* ExportButton only shows on supported platforms (Maily, LinkedIn, Substack, Ghost) */}
                <ExportButton
                  title={currentArchive?.title || article.title}
                  content={currentArchive?.content || article.content}
                  onExportSuccess={async (platform) => {
                    try {
                      await trackArchiveExportedBridge({
                        article_id: article.articleId,
                        version_number: selectedVersionNumber,
                        platform,
                        character_count: characterCount.characters,
                        word_count: characterCount.words
                      });
                    } catch {}
                  }}
                />
                <Tooltip content={t('archiveDetailPage_copyToClipboard')} side='top'>
                  <CopyButton
                    title={currentArchive?.title || article.title}
                    content={currentArchive?.content || article.content}
                    onCopySuccess={async () => {
                      try {
                        await trackArchiveContentCopiedBridge({
                          article_id: article.articleId,
                          version_number: selectedVersionNumber,
                          character_count: characterCount.characters,
                          word_count: characterCount.words,
                          copy_format: 'rich_text'
                        });
                      } catch {}
                    }}
                  />
                </Tooltip>
                <Tooltip content={isEditorPageOpen ? t('archiveDetailPage_editingInPageEditorTooltip') : t('archiveDetailPage_editDraft')}>
                  <button
                    className={detailStyles.primaryActionButton}
                    onClick={handleEdit}
                    disabled={isEditorPageOpen}
                    style={{
                      opacity: isEditorPageOpen ? 0.5 : 1,
                      cursor: isEditorPageOpen ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <IoCreate size={20} />
                  </button>
                </Tooltip>
              </div>
            </div>
          ) : (
            // 편집 페이지: 한 줄 레이아웃 (왼쪽: 버전, 오른쪽: 저장/취소 버튼들)
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div className={styles.versionControls}>
                {article.archives && article.archives.length > 0 && (
                  <Tooltip content={t('archiveDetailPage_versionHistory')} side='top'>
                    <button
                      className={detailStyles.versionHistoryButton}
                      onClick={() => setShowVersionHistory(true)}
                      disabled={saving}
                    >
                      <IoTimeOutline size={18} />
                      <span className={detailStyles.versionLabel}>v{selectedVersionNumber || ''}</span>
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className={styles.rightActionButtons} style={{display: 'flex'}}>
                <Tooltip content={t('archiveDetailPage_openFullscreenEditor')}>
                  <button 
                    className={detailStyles.editSecondaryButton}
                    onClick={handleOpenFullscreenEditor}
                    disabled={saving}
                  >
                    <CgArrowsExpandRight size={18} />
                  </button>
                </Tooltip>
                <Tooltip content={saving ? t('archiveDetailPage_saving') : t('archiveDetailPage_save')}>
                  <button 
                    className={detailStyles.editPrimaryButton}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <IoCheckmark size={18} />
                  </button>
                </Tooltip>
                <Tooltip content={t('archiveDetailPage_cancel')}>
                  <button 
                    className={detailStyles.editSecondaryButton}
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <IoClose size={18} />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Section */}
        {(article.writingStyleName || (article.scraps && article.scraps.length > 0)) && (
          <div className={detailStyles.metadataSection}>
            {/* Writing Style */}
            {article.writingStyleName && (
              <div className={detailStyles.metadataRow}>
                <span className={detailStyles.metadataLabel}>
                  <IoBrush size={14} className={detailStyles.metadataIcon} />
                  {t('archiveDetailPage_style')}
                </span>
                <span className={detailStyles.writingStyleBadge}>
                  {article.writingStyleName}
                </span>
              </div>
            )}

            {/* Scraps - Collapsible */}
            {article.scraps && article.scraps.length > 0 && (
              <ScrapsSectionComponent
                scraps={article.scraps}
              />
            )}
          </div>
        )}

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
                  <EditorWrapper
                    key={`editor-${article.articleId}-${isEditing}`}
                    content={editContent}
                    contentFormat={editContentFormat}
                    onChange={(content, format) => {
                      setEditContent(content);
                      setEditContentFormat(format);
                    }}
                    placeholder={t('archiveDetailPage_contentPlaceholder')}
                    readOnly={false}
                  />
                </ErrorBoundary>
              ) : (() => {
                const content = currentArchive?.content || article.content || '';
                const format = (currentArchive as any)?.contentFormat || 'markdown';

                // TipTap JSON 형식이면 HTML로 변환하여 직접 렌더링
                if (format === 'tiptap-json' && typeof content === 'string') {
                  try {
                    const jsonObj = JSON.parse(content);

                    // generateHTML로 JSON을 HTML로 변환 (NotionEditor와 동일한 extensions 사용)
                    const html = generateHTML(jsonObj, [
                      StarterKit.configure({
                        heading: {
                          levels: [1, 2, 3, 4, 5, 6],
                        },
                        horizontalRule: {
                          HTMLAttributes: {
                            class: 'notion-hr',
                          },
                        },
                      }),
                      TextStyle,
                      Underline,
                      TextAlign.configure({
                        types: ['heading', 'paragraph'],
                      }),
                    ]);

                    return (
                      <div
                        className={`${styles.contentDisplay} ProseMirror`}
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    );
                  } catch (error) {
                    console.error('Error converting TipTap JSON to HTML:', error);
                    return (
                      <div className={styles.contentDisplay}>
                        {content}
                      </div>
                    );
                  }
                }

                // 마크다운이면 MarkdownRenderer 사용
                return (
                  <MarkdownRenderer
                    content={content}
                    className={styles.contentDisplay}
                  />
                );
              })()}
            </div>
          </div>
        </div>

        {/* Width 조절 툴팁 */}
        {showWidthTip && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: 'rgba(26, 26, 26, 0.9)',
              color: 'white',
              padding: '10px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              zIndex: 10000,
              width: '300px',
              fontSize: '14px',
              lineHeight: '1.5',
              border: '1px solid rgba(51, 51, 51, 0.8)',
              backdropFilter: 'blur(10px)',
              opacity: tipVisible ? 1 : 0,
              transform: tipVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: tipVisible ? 'auto' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>{t('archiveDetailPage_widthTipTitle')}</div>
              <button
                onClick={handleCloseTip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <IoClose size={16} />
              </button>
            </div>

              <div style={{ marginBottom: '12px', marginLeft: '5px' }}>
                {t('archiveDetailPage_widthTipContent')}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#ccc' }}>
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => {
                      setDontShowAgain(e.target.checked);
                      if (e.target.checked) {
                        // 체크박스가 체크되면 자동으로 툴팁 닫기
                        handleCloseTip();
                      }
                    }}
                    style={{ margin: 0 }}
                  />
                  {t('archiveDetailPage_dontShowAgain')}
                </label>
              </div>
          </div>
        )}

        {/* Version Preview Banner */}
        {previewingVersion && previewingVersion.versionNumber !== article.archives?.[0]?.versionNumber && (
          <div className={detailStyles.versionPreviewBanner}>
            <div className={detailStyles.versionPreviewText}>
              {t('archiveDetailPage_viewingVersion')} {formatRelativeTime(previewingVersion.createdAt)}
            </div>
            <div className={detailStyles.versionPreviewActions}>
              <button
                onClick={handleBackToCurrent}
                className={detailStyles.backToCurrentButton}
              >
                {t('archiveDetailPage_backToCurrent')}
              </button>
            </div>
          </div>
        )}

        {/* Version History Panel */}
        {showVersionHistory && article && article.archives && article.archives.length > 0 && (
          <>
            {/* Backdrop */}
            <div className={detailStyles.versionHistoryBackdrop} onClick={() => {
              setShowVersionHistory(false);
              setPreviewingVersion(null);
            }} />

            {/* Panel */}
            <div className={detailStyles.versionHistoryPanel}>
              {/* Header */}
              <div className={detailStyles.versionHistoryHeader}>
                <h2 className={detailStyles.versionHistoryTitle}>{t('archiveDetailPage_versionHistoryTitle')}</h2>
                <button
                  onClick={() => {
                    setShowVersionHistory(false);
                    setPreviewingVersion(null);
                  }}
                  className={detailStyles.versionHistoryCloseButton}
                  title={t('common_close')}
                >
                  <IoClose size={20} />
                </button>
              </div>

              {/* Content */}
              <div className={detailStyles.versionHistoryContent}>
                <div className={detailStyles.versionList}>
                  {article.archives.map((archive) => {
                    const isSelected = selectedVersionNumber === archive.versionNumber;
                    const isCurrent = article.archives?.[0]?.versionNumber === archive.versionNumber;

                    return (
                      <div
                        key={archive.versionNumber}
                        className={`${detailStyles.versionItem} ${isSelected ? detailStyles.versionItemSelected : ''} ${isCurrent ? detailStyles.versionItemCurrent : ''}`}
                        onClick={() => handleVersionSelect(archive)}
                      >
                        <div className={detailStyles.versionItemHeader}>
                          <div className={detailStyles.versionNumber}>
                            {isCurrent && (
                              <IoCheckmarkCircle
                                size={14}
                                className={detailStyles.versionCurrentIcon}
                              />
                            )}
                            v{archive.versionNumber}
                          </div>
                          <div className={detailStyles.versionTime}>
                            {formatRelativeTime(archive.createdAt)}
                          </div>
                        </div>

                        <div className={detailStyles.versionItemBody}>
                          <div className={detailStyles.versionTitle}>
                            {archive.title || 'Untitled'}
                          </div>
                          <div className={detailStyles.versionMeta}>
                            {archive.content?.length.toLocaleString() || 0} {t('archiveDetailPage_characters')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default ArchiveDetailPage;