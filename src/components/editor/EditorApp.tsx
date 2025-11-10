import React, { useState, useEffect, useCallback, useRef } from 'react';
import { browser } from 'wxt/browser';
import { articleService, UpdateArticleDto, VersionHistoryItem } from '../../services/articleService';
import EditorWrapper from '../sidepanel/Editor/Editor';
import VersionHistoryPanel from './VersionHistoryPanel';
import RestoreToast from './RestoreToast';
import { IoSave, IoClose, IoArrowBack, IoTimeOutline } from 'react-icons/io5';
import { trackPageViewBridge, trackPageExitBridge, trackArchiveEditStartedBridge, trackArchiveEditSavedBridge, trackArchiveEditCancelledBridge, trackArchiveFullscreenEditorOpenedBridge } from '../../analytics/bridge';
import { useI18n } from '../../hooks/useI18n';
import { useLanguageStore } from '../../stores/languageStore';
import { formatRelativeTime } from '../../utils/timeFormat';
import styles from './EditorApp.module.css';
// Import NotionEditor CSS to ensure it's loaded in dev mode
import '../sidepanel/Editor/NotionEditor.module.css';

interface EditorData {
  articleId: string; // UUID
  title: string;
  content: string;
  contentFormat?: 'markdown' | 'tiptap-json';
  originalTitle: string;
  originalContent: string;
  originalContentFormat?: 'markdown' | 'tiptap-json';
}

const EditorApp: React.FC = () => {
  const { t } = useI18n();
  const { initializeLanguage } = useLanguageStore();
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<string | object>('');
  const [contentFormat, setContentFormat] = useState<'markdown' | 'tiptap-json'>('markdown');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const pageStartTimeRef = useRef<number>(Date.now());

  // Version history state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [previewingVersion, setPreviewingVersion] = useState<VersionHistoryItem | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number | undefined>(undefined);

  // Toast state
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [restoredVersionInfo, setRestoredVersionInfo] = useState<{ versionNumber: number; timestamp: string } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // 언어 설정 초기화 및 실시간 변경 감지
  useEffect(() => {
    initializeLanguage();

    // Storage 변경 감지 - 사이드 패널에서 언어가 변경되면 즉시 반영
    const handleStorageChange = (
      changes: { [key: string]: browser.Storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'sync' && changes['tyquill-language-preference']) {
        initializeLanguage();
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [initializeLanguage]);

  // browser.storage.local에서 데이터 읽기 및 편집기 상태 설정
  useEffect(() => {
    const loadEditorData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionKey = urlParams.get('sessionKey');
      
      if (sessionKey) {
        try {
          // browser.storage.local에서 데이터 읽기 (anchor 링크나 특수 문자 안전 처리)
          const result = await browser.storage.local.get(sessionKey);
          const data = result[sessionKey];
          
          if (!data) {
            throw new Error('Editor data not found.');
          }
          
          setEditorData(data);
          setTitle(data.title);

          // Parse content based on format
          const format = data.contentFormat || 'markdown';
          setContentFormat(format);

          if (format === 'tiptap-json' && typeof data.content === 'string') {
            try {
              const parsedContent = JSON.parse(data.content);
              setContent(parsedContent);
            } catch (error) {
              console.warn('Failed to parse TipTap JSON, falling back to markdown:', error);
              setContent(data.content);
              setContentFormat('markdown');
            }
          } else {
            setContent(data.content);
          }

          // Track fullscreen editor opened event
          trackArchiveFullscreenEditorOpenedBridge({
            article_id: data.articleId,
            article_title: data.title,
            content_length: data.content.length,
            has_changes: false
          }).catch(() => {});

          // Track page view for fullscreen editor
          pageStartTimeRef.current = Date.now();
          trackPageViewBridge({
            page: 'fullscreen_editor',
            page_detail: data.articleId.toString(),
            article_id: data.articleId,
            article_title: data.title,
            editor_type: 'fullscreen'
          }).catch(() => {});
          
          // 사용한 데이터 정리
          await browser.storage.local.remove(sessionKey);
          
          // 편집기 페이지가 열렸음을 storage에 저장
          await browser.storage.local.set({
            [`tyquill-editor-open-${data.articleId}`]: {
              articleId: data.articleId,
              timestamp: Date.now()
            }
          });

          // Load current version number
          try {
            const versions = await articleService.getArticleVersions(data.articleId);
            if (versions.length > 0) {
              setCurrentVersionNumber(versions[0].versionNumber);
            }
          } catch (error) {
            console.warn('Failed to load current version number:', error);
            // Continue without version number - non-critical
          }

        } catch (error) {
          console.error('Failed to load editor data:', error);
          alert('Failed to load editor data. Please try again.');
          window.close();
        }
      } else {
        alert('No editor data available.');
        window.close();
      }
    };
    
    loadEditorData();
  }, []);

  // 페이지 언로드 시 편집기 상태 정리 및 페이지 이탈 추적
  useEffect(() => {
    const handleUnload = () => {
      if (editorData) {
        browser.storage.local.remove(`tyquill-editor-open-${editorData.articleId}`);

        // Track page exit
        const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
        if (duration > 0) {
          trackPageExitBridge({
            page: 'fullscreen_editor',
            page_detail: editorData.articleId.toString(),
            article_id: editorData.articleId,
            duration,
            has_unsaved_changes: hasChanges,
            editor_type: 'fullscreen',
            next_page: 'window_closed'
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
      // 컴포넌트 언마운트 시에도 정리
      if (editorData) {
        browser.storage.local.remove(`tyquill-editor-open-${editorData.articleId}`);

        // Track page exit on component unmount
        const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
        if (duration > 0) {
          trackPageExitBridge({
            page: 'fullscreen_editor',
            page_detail: editorData.articleId.toString(),
            article_id: editorData.articleId,
            duration,
            has_unsaved_changes: hasChanges,
            editor_type: 'fullscreen',
            next_page: 'component_unmount'
          }).catch(() => {});
        }
      }
    };
  }, [editorData, hasChanges]);

  // 변경사항 감지
  useEffect(() => {
    if (!editorData) return;

    // Serialize content for comparison
    const currentContent = typeof content === 'string'
      ? content
      : JSON.stringify(content);

    const titleChanged = title !== editorData.originalTitle;
    const contentChanged = currentContent !== editorData.originalContent;

    // 컨텐츠가 변경되었고 실행 취소가 가능한 경우에만 hasChanges를 true로 설정
    // 실행 취소가 불가능하면 초기 상태로 돌아간 것으로 간주
    const hasChanged = (titleChanged || contentChanged) && canUndo;
    setHasChanges(hasChanged);
  }, [title, content, editorData, canUndo]);

  // 페이지 닫기 전 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  const handleSave = useCallback(async () => {
    if (!editorData) return;

    try {
      setSaving(true);

      // Serialize content based on type
      let serializedContent: string;
      if (typeof content === 'string') {
        // Markdown content - normalize whitespace
        serializedContent = content.replace(/\n{2,}/g, '\n').trim();
      } else {
        // TipTap JSON object - stringify
        serializedContent = JSON.stringify(content);
      }

      const updateData: UpdateArticleDto = {
        title: title.trim(),
        content: serializedContent,
        contentFormat: contentFormat,
      };

      await articleService.updateArticle(editorData.articleId, updateData);

      // Track save event
      trackArchiveEditSavedBridge({
        article_id: editorData.articleId,
        article_title: title.trim(),
        content_length: serializedContent.length,
        title_changed: title.trim() !== editorData.originalTitle,
        content_changed: serializedContent !== editorData.originalContent,
        editor_type: 'fullscreen',
        session_duration: Math.round((Date.now() - pageStartTimeRef.current) / 1000)
      }).catch(() => {});

      // Update current version number after save
      try {
        const versions = await articleService.getArticleVersions(editorData.articleId);
        if (versions.length > 0) {
          setCurrentVersionNumber(versions[0].versionNumber);
        }
      } catch (error) {
        console.warn('Failed to update version number after save:', error);
        // Continue - non-critical
      }

      // 저장 성공 시 변경사항 플래그 및 실행 취소 상태 초기화
      setHasChanges(false);
      setCanUndo(false);

      // storage에 저장 완료 신호 보내기
      browser.storage.local.set({
        [`tyquill-editor-saved-${editorData.articleId}`]: {
          articleId: editorData.articleId,
          timestamp: Date.now()
        }
      });

    } catch (error: any) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [editorData, title, content, contentFormat]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) return;
    }

    // Track cancel event
    if (editorData) {
      // Serialize content for comparison
      const currentContent = typeof content === 'string'
        ? content
        : JSON.stringify(content);

      trackArchiveEditCancelledBridge({
        article_id: editorData.articleId,
        had_changes: hasChanges,
        title_changed: title !== editorData.originalTitle,
        content_changed: currentContent !== editorData.originalContent,
        editor_type: 'fullscreen',
        session_duration: Math.round((Date.now() - pageStartTimeRef.current) / 1000)
      }).catch(() => {});
    }

    window.close();
  }, [hasChanges, editorData, title, content]);

  // Helper function to apply article content with proper parsing
  const applyArticleContent = useCallback((
    content: string,
    format: 'markdown' | 'tiptap-json'
  ) => {
    if (format === 'tiptap-json') {
      try {
        const parsedContent = JSON.parse(content);
        setContent(parsedContent);
        setContentFormat('tiptap-json');
      } catch (error) {
        console.warn('Failed to parse TipTap JSON, falling back to markdown:', error);
        setContent(content);
        setContentFormat('markdown');
      }
    } else {
      setContent(content);
      setContentFormat('markdown');
    }
  }, []);

  // Version history handlers
  const handleVersionSelect = useCallback((version: VersionHistoryItem) => {
    // Preview the selected version
    setPreviewingVersion(version);
    setTitle(version.title);
    applyArticleContent(version.content, version.contentFormat);
  }, [applyArticleContent]);

  const handleVersionRestore = useCallback(async (version: VersionHistoryItem) => {
    if (!editorData) return;

    try {
      // Call restore API
      const restored = await articleService.restoreVersion(editorData.articleId, version.versionNumber);

      // Update editor state with restored content
      setTitle(restored.title);
      applyArticleContent(restored.content, restored.contentFormat || 'markdown');

      // Update current version number after restore
      try {
        const versions = await articleService.getArticleVersions(editorData.articleId);
        if (versions.length > 0) {
          setCurrentVersionNumber(versions[0].versionNumber);
        }
      } catch (error) {
        console.warn('Failed to update version number after restore:', error);
      }

      // Clear preview state
      setPreviewingVersion(null);
      setHasChanges(false);
      setCanUndo(false);

      // Close version history panel
      setShowVersionHistory(false);

      // Show success toast
      setRestoredVersionInfo({
        versionNumber: version.versionNumber,
        timestamp: formatRelativeTime(version.createdAt),
      });
      setShowRestoreToast(true);
    } catch (error: any) {
      console.error('Failed to restore version:', error);
      // Show error message
      setRestoreError(error.message || 'Unknown error');
      throw error;
    }
  }, [editorData, applyArticleContent]);

  const handleBackToCurrent = useCallback(async () => {
    if (!editorData) return;

    try {
      // Reload current article
      const current = await articleService.getArticle(editorData.articleId);

      setTitle(current.title);
      applyArticleContent(current.content, current.contentFormat || 'markdown');
      setPreviewingVersion(null);
    } catch (error) {
      console.error('Failed to load current version:', error);
      alert('Failed to load current version');
    }
  }, [editorData, applyArticleContent]);

  const handleToastClose = useCallback(() => {
    setShowRestoreToast(false);
    setRestoredVersionInfo(null);
  }, []);

  const handleErrorClose = useCallback(() => {
    setRestoreError(null);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      if (showVersionHistory) {
        setShowVersionHistory(false);
        setPreviewingVersion(null);
      } else if (previewingVersion) {
        handleBackToCurrent();
      } else {
        handleCancel();
      }
    }
    // Cmd/Ctrl + H for version history
    if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
      e.preventDefault();
      setShowVersionHistory(prev => {
        // 패널을 닫을 때는 프리뷰도 함께 리셋
        if (prev) {
          setPreviewingVersion(null);
        }
        return !prev;
      });
    }
  }, [handleSave, handleCancel, showVersionHistory, previewingVersion, handleBackToCurrent]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 에디터 변경 핸들러
  const handleEditorChange = useCallback((newContent: string | object, format: 'markdown' | 'tiptap-json') => {
    setContent(newContent);
    setContentFormat(format);
  }, []);

  // 히스토리 상태 변경 핸들러
  const handleHistoryStateChange = useCallback((canUndoState: boolean, canRedoState: boolean) => {
    setCanUndo(canUndoState);
  }, []);

  if (!editorData) {
    return (
      <div className={styles.loadingContainer}>
        <div>Preparing editor...</div>
      </div>
    );
  }

  return (
    <div className={styles.editorContainer}>
      {/* Error banner */}
      {restoreError && (
        <div className={styles.errorBanner}>
          <div className={styles.errorText}>
            Failed to restore version: {restoreError}
          </div>
          <button onClick={handleErrorClose} className={styles.errorCloseButton}>
            ×
          </button>
        </div>
      )}

      {/* Version preview banner */}
      {previewingVersion && (
        <div className={styles.versionPreviewBanner}>
          <div className={styles.versionPreviewText}>
            {t('editor_viewingVersion')} {formatRelativeTime(previewingVersion.createdAt)}
          </div>
          <div className={styles.versionPreviewActions}>
            <button
              onClick={handleBackToCurrent}
              className={styles.backToCurrentButton}
            >
              {t('editor_backToCurrent')}
            </button>
          </div>
        </div>
      )}

      {/* Subtle action buttons in top-right corner */}
      <div className={styles.actionBar}>
        <div className={styles.statusIndicator}>
          {saving ? (
            <span className={styles.savingStatus}>{t('editor_saving')}</span>
          ) : hasChanges ? (
            <span className={styles.unsavedStatus}>{t('editor_unsaved')}</span>
          ) : (
            <span className={styles.savedStatus}>{t('editor_saved')}</span>
          )}
        </div>

        <div className={styles.actionButtons}>
          <button
            onClick={() => setShowVersionHistory(true)}
            className={styles.versionHistoryButton}
            title={t('editor_versionHistoryTooltip')}
          >
            <IoTimeOutline size={16} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges || !!previewingVersion}
            className={styles.saveButton}
            title={t('editor_saveTooltip')}
          >
            <IoSave size={16} />
          </button>

          <button
            onClick={handleCancel}
            disabled={saving}
            className={styles.cancelButton}
            title={t('editor_closeTooltip')}
          >
            <IoClose size={16} />
          </button>
        </div>
      </div>

      {/* Centered content area */}
      <div className={styles.contentArea}>
        {/* Large title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.titleInput}
          placeholder="Untitled"
        />

        {/* Editor with seamless integration */}
        <div className={styles.editorWrapper}>
          <EditorWrapper
            content={content}
            contentFormat={contentFormat}
            onChange={handleEditorChange}
            placeholder="Type something..."
            readOnly={saving || !!previewingVersion}
            onHistoryStateChange={handleHistoryStateChange}
          />
        </div>
      </div>

      {/* Version History Panel */}
      {showVersionHistory && editorData && (
        <VersionHistoryPanel
          articleId={editorData.articleId}
          currentVersionNumber={currentVersionNumber}
          onClose={() => {
            setShowVersionHistory(false);
            setPreviewingVersion(null);
          }}
          onVersionSelect={handleVersionSelect}
          onRestore={handleVersionRestore}
        />
      )}

      {/* Restore Success Toast */}
      {showRestoreToast && restoredVersionInfo && (
        <RestoreToast
          versionNumber={restoredVersionInfo.versionNumber}
          timestamp={restoredVersionInfo.timestamp}
          onClose={handleToastClose}
        />
      )}
    </div>
  );
};

export default EditorApp;
