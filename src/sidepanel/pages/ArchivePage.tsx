import React, { useState } from 'react';
import { IoTrash } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { mockDrafts } from '../../mock/data';

interface ArchivePageProps {
  onDraftClick: (draftId: string) => void;
}

const ArchivePage: React.FC<ArchivePageProps> = ({ onDraftClick }) => {
  const handleDelete = (id: string) => {
    console.log('Delete archive:', id);
  };

  const getPreviewContent = (content: string) => {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>보관함</h1>
      </div>

      <div className={styles.archiveList}>
        {mockDrafts.map(draft => {
          const lastVersion = draft.versions[draft.versions.length - 1];
          return (
            <div key={draft.id} className={styles.archiveItem}>
              <div 
                className={styles.archiveContent}
                onClick={() => onDraftClick(draft.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.archiveTitle}>{draft.title}</div>
                <div className={styles.archiveInfo}>
                  {draft.lastModified} • {draft.versions.length}개의 버전
                </div>
                <div className={styles.archivePreview}>
                  {getPreviewContent(lastVersion.content)}
                </div>
              </div>
              <div className={styles.archiveActions}>
                <button
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(draft.id);
                  }}
                  title="삭제"
                >
                  <IoTrash size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArchivePage; 