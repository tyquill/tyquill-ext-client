import React, { useState, useEffect } from 'react';
import { IoArrowBack, IoArrowUpCircle, IoCreate } from 'react-icons/io5';
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

      <div className={styles.actionButtons}>
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
                  
                  // 직접 DOM 조작으로 붙여넣기 실행
                  await chrome.scripting.executeScript({
                    target: { tabId: currentTab.id! },
                    func: (contentToInsert: string) => {
                      // 콘텐츠 정리
                      const cleanedContent = contentToInsert
                        .replace(/\n{3,}/g, '\n\n')
                        .trim();

                      // 에디터 컨테이너 찾기
                      const editorContainer = document.querySelector('.codex-editor__redactor');
                      if (!editorContainer) {
                        throw new Error('maily.so 에디터를 찾을 수 없습니다.');
                      }

                      // 첫 번째 편집 가능한 요소 찾기
                      let targetElement = editorContainer.querySelector('[contenteditable="true"]');
                      
                      if (!targetElement) {
                        targetElement = editorContainer as HTMLElement;
                      }

                      // 마지막 블록 찾기 (가장 아래에 추가하기 위해)
                      const existingBlocks = editorContainer.querySelectorAll('.ce-block');
                      let insertionPoint: HTMLElement;
                      
                      if (existingBlocks.length > 0) {
                        // 마지막 블록의 편집 가능한 요소 찾기
                        const lastBlock = existingBlocks[existingBlocks.length - 1];
                        const lastEditableElement = lastBlock.querySelector('[contenteditable="true"]');
                        insertionPoint = lastEditableElement as HTMLElement || targetElement as HTMLElement;
                      } else {
                        insertionPoint = targetElement as HTMLElement;
                      }

                      // 삽입 지점에 포커스
                      insertionPoint.focus();

                      // 커서를 마지막 블록의 끝으로 이동
                      const selection = window.getSelection();
                      if (selection) {
                        selection.removeAllRanges();
                        const range = document.createRange();
                        range.selectNodeContents(insertionPoint);
                        range.collapse(false); // 끝으로 이동
                        selection.addRange(range);
                      }

                      // 완전한 마크다운을 HTML로 변환하는 함수
                      const markdownToHtml = (markdown: string): string => {
                        const lines = markdown.split('\n');
                        const htmlElements: string[] = [];
                        let i = 0;

                        // 텍스트 포맷팅 처리 헬퍼 함수
                        const processTextFormatting = (text: string) => {
                          return text
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
                            .replace(/~~(.*?)~~/g, '<del>$1</del>')
                            .replace(/__([^_]+)__/g, '<u>$1</u>')
                            .replace(/`([^`]+)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
                        };

                        while (i < lines.length) {
                          const trimmedLine = lines[i].trim();
                          
                          if (trimmedLine.startsWith('# ')) {
                            const headerContent = trimmedLine.substring(2);
                            const processedHeader = processTextFormatting(headerContent);
                            htmlElements.push(`<h1>${processedHeader}</h1>`);
                          } else if (trimmedLine.startsWith('## ')) {
                            const headerContent = trimmedLine.substring(3);
                            const processedHeader = processTextFormatting(headerContent);
                            htmlElements.push(`<h2>${processedHeader}</h2>`);
                          } else if (trimmedLine.startsWith('### ')) {
                            const headerContent = trimmedLine.substring(4);
                            const processedHeader = processTextFormatting(headerContent);
                            htmlElements.push(`<h3>${processedHeader}</h3>`);
                          } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                            // 연속된 불릿 리스트 항목들을 하나의 ul로 그룹화
                            const listItems: string[] = [];
                            
                            while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
                              const item = lines[i].trim().substring(2);
                              const processedItem = processTextFormatting(item);
                              listItems.push(`<li>${processedItem}</li>`);
                              i++;
                            }
                            
                            htmlElements.push(`<ul>${listItems.join('')}</ul>`);
                            i--; // while 루프에서 i++가 되므로 1 감소
                          } else if (trimmedLine.match(/^\d+\.\s/)) {
                            // 연속된 번호 리스트 항목들을 하나의 ol로 그룹화
                            const listItems: string[] = [];
                            
                            while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
                              const item = lines[i].trim().replace(/^\d+\.\s/, '');
                              const processedItem = processTextFormatting(item);
                              listItems.push(`<li>${processedItem}</li>`);
                              i++;
                            }
                            
                            htmlElements.push(`<ol>${listItems.join('')}</ol>`);
                            i--; // while 루프에서 i++가 되므로 1 감소
                          } else if (trimmedLine.startsWith('> ')) {
                            const quoteContent = trimmedLine.substring(2);
                            const processedQuote = processTextFormatting(quoteContent);
                            htmlElements.push(`<blockquote>${processedQuote}</blockquote>`);
                          } else if (trimmedLine.startsWith('```')) {
                            const codeContent = trimmedLine.substring(3);
                            htmlElements.push(`<pre><code>${codeContent}</code></pre>`);
                          } else if (trimmedLine === '---') {
                            htmlElements.push('<hr>');
                          } else if (trimmedLine) {
                            const processedText = processTextFormatting(trimmedLine);
                            htmlElements.push(`<p>${processedText}</p>`);
                          } else {
                            htmlElements.push('<br>');
                          }
                          
                          i++;
                        }

                        return htmlElements.join('\n');
                      };

                      // Enter 키를 두 번 눌러서 새 블록 생성
                      const enterEvent1 = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        bubbles: true,
                        cancelable: true
                      });
                      insertionPoint.dispatchEvent(enterEvent1);

                      // 약간의 지연 후 두 번째 Enter
                      setTimeout(() => {
                        const enterEvent2 = new KeyboardEvent('keydown', {
                          key: 'Enter',
                          code: 'Enter',
                          bubbles: true,
                          cancelable: true
                        });
                        insertionPoint.dispatchEvent(enterEvent2);

                        // 새로 생성된 블록 찾기
                        setTimeout(() => {
                          const newBlocks = editorContainer.querySelectorAll('.ce-block');
                          const newLastBlock = newBlocks[newBlocks.length - 1];
                          const newTargetElement = newLastBlock?.querySelector('[contenteditable="true"]') as HTMLElement;
                          
                          if (newTargetElement) {
                            newTargetElement.focus();

                            // HTML 변환
                            const convertedHtml = markdownToHtml(cleanedContent);

                            // DataTransfer 객체 생성 - HTML과 플레인 텍스트 모두 설정
                            const dataTransfer = new DataTransfer();
                            dataTransfer.setData('text/html', convertedHtml);
                            dataTransfer.setData('text/plain', cleanedContent);

                            // paste 이벤트 생성 및 발생
                            const pasteEvent = new ClipboardEvent('paste', {
                              bubbles: true,
                              cancelable: true,
                              clipboardData: dataTransfer
                            });

                            newTargetElement.dispatchEvent(pasteEvent);

                            // fallback: 직접 HTML 내용 삽입
                            if (!pasteEvent.defaultPrevented) {
                              const newSelection = window.getSelection();
                              if (newSelection && newSelection.rangeCount > 0) {
                                const range = newSelection.getRangeAt(0);
                                range.deleteContents();
                                
                                // HTML을 DOM 요소로 변환해서 삽입
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = convertedHtml;
                                
                                // HTML 요소들을 하나씩 삽입
                                const fragment = document.createDocumentFragment();
                                while (tempDiv.firstChild) {
                                  fragment.appendChild(tempDiv.firstChild);
                                }
                                range.insertNode(fragment);
                              }
                            }
                          }
                        }, 100);
                      }, 100);

                      return { success: true };
                    },
                    args: [content]
                  });

                  showSuccess('내보내기 완료', 'maily.so 페이지에 내용이 붙여넣어졌습니다.');
                } else {
                  showError('내보내기 실패', 'maily.so 뉴스레터 편집 또는 생성 페이지에서만 사용할 수 있습니다.');
                }
              } catch (error) {
                console.error('Export error:', error);
                showError('내보내기 실패', 'maily.so 페이지에서 내보내기 중 오류가 발생했습니다.');
              }
            }}
          >
            <IoArrowUpCircle size={20} />
            maily.so로 내보내기
          </button>
        )}
        {!isEditing && (
          <button className={styles.editButton} onClick={handleEdit} title="초안 수정하기">
            <IoCreate size={20} />
            수정
          </button>
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