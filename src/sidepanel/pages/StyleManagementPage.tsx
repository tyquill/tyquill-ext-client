import React, { useState, useEffect } from 'react';
import { IoTrash, IoClipboard, IoAdd, IoCreate, IoRefresh, IoCheckmark, IoClose, IoInformationCircleOutline } from 'react-icons/io5';
import { writingStyleService, WritingStyle, ScrapedExample } from '../../services/writingStyleService';
import { useToastHelpers } from '../../hooks/useToast';
import { clipCurrentPageForStyle } from '../../utils/scrapHelper';
import Tooltip from '../../components/common/Tooltip';
import styles from './StyleManagementPage.module.css';
import pageStyles from './PageStyles.module.css';

const StyleManagementPage: React.FC = () => {
  const [stylesList, setStylesList] = useState<WritingStyle[]>([]);
  const [newStyleName, setNewStyleName] = useState('');
  const [scrapedExamples, setScrapedExamples] = useState<ScrapedExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToastHelpers();

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    setIsLoading(true);
    try {
      const styles = await writingStyleService.getWritingStyles();
      setStylesList(styles);
    } catch (error) {
      showError('문체 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await fetchStyles();
      showSuccess('새로고침 완료', '문체 목록이 업데이트되었습니다.');
    } catch (error) {
      showError('새로고침 실패', '문체 목록 새로고침에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleScrapeCurrentPage = async () => {
    if (isScraping) return;
    try {
      setIsScraping(true);
      const scrapResult = await clipCurrentPageForStyle();
      if (scrapResult && scrapResult.content) {
        if (scrapedExamples.length >= 5) {
          showError('예시는 최대 5개까지 추가할 수 있습니다.');
          return;
        }
        const newExample: ScrapedExample = {
          title: scrapResult.metadata?.title || scrapResult.title || '스크랩된 페이지',
          content: scrapResult.content,
          url: scrapResult.metadata?.url || scrapResult.url || '',
        };
        setScrapedExamples(prev => [...prev, newExample]);
        showSuccess('현재 페이지가 문체 예시로 추가되었습니다.');
        setShowCreateForm(true);
      } else {
        throw new Error('스크랩 결과가 없습니다.');
      }
    } catch (error) {
      console.error('스크랩 실패:', error);
      showError(`현재 페이지 스크랩에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleAddStyle = async () => {
    if (!newStyleName.trim()) {
      showError('문체 이름을 입력해주세요.');
      return;
    }
    if (scrapedExamples.length === 0) {
      showError('먼저 예시를 스크랩해주세요.');
      return;
    }
    try {
      setSaving(true);
      await writingStyleService.addWritingStyle(newStyleName, scrapedExamples);
      showSuccess('새로운 문체가 추가되었습니다.');
      setNewStyleName('');
      setScrapedExamples([]);
      setShowCreateForm(false);
      fetchStyles();
    } catch (error) {
      showError('문체 추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStyle = async (id: number) => {
    if (window.confirm('정말로 이 문체를 삭제하시겠습니까?')) {
      try {
        await writingStyleService.deleteWritingStyle(id);
        showSuccess('문체가 삭제되었습니다.');
        fetchStyles();
      } catch (error) {
        showError('문체 삭제에 실패했습니다.');
      }
    }
  };

  const handleCreateNewStyle = () => {
    setShowCreateForm(true);
    setNewStyleName('');
    setScrapedExamples([]);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewStyleName('');
    setScrapedExamples([]);
  };

  return (
    <div className={pageStyles.pageContainer}>
      <div className={pageStyles.page}>
        <div className={pageStyles.pageHeader}>
          <div className={pageStyles.headerControls}>
            <h1 className={pageStyles.pageTitle}>문체 관리</h1>
          </div>
          <p className={pageStyles.pageSubtitle}>
            문체는 글의 어조와 표현 방식을 의미해요. 좋아하는 글에서 예시를 스크랩해 문체를 만들어두면,
            이후 글 생성에 해당 문체를 손쉽게 적용할 수 있습니다.
          </p>
        </div>
        
        {!showCreateForm && (
          <button
            type="button"
            onClick={handleCreateNewStyle}
            className={styles.newStyleButton}
          >
            <IoAdd size={16} />
            새 문체 만들기
          </button>
        )}

        {/* 문체 생성 섹션 */}
        {showCreateForm && (
          <section className={styles.createSection}>
            <div className={styles.createHeader}>
              <h3 className={styles.createTitle}>
                <IoCreate size={20} />
                새 문체 만들기
              </h3>
              <div className={styles.createActions}>
                <Tooltip content={saving ? '저장 중...' : '저장'}>
                  <button
                    type="button"
                    onClick={handleAddStyle}
                    className={styles.saveIconButton}
                    disabled={!newStyleName.trim() || scrapedExamples.length === 0 || saving}
                  >
                    <IoCheckmark size={18} />
                  </button>
                </Tooltip>
                <Tooltip content="취소">
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    className={styles.cancelIconButton}
                    disabled={saving}
                  >
                    <IoClose size={18} />
                  </button>
                </Tooltip>
              </div>
            </div>
            
            <div className={styles.createForm}>
              {/* 문체 이름 입력 */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>문체 이름</label>
                <input
                  type="text"
                  value={newStyleName}
                  onChange={(e) => setNewStyleName(e.target.value)}
                  className={styles.input}
                  placeholder="예: 내 브런치, 기술 블로그, 스토리텔링"
                  autoFocus
                />
              </div>

              {/* 스크랩된 예시 */}
              <div className={styles.examplesGroup}>
                <div className={styles.examplesHeader}>
                  <label className={styles.inputLabel}>
                    예시 ({scrapedExamples.length}/5)
                  </label>
                  <div style={{display: 'flex', gap: '8px'}}>
                    {scrapedExamples.length < 5 && (
                      <Tooltip content="현재 열려있는 탭의 본문 텍스트를 클리핑해 예시로 추가합니다. 로그인/보안 페이지 등 일부 사이트에서는 동작하지 않을 수 있어요.">
                        <button
                        type="button"
                        onClick={handleScrapeCurrentPage}
                        className={styles.addMoreButton}
                            disabled={isScraping}
                          >
                            {isScraping ? (
                              <>
                                <div className={styles.spinner}></div>
                                스크랩 중...
                              </>
                            ) : (
                              <>
                                <IoClipboard size={14} />
                                현재 페이지 예시로 추가
                              </>
                            )}
                          </button>
                      </Tooltip>
                  )}
                    {scrapedExamples.length > 0 && (
                      <button
                        type="button"
                        className={styles.clearAllButton}
                        onClick={() => setScrapedExamples([])}
                      >
                        모두 제거
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.examplesHelp}>
                  현재 페이지의 기사/글 본문을 가져와 예시로 저장합니다. URL도 함께 저장됩니다. 일부 로그인/보안 페이지에서는 동작하지 않을 수 있어요.
                </div>
                
                {scrapedExamples.length === 0 ? (
                  <div className={styles.emptyExamples}>
                    <p>스크랩된 예시가 없습니다.</p>
                  </div>
                ) : (
                  <div className={styles.examplesList}>
                    {scrapedExamples.map((example, index) => (
                      <div key={index} className={styles.exampleCard}>
                        <div className={styles.exampleContent}>
                          <h4 className={styles.exampleTitle}>{example.title}</h4>
                        </div>
                        <button
                          type="button"
                          className={styles.removeExampleButton}
                          onClick={() => setScrapedExamples(scrapedExamples.filter((_, i) => i !== index))}
                        >
                          <IoTrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 저장된 문체 목록 */}
        <section className={styles.stylesSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <h2 className={styles.sectionTitle}>저장된 문체</h2>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <Tooltip content="이 섹션에서 저장된 문체를 확인하고 관리할 수 있어요.">
                  <button type="button" className={styles.infoIconButton} aria-label="섹션 안내">
                    <IoInformationCircleOutline size={16} />
                  </button>
                </Tooltip>
              <Tooltip content="문체 목록 새로고침" side='bottom'>
                <button 
                  className={`${pageStyles.refreshButton} ${isRefreshing ? pageStyles.loading : ''}`}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <IoRefresh size={16} />
                </button>
              </Tooltip>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>문체 목록을 불러오는 중...</p>
            </div>
          ) : stylesList.length > 0 ? (
            <div className={styles.stylesGrid}>
              {stylesList.map((style) => (
                <div key={style.id} className={styles.styleCard}>
                  <div className={styles.styleCardHeader}>
                    <h3 className={styles.styleCardTitle}>{style.name}</h3>
                    <button
                      onClick={() => handleDeleteStyle(style.id)}
                      className={styles.deleteButton}
                    >
                      <IoTrash size={16} />
                    </button>
                  </div>
                  
                  <div className={styles.styleCardContent}>
                    <div className={styles.styleExamples}>
                      <span className={styles.examplesCount}>
                        {style.examples.length}개의 예시
                      </span>
                      <div className={styles.examplePreview}>
                        {style.examples.slice(0, 2).map((ex, index) => (
                          <div key={ex.id} className={styles.previewItem}>
                            <span className={styles.previewText}>
                              {ex.content.length > 30 
                                ? `${ex.content.substring(0, 30)}...` 
                                : ex.content}
                            </span>
                          </div>
                        ))}
                        {style.examples.length > 2 && (
                          <span className={styles.moreExamples}>
                            +{style.examples.length - 2}개 더
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.styleMeta}>
                      <span className={styles.styleDate}>
                        {new Date(style.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📝</div>
              <h3 className={styles.emptyTitle}>저장된 문체가 없습니다</h3>
              <p className={styles.emptyDescription}>
                좋아하는 글의 문체를 스크랩하고 저장하여 나만의 문체 라이브러리를 시작해보세요.
              </p>
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={handleCreateNewStyle}
                  className={styles.emptyActionButton}
                >
                  <IoAdd size={16} />
                  첫 번째 문체 만들기
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StyleManagementPage;
