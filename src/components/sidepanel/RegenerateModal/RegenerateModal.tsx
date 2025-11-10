import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { ArticleResponse } from '../../../services/articleService';
import { WritingStyle } from '../../../services/writingStyleService';
import { useI18n } from '../../../hooks/useI18n';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { MingcuteRefresh4AiFill } from '../../icons/MingcuteRefresh4AiFill';
import SourcesSection from './SourcesSection';
import styles from './RegenerateModal.module.css';

interface RegenerateModalProps {
  article: ArticleResponse;
  writingStyles: WritingStyle[];
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (params: RegenerateParams) => void;
  isRegenerating: boolean;
}

export interface RegenerateParams {
  topic: string;
  keyInsight: string;
  selectedScrapIds: string[]; // UUID strings
  writingStyleId?: number;
  additionalInstructions?: string;
}

const RegenerateModal: React.FC<RegenerateModalProps> = ({
  article,
  writingStyles,
  isOpen,
  onClose,
  onRegenerate,
  isRegenerating,
}) => {
  const { t } = useI18n();

  // Focus trap for accessibility
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  // Form state
  const [topic, setTopic] = useState(article.topic || '');
  const [keyInsight, setKeyInsight] = useState(article.keyInsight || '');
  const [selectedScrapIds, setSelectedScrapIds] = useState<string[]>( // UUID strings
    article.scraps?.map(s => s.scrapId) || []
  );
  const [writingStyleId, setWritingStyleId] = useState<number | undefined>(
    article.writingStyleId || undefined
  );
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // UI state
  const [isOriginalSettingsExpanded, setIsOriginalSettingsExpanded] = useState(false);

  // Reset form when modal opens or article ID changes
  // Use articleId instead of entire article object to avoid unnecessary re-renders
  useEffect(() => {
    if (isOpen) {
      // Try to load draft from storage first
      const draftKey = `regenerate_draft_${article.articleId}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const savedAt = new Date(draft.savedAt);
          const now = new Date();
          const hoursSinceUpdate = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);

          // Use draft if saved within last 24 hours
          if (hoursSinceUpdate < 24) {
            setTopic(draft.topic || article.topic || '');
            setKeyInsight(draft.keyInsight || article.keyInsight || '');
            setSelectedScrapIds(draft.selectedScrapIds || article.scraps?.map(s => s.scrapId) || []);
            setWritingStyleId(draft.writingStyleId || article.writingStyleId || undefined);
            setAdditionalInstructions(draft.additionalInstructions || '');
            return;
          }
        } catch (err) {
          console.error('Failed to load draft:', err);
        }
      }

      // If no valid draft, use article data
      setTopic(article.topic || '');
      setKeyInsight(article.keyInsight || '');
      setSelectedScrapIds(article.scraps?.map(s => s.scrapId) || []);
      setWritingStyleId(article.writingStyleId || undefined);
      setAdditionalInstructions('');
    }
  }, [isOpen, article.articleId]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!isOpen) return;

    const draftKey = `regenerate_draft_${article.articleId}`;
    const timeoutId = setTimeout(() => {
      try {
        const draft = {
          topic,
          keyInsight,
          selectedScrapIds,
          writingStyleId,
          additionalInstructions,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (err) {
        console.error('Failed to save draft:', err);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [isOpen, article.articleId, topic, keyInsight, selectedScrapIds, writingStyleId, additionalInstructions]);

  const handleSelectionChange = useCallback((scrapIds: string[]) => { // UUID strings
    setSelectedScrapIds(scrapIds);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim() || !keyInsight.trim()) {
      return;
    }

    // Clear draft on successful submission
    try {
      const draftKey = `regenerate_draft_${article.articleId}`;
      localStorage.removeItem(draftKey);
    } catch (err) {
      console.error('Failed to remove draft:', err);
    }

    onRegenerate({
      topic: topic.trim(),
      keyInsight: keyInsight.trim(),
      selectedScrapIds,
      writingStyleId,
      additionalInstructions: additionalInstructions.trim() || undefined,
    });
  }, [topic, keyInsight, selectedScrapIds, writingStyleId, additionalInstructions, article.articleId, onRegenerate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isRegenerating) {
      onClose();
    }
  }, [isRegenerating, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={!isRegenerating ? onClose : undefined}
        aria-label="Close regenerate modal"
      />

      {/* Panel */}
      <div
        ref={modalRef}
        className={styles.panel}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="regenerate-modal-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <MingcuteRefresh4AiFill style={{ fontSize: '20px' }} />
            <h2 id="regenerate-modal-title">{t('regenerateModal_title')}</h2>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            disabled={isRegenerating}
            title={t('common_close')}
            aria-label={t('common_close')}
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Original Settings Section */}
            <div className={styles.section}>
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => setIsOriginalSettingsExpanded(!isOriginalSettingsExpanded)}
              >
                <span className={styles.sectionTitle}>
                  {t('regenerateModal_originalSettings')}
                </span>
                {isOriginalSettingsExpanded ? (
                  <IoChevronUp size={16} />
                ) : (
                  <IoChevronDown size={16} />
                )}
              </button>

              {isOriginalSettingsExpanded && (
                <div className={styles.sectionContent}>
                  <div className={styles.originalField}>
                    <span className={styles.originalLabel}>
                      {t('regenerateModal_originalTopic')}:
                    </span>
                    <span className={styles.originalValue}>
                      {article.topic || t('regenerateModal_notSet')}
                    </span>
                  </div>
                  <div className={styles.originalField}>
                    <span className={styles.originalLabel}>
                      {t('regenerateModal_originalKeyInsight')}:
                    </span>
                    <span className={styles.originalValue}>
                      {article.keyInsight || t('regenerateModal_notSet')}
                    </span>
                  </div>
                  <div className={styles.originalField}>
                    <span className={styles.originalLabel}>
                      {t('regenerateModal_originalSources')}:
                    </span>
                    <span className={styles.originalValue}>
                      {article.scraps?.length || 0} {t('archiveDetailPage_itemsCount')}
                    </span>
                  </div>
                  {article.writingStyleName && (
                    <div className={styles.originalField}>
                      <span className={styles.originalLabel}>
                        {t('regenerateModal_originalStyle')}:
                      </span>
                      <span className={styles.originalValue}>
                        {article.writingStyleName}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Topic Field */}
            <div className={styles.formGroup}>
              <label htmlFor="regenerate-topic" className={styles.label}>
                {t('regenerateModal_topic')}
                <span className={styles.required}>*</span>
              </label>
              <input
                id="regenerate-topic"
                type="text"
                className={styles.input}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('regenerateModal_topicPlaceholder')}
                disabled={isRegenerating}
                required
              />
            </div>

            {/* Key Message Field */}
            <div className={styles.formGroup}>
              <label htmlFor="regenerate-key-insight" className={styles.label}>
                {t('regenerateModal_keyMessage')}
                <span className={styles.required}>*</span>
              </label>
              <textarea
                id="regenerate-key-insight"
                className={styles.textarea}
                value={keyInsight}
                onChange={(e) => setKeyInsight(e.target.value)}
                placeholder={t('regenerateModal_keyMessagePlaceholder')}
                disabled={isRegenerating}
                rows={4}
                required
              />
            </div>

            {/* Sources Selection - New Design */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {t('regenerateModal_sources')}
              </label>
              <SourcesSection
                selectedScrapIds={selectedScrapIds}
                onSelectionChange={handleSelectionChange}
                disabled={isRegenerating}
                initialScraps={article.scraps}
              />
            </div>

            {/* Writing Style Selection */}
            <div className={styles.formGroup}>
              <label htmlFor="regenerate-writing-style" className={styles.label}>
                {t('regenerateModal_writingStyle')}
              </label>
              <select
                id="regenerate-writing-style"
                className={styles.select}
                value={writingStyleId || ''}
                onChange={(e) => setWritingStyleId(e.target.value ? Number(e.target.value) : undefined)}
                disabled={isRegenerating}
              >
                <option value="">
                  {t('regenerateModal_defaultStyle')}
                </option>
                {writingStyles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Instructions */}
            <div className={styles.formGroup}>
              <label htmlFor="regenerate-additional-instructions" className={styles.label}>
                {t('regenerateModal_additionalInstructions')}
              </label>
              <textarea
                id="regenerate-additional-instructions"
                className={styles.textarea}
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder={t('regenerateModal_additionalInstructionsPlaceholder')}
                disabled={isRegenerating}
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
                disabled={isRegenerating}
              >
                {t('common_cancel')}
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isRegenerating || !topic.trim() || !keyInsight.trim()}
              >
                <MingcuteRefresh4AiFill style={{ fontSize: '16px' }} />
                {isRegenerating ? t('regenerateModal_regenerating') : t('regenerateModal_regenerate')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RegenerateModal;
