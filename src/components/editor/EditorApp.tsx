import React, { useState, useEffect, useCallback, useRef } from 'react';
import { browser } from 'wxt/browser';
import { articleService, UpdateArticleDto } from '../../services/articleService';
import EditorWrapper from '../sidepanel/Editor/Editor';
import { markdownToHtml } from '../../utils/markdownConverter';
import { IoSave, IoClose, IoArrowBack } from 'react-icons/io5';
import { trackPageViewBridge, trackPageExitBridge, trackArchiveEditStartedBridge, trackArchiveEditSavedBridge, trackArchiveEditCancelledBridge, trackArchiveFullscreenEditorOpenedBridge } from '../../analytics/bridge';
import { useI18n } from '../../hooks/useI18n';
import styles from './EditorApp.module.css';

interface EditorData {
  articleId: number;
  title: string;
  content: string;
  originalTitle: string;
  originalContent: string;
}

const EditorApp: React.FC = () => {
  const { t } = useI18n();
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const pageStartTimeRef = useRef<number>(Date.now());

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
          setContent(data.content);

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
          
        } catch (error) {
          console.error('Failed to load editor data:', error);
          console.error('Session key:', sessionKey);
          alert('Failed to load editor data. Please check the console.');
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
    
    const contentChanged = title !== editorData.originalTitle || content !== editorData.originalContent;
    // 컨텐츠가 변경되었고 실행 취소가 가능한 경우에만 hasChanges를 true로 설정
    // 실행 취소가 불가능하면 초기 상태로 돌아간 것으로 간주
    const hasChanged = contentChanged && canUndo;
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

      // 저장 전에 콘텐츠 정리
      const normalizedContent = content.replace(/\n{2,}/g, '\n').trim();

      const updateData: UpdateArticleDto = {
        title: title.trim(),
        content: normalizedContent,
      };

      await articleService.updateArticle(editorData.articleId, updateData);

      // Track save event
      trackArchiveEditSavedBridge({
        article_id: editorData.articleId,
        article_title: title.trim(),
        content_length: normalizedContent.length,
        title_changed: title.trim() !== editorData.originalTitle,
        content_changed: normalizedContent !== editorData.originalContent,
        editor_type: 'fullscreen',
        session_duration: Math.round((Date.now() - pageStartTimeRef.current) / 1000)
      }).catch(() => {});

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
      
      // 잠시 후 페이지 닫기
      setTimeout(() => {
        window.close();
      }, 500);
      
    } catch (error: any) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [editorData, title, content]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) return;
    }

    // Track cancel event
    if (editorData) {
      trackArchiveEditCancelledBridge({
        article_id: editorData.articleId,
        had_changes: hasChanges,
        title_changed: title !== editorData.originalTitle,
        content_changed: content !== editorData.originalContent,
        editor_type: 'fullscreen',
        session_duration: Math.round((Date.now() - pageStartTimeRef.current) / 1000)
      }).catch(() => {});
    }

    window.close();
  }, [hasChanges, editorData, title, content]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.titleInput}
              placeholder="Enter title"
            />
          </div>
          
          <div className={styles.actionButtons}>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`${styles.saveButton} ${hasChanges ? styles.hasChanges : ''}`}
              title="Save (Ctrl+S)"
            >
              <IoSave size={20} />
              {saving ? 'Saving...' : t('common_save')}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={saving}
              className={styles.cancelButton}
              title="Cancel (Esc)"
            >
              <IoClose size={20} />
              {t('common_cancel')}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.editorSection}>
        <div className={styles.editorWrapper}>
          <EditorWrapper
            content={markdownToHtml(content)}
            onChange={setContent}
            placeholder="Enter content..."
            readOnly={saving}
            onHistoryStateChange={handleHistoryStateChange}
          />
        </div>
      </div>

      {hasChanges && (
        <div className={styles.changesIndicator}>
          You have unsaved changes
        </div>
      )}
    </div>
  );
};

export default EditorApp;
