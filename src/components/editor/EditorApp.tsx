import React, { useState, useEffect, useCallback } from 'react';
import { browser } from 'wxt/browser';
import { articleService, UpdateArticleDto } from '../../services/articleService';
import EditorWrapper from '../sidepanel/Editor/Editor';
import { markdownToHtml } from '../../utils/markdownConverter';
import { IoSave, IoClose, IoArrowBack } from 'react-icons/io5';
import styles from './EditorApp.module.css';

interface EditorData {
  articleId: number;
  title: string;
  content: string;
  originalTitle: string;
  originalContent: string;
}

const EditorApp: React.FC = () => {
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // URL 파라미터에서 데이터 읽기 및 편집기 상태 설정
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam) {
      try {
        // base64 디코딩 후 JSON 파싱 (anchor 링크나 특수 문자 안전 처리)
        let decoded: string;
        try {
          decoded = decodeURIComponent(atob(dataParam));
        } catch (base64Error) {
          console.error('Base64 decoding failed:', base64Error);
          // base64 실패 시 기존 방식으로 fallback
          decoded = decodeURIComponent(dataParam);
        }
        
        const data: EditorData = JSON.parse(decoded);
        setEditorData(data);
        setTitle(data.title);
        setContent(data.content);
        
        // 편집기 페이지가 열렸음을 storage에 저장
        browser.storage.local.set({
          [`tyquill-editor-open-${data.articleId}`]: {
            articleId: data.articleId,
            timestamp: Date.now()
          }
        });
        
      } catch (error) {
        console.error('Failed to parse editor data:', error);
        console.error('Data parameter:', dataParam);
        alert('편집기 데이터를 불러오는데 실패했습니다. 콘솔을 확인해주세요.');
        window.close();
      }
    } else {
      alert('편집기 데이터가 없습니다.');
      window.close();
    }
  }, []);

  // 페이지 언로드 시 편집기 상태 정리
  useEffect(() => {
    const handleUnload = () => {
      if (editorData) {
        browser.storage.local.remove(`tyquill-editor-open-${editorData.articleId}`);
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
      }
    };
  }, [editorData]);

  // 변경사항 감지
  useEffect(() => {
    if (!editorData) return;
    
    const hasChanged = title !== editorData.originalTitle || content !== editorData.originalContent;
    setHasChanges(hasChanged);
  }, [title, content, editorData]);

  // 페이지 닫기 전 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '변경사항이 저장되지 않았습니다. 정말 떠나시겠습니까?';
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
      
      // 저장 성공 시 변경사항 플래그 초기화
      setHasChanges(false);
      
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
      alert(`저장에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
    }
  }, [editorData, title, content]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      const confirmCancel = window.confirm('변경사항이 저장되지 않았습니다. 정말 취소하시겠습니까?');
      if (!confirmCancel) return;
    }
    
    window.close();
  }, [hasChanges]);

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

  if (!editorData) {
    return (
      <div className={styles.loadingContainer}>
        <div>편집기를 준비하고 있습니다...</div>
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
              placeholder="제목을 입력하세요"
            />
          </div>
          
          <div className={styles.actionButtons}>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`${styles.saveButton} ${hasChanges ? styles.hasChanges : ''}`}
              title="저장 (Ctrl+S)"
            >
              <IoSave size={20} />
              {saving ? '저장 중...' : '저장'}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={saving}
              className={styles.cancelButton}
              title="취소 (Esc)"
            >
              <IoClose size={20} />
              취소
            </button>
          </div>
        </div>
      </div>

      <div className={styles.editorSection}>
        <div className={styles.editorWrapper}>
          <EditorWrapper
            content={markdownToHtml(content)}
            onChange={setContent}
            placeholder="내용을 입력하세요..."
            readOnly={saving}
          />
        </div>
      </div>

      {hasChanges && (
        <div className={styles.changesIndicator}>
          변경사항이 있습니다
        </div>
      )}
    </div>
  );
};

export default EditorApp;
