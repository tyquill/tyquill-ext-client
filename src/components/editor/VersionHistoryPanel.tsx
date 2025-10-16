import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoCheckmarkCircle } from 'react-icons/io5';
import { articleService, VersionHistoryItem } from '../../services/articleService';
import { formatRelativeTime, getCharacterCount } from '../../utils/timeFormat';
import { useI18n } from '../../hooks/useI18n';
import styles from './EditorApp.module.css';

interface VersionHistoryPanelProps {
    articleId: number;
    currentVersionNumber?: number;
    onClose: () => void;
    onVersionSelect: (version: VersionHistoryItem) => void;
    onRestore: (version: VersionHistoryItem) => Promise<void>;
}

const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
    articleId,
    currentVersionNumber,
    onClose,
    onVersionSelect,
    onRestore,
}) => {
    const { t } = useI18n();
    const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [versionToRestore, setVersionToRestore] = useState<VersionHistoryItem | null>(null);

    // Load versions on mount
    useEffect(() => {
        const loadVersions = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await articleService.getArticleVersions(articleId);

                // Sort by version number descending (newest first)
                const sortedVersions = data.sort((a, b) => b.versionNumber - a.versionNumber);

                // Calculate character counts
                const versionsWithCounts = sortedVersions.map(v => {
                    let characterCount: number;

                    if (v.contentFormat === 'tiptap-json') {
                        try {
                            // Parse TipTap JSON and extract text
                            const parsedContent = JSON.parse(v.content);
                            characterCount = getCharacterCount(parsedContent);
                        } catch (error) {
                            // If parsing fails, treat as plain text
                            console.warn('Failed to parse TipTap JSON for character count:', error);
                            characterCount = getCharacterCount(v.content);
                        }
                    } else {
                        // Markdown or plain text
                        characterCount = getCharacterCount(v.content);
                    }

                    return {
                        ...v,
                        characterCount
                    };
                });

                setVersions(versionsWithCounts);
            } catch (err: any) {
                console.error('Failed to load versions:', err);
                setError(err.message || 'Failed to load version history');
            } finally {
                setLoading(false);
            }
        };

        loadVersions();
    }, [articleId]);

    // Handle version selection
    const handleVersionClick = useCallback((version: VersionHistoryItem) => {
        setSelectedVersionNumber(version.versionNumber);
        onVersionSelect(version);
    }, [onVersionSelect]);

    // Handle restore button click - show modal
    const handleRestoreClick = useCallback((version: VersionHistoryItem) => {
        if (restoring) return;
        setVersionToRestore(version);
        setShowConfirmModal(true);
    }, [restoring]);

    // Handle confirmed restore
    const handleConfirmRestore = useCallback(async () => {
        if (!versionToRestore || restoring) return;

        try {
            setRestoring(true);
            await onRestore(versionToRestore);
            setShowConfirmModal(false);
            setVersionToRestore(null);
        } catch (err: any) {
            console.error('Failed to restore version:', err);
            alert(`Failed to restore version: ${err.message || 'Unknown error'}`);
        } finally {
            setRestoring(false);
        }
    }, [versionToRestore, restoring, onRestore]);

    // Handle modal close
    const handleCloseModal = useCallback(() => {
        if (!restoring) {
            setShowConfirmModal(false);
            setVersionToRestore(null);
        }
    }, [restoring]);

    return (
        <>
            {/* Backdrop */}
            <div className={styles.versionHistoryBackdrop} onClick={onClose} />

            {/* Panel */}
            <div className={styles.versionHistoryPanel}>
                {/* Header */}
                <div className={styles.versionHistoryHeader}>
                    <h2 className={styles.versionHistoryTitle}>{t('editor_versionHistoryTitle')}</h2>
                    <button
                        onClick={onClose}
                        className={styles.versionHistoryCloseButton}
                        title={t('editor_closeEsc')}
                    >
                        <IoClose size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.versionHistoryContent}>
                    {loading && (
                        <div className={styles.versionHistoryLoading}>
                            {t('editor_loadingVersions')}
                        </div>
                    )}

                    {error && (
                        <div className={styles.versionHistoryError}>
                            {error}
                        </div>
                    )}

                    {!loading && !error && versions.length === 0 && (
                        <div className={styles.versionHistoryEmpty}>
                            {t('editor_noVersions')}
                        </div>
                    )}

                    {!loading && !error && versions.length > 0 && (
                        <div className={styles.versionList}>
                            {versions.map((version) => {
                                const isSelected = selectedVersionNumber === version.versionNumber;
                                const isCurrent = currentVersionNumber === version.versionNumber;

                                return (
                                    <div
                                        key={version.versionNumber}
                                        className={`${styles.versionItem} ${isSelected ? styles.versionItemSelected : ''} ${isCurrent ? styles.versionItemCurrent : ''}`}
                                        onClick={() => handleVersionClick(version)}
                                    >
                                        <div className={styles.versionItemHeader}>
                                            <div className={styles.versionNumber}>
                                                {isCurrent && (
                                                    <IoCheckmarkCircle
                                                        size={14}
                                                        className={styles.versionCurrentIcon}
                                                    />
                                                )}
                                                v{version.versionNumber}
                                            </div>
                                            <div className={styles.versionTime}>
                                                {formatRelativeTime(version.createdAt)}
                                            </div>
                                        </div>

                                        <div className={styles.versionItemBody}>
                                            <div className={styles.versionTitle}>
                                                {version.title || 'Untitled'}
                                            </div>
                                            <div className={styles.versionMeta}>
                                                {version.characterCount?.toLocaleString()}{t('editor_characters')}
                                            </div>
                                        </div>

                                        {isSelected && !isCurrent && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRestoreClick(version);
                                                }}
                                                disabled={restoring}
                                                className={styles.versionRestoreButton}
                                            >
                                                {restoring ? t('editor_restoring') : t('editor_restoreVersion')}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirmModal && versionToRestore && (
                <div className={styles.confirmModalOverlay} onClick={handleCloseModal}>
                    <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmModalHeader}>
                            <h3 className={styles.confirmModalTitle}>
                                {t('editor_restoreVersion')}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                disabled={restoring}
                                className={styles.confirmModalCloseButton}
                                aria-label={t('common_close')}
                            >
                                <IoClose size={20} />
                            </button>
                        </div>
                        <div className={styles.confirmModalBody}>
                            <p className={styles.confirmModalMessage}>
                                {formatRelativeTime(versionToRestore.createdAt)} 버전을 복원하시겠습니까?
                            </p>
                            <p className={styles.confirmModalInfo}>
                                새 버전이 생성되며, 현재 내용은 버전 히스토리에 저장됩니다.
                            </p>
                        </div>
                        <div className={styles.confirmModalFooter}>
                            <button
                                onClick={handleCloseModal}
                                disabled={restoring}
                                className={styles.confirmModalCancelButton}
                            >
                                {t('common_cancel')}
                            </button>
                            <button
                                onClick={handleConfirmRestore}
                                disabled={restoring}
                                className={styles.confirmModalConfirmButton}
                            >
                                {restoring ? t('editor_restoring') : t('editor_restoreVersion')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VersionHistoryPanel;
