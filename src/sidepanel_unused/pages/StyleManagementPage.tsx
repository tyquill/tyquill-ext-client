import React, { useState, useEffect } from 'react';
import { IoTrash, IoClipboard, IoAdd, IoCreate, IoRefresh, IoCheckmark, IoClose, IoInformationCircleOutline } from 'react-icons/io5';
import { writingStyleService, WritingStyle, ScrapedExample } from '../../services/writingStyleService';
import { useToastHelpers } from '../../hooks/useToast';
import { useI18n } from '../../hooks/useI18n';
import { clipCurrentPageForStyle } from '../../utils/scrapHelper';
import Tooltip from '../../components/common/Tooltip';
import styles from './StyleManagementPage.module.css';
import pageStyles from './PageStyles.module.css';
import layoutStyles from './CommonLayout.module.css';

const StyleManagementPage: React.FC = () => {
  const [stylesList, setStylesList] = useState<WritingStyle[]>([]);
  const [newStyleName, setNewStyleName] = useState('');
  const [scrapedExamples, setScrapedExamples] = useState<ScrapedExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const { showSuccess, showError } = useToastHelpers();
  const { t } = useI18n();

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    setIsLoading(true);
    try {
      const styles = await writingStyleService.getWritingStyles();
      setStylesList(styles);
    } catch (error) {
      showError(t('stylePage_loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      const updatedStyles = await writingStyleService.getWritingStyles();
      setStylesList(updatedStyles);
      showSuccess(t('stylePage_refreshSuccess'), t('stylePage_refreshSuccessMessage'));
    } catch (error) {
      showError(t('stylePage_refreshError'), t('stylePage_refreshErrorMessage'));
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
          showError(t('stylePage_maxExamples'));
          return;
        }
        const newExample: ScrapedExample = {
          title: scrapResult.metadata?.title || scrapResult.title || t('stylePage_scrapResult'),
          content: scrapResult.content,
          url: scrapResult.metadata?.url || scrapResult.url || '',
        };
        setScrapedExamples(prev => [...prev, newExample]);
        showSuccess(t('stylePage_scrapAddedSuccess'));
        setShowCreateForm(true);
      } else {
        throw new Error(t('stylePage_noScrapResult'));
      }
    } catch (error) {
      console.error('Scraping failed:', error);
      showError(`${t('stylePage_scrapFailedPrefix')} ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleAddStyle = async () => {
    if (!newStyleName.trim()) {
      showError(t('stylePage_pleaseEnterName'));
      return;
    }
    if (scrapedExamples.length === 0) {
      showError(t('stylePage_pleaseScrapFirst'));
      return;
    }
    try {
      setSaving(true);
      const newStyle = await writingStyleService.addWritingStyle(newStyleName, scrapedExamples);
      showSuccess(t('stylePage_styleAdded'));
      setNewStyleName('');
      setScrapedExamples([]);
      setShowCreateForm(false);
      // 로컬 상태 업데이트로 즉시 반영
      setStylesList(prev => [newStyle, ...prev]);
    } catch (error) {
      showError(t('stylePage_styleAddError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStyle = async (id: number) => {
    if (window.confirm(t('stylePage_confirmDelete'))) {
      try {
        // 삭제 중 상태 설정
        setDeletingIds(prev => new Set(prev).add(id));
        
        // 백엔드에서 실제 삭제
        await writingStyleService.deleteWritingStyle(id);
        
        // 성공 시 로컬 상태에서 제거
        setStylesList(prev => prev.filter(style => style.id !== id));
        showSuccess(t('stylePage_styleDeleteSuccess'));
      } catch (error) {
        showError(t('stylePage_styleDeleteError'));
      } finally {
        // 삭제 중 상태 해제
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
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
    <div className={layoutStyles.pageLayout}>
      <div className={layoutStyles.scrollableContent}>
        <div className={pageStyles.pageHeader}>
          <div className={pageStyles.headerControls}>
            <h1 className={pageStyles.pageTitle}>{t('stylePage_title')}</h1>
          </div>
          <p className={pageStyles.pageSubtitle}>
            {t('stylePage_styleDescription')}
          </p>
        </div>
        
        {!showCreateForm && (
          <button
            type="button"
            onClick={handleCreateNewStyle}
            className={styles.newStyleButton}
          >
            <IoAdd size={16} />
            {t('stylePage_newStyleCreate')}
          </button>
        )}

        {/* 문체 생성 섹션 */}
        {showCreateForm && (
          <section className={styles.createSection}>
            <div className={styles.createHeader}>
              <h3 className={styles.createTitle}>
                <IoCreate size={20} />
                {t('stylePage_newStyleCreating')}
              </h3>
              <div className={styles.createActions}>
                <Tooltip content={saving ? t('stylePage_savingTooltip') : t('stylePage_saveTooltip')}>
                  <button
                    type="button"
                    onClick={handleAddStyle}
                    className={styles.saveIconButton}
                    disabled={!newStyleName.trim() || scrapedExamples.length === 0 || saving}
                  >
                    <IoCheckmark size={18} />
                  </button>
                </Tooltip>
                <Tooltip content={t('stylePage_cancelTooltip')}>
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
                <label className={styles.inputLabel}>{t('stylePage_name')}</label>
                <input
                  type="text"
                  value={newStyleName}
                  onChange={(e) => setNewStyleName(e.target.value)}
                  className={styles.input}
                  placeholder={t('stylePage_namePlaceholder')}
                  autoFocus
                />
              </div>

              {/* 스크랩된 예시 */}
              <div className={styles.examplesGroup}>
                <div className={styles.examplesHeader}>
                  <label className={styles.inputLabel}>
                    {t('stylePage_exampleCount')} ({scrapedExamples.length}/5)
                  </label>
                  <div style={{display: 'flex', gap: '8px'}}>
                    {scrapedExamples.length < 5 && (
                      <Tooltip content={t('stylePage_scrapCurrentPageTooltip')}>
                        <button
                        type="button"
                        onClick={handleScrapeCurrentPage}
                        className={styles.addMoreButton}
                            disabled={isScraping}
                          >
                            {isScraping ? (
                              <>
                                <div className={styles.spinner}></div>
                                {t('stylePage_scrapInProgress')}
                              </>
                            ) : (
                              <>
                                <IoClipboard size={14} />
                                {t('stylePage_addCurrentPageExample')}
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
                        {t('stylePage_removeAll')}
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.examplesHelp}>
                  {t('stylePage_restrictedPagesWarning')}
                </div>
                
                {scrapedExamples.length === 0 ? (
                  <div className={styles.emptyExamples}>
                    <p>{t('stylePage_noScrapedExamples')}</p>
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
              <h2 className={styles.sectionTitle}>{t('stylePage_savedStyles')}</h2>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <Tooltip content={t('stylePage_infoSectionTooltip')}>
                  <button type="button" className={styles.infoIconButton} aria-label={t('stylePage_sectionInfo')}>
                    <IoInformationCircleOutline size={16} />
                  </button>
                </Tooltip>
              <Tooltip content={t('stylePage_refreshTooltip')} side='bottom'>
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
              <p>{t('stylePage_loadingStyles')}</p>
            </div>
          ) : stylesList.length > 0 ? (
            <div className={styles.stylesGrid}>
              {stylesList.map((style) => (
                <div key={style.id} className={styles.styleCard}>
                  <div className={styles.styleCardHeader}>
                    <h3 className={styles.styleCardTitle}>{style.name}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStyle(style.id);
                      }}
                      className={`${styles.deleteButton} ${deletingIds.has(style.id) ? styles.deleting : ''}`}
                      aria-label={t('stylePage_deleteStyleLabel')}
                      type="button"
                      disabled={deletingIds.has(style.id)}
                    >
                      {deletingIds.has(style.id) ? (
                        <div className={styles.spinner}></div>
                      ) : (
                        <IoTrash size={16} />
                      )}
                    </button>
                  </div>
                  
                  <div className={styles.styleCardContent}>
                    <div className={styles.styleExamples}>
                      <span className={styles.examplesCount}>
                        {style.examples.length}{t('stylePage_exampleCountSuffix')}
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
                            +{style.examples.length - 2}{t('stylePage_moreExamples')}
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
              <h3 className={styles.emptyTitle}>{t('stylePage_noSavedStyles')}</h3>
              <p className={styles.emptyDescription}>
                {t('stylePage_emptyDescription')}
              </p>
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={handleCreateNewStyle}
                  className={styles.emptyActionButton}
                >
                  <IoAdd size={16} />
                  {t('stylePage_firstStyleCreate')}
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
