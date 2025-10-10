import React, { useState } from 'react';
import { IoTrash, IoClipboard, IoCreate, IoCheckmark, IoClose } from 'react-icons/io5';
import { writingStyleService, ScrapedExample } from '../../services/writingStyleService';
import { useToastHelpers } from '../../hooks/useToast';
import { useI18n } from '../../hooks/useI18n';
import { clipCurrentPageForStyle } from '../../utils/scrapHelper';
import Tooltip from '../../components/common/Tooltip';
import styles from './StyleManagementPage.module.css';
import pageStyles from './PageStyles.module.css';
import layoutStyles from './CommonLayout.module.css';

interface StyleManagementPageProps {
  onClose?: () => void;
}

const StyleManagementPage: React.FC<StyleManagementPageProps> = ({ onClose }) => {
  const [newStyleName, setNewStyleName] = useState('');
  const [scrapedExamples, setScrapedExamples] = useState<ScrapedExample[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToastHelpers();
  const { t } = useI18n();

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
      await writingStyleService.addWritingStyle(newStyleName, scrapedExamples);
      showSuccess(t('stylePage_styleAdded'));
      onClose?.();
    } catch (error) {
      showError(t('stylePage_styleAddError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelCreate = () => {
    onClose?.();
  };

  return (
    <div className={layoutStyles.pageLayout}>
      <div className={layoutStyles.scrollableContent}>
        {/* Header */}
        <div className={pageStyles.pageHeader}>
          <h1 className={pageStyles.pageTitle}>{t('stylePage_title')}</h1>
          <p className={pageStyles.pageSubtitle}>
            {t('stylePage_styleDescription')}
          </p>
        </div>

        {/* Creation Form - Always visible */}
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
      </div>
    </div>
  );
};

export default StyleManagementPage;
