import React, { useState, useEffect } from 'react';
import { IoArrowBack } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { mockDrafts } from '../../mock/data';
import type { Draft, DraftVersion } from '../../mock/data';

interface ArchiveDetailPageProps {
  draftId: string;
  onBack: () => void;
}

const ArchiveDetailPage: React.FC<ArchiveDetailPageProps> = ({ draftId, onBack }) => {
  const draft = mockDrafts.find(d => d.id === draftId);
  const [selectedVersion, setSelectedVersion] = useState<DraftVersion | null>(null);

  useEffect(() => {
    if (draft) {
      setSelectedVersion(draft.versions[draft.versions.length - 1]);
    }
  }, [draft]);

  if (!draft) {
    return <div>Draft not found</div>;
  }

  if (!selectedVersion) {
    return null;
  }

  const handleVersionSelect = (version: DraftVersion) => {
    setSelectedVersion(version);
  };

  const handleEdit = () => {
    console.log('Edit draft:', draftId);
  };

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <button className={styles.backButton} onClick={onBack}>
          <IoArrowBack size={20} />
        </button>
        <h1 className={styles.detailTitle}>{draft.title}</h1>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <h2 className={styles.sectionTitle}>미리보기</h2>
            <span className={styles.versionInfo}>
              버전 {selectedVersion.version} • {selectedVersion.date}
            </span>
          </div>
          <div className={styles.previewContent}>
            {selectedVersion.content}
          </div>
          <button className={styles.editButton} onClick={handleEdit}>
            초안 수정하기
          </button>
        </div>

        <div className={styles.versionSelector}>
          <h2 className={styles.sectionTitle}>버전 기록</h2>
          <div className={styles.versionList}>
            {draft.versions.slice().reverse().map((version) => (
              <button
                key={version.version}
                className={`${styles.versionButton} ${
                  selectedVersion.version === version.version ? styles.versionButtonActive : ''
                }`}
                onClick={() => handleVersionSelect(version)}
              >
                <div className={styles.versionInfo}>
                  <span className={styles.versionNumber}>버전 {version.version}</span>
                  <span className={styles.versionDate}>{version.date}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveDetailPage; 