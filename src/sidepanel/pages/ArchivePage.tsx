import React from 'react';
import { IoDocument, IoDocumentText, IoClipboard, IoDownload, IoShare, IoTrash } from 'react-icons/io5';
import { IconType } from 'react-icons';
import styles from './PageStyles.module.css';

interface Archive {
  id: number;
  title: string;
  category: string;
  completedAt: string;
  size: string;
  type: string;
}

const ArchivePage: React.FC = () => {
  const archives: Archive[] = [
    {
      id: 1,
      title: '2024년 1분기 프로젝트 완료 보고서',
      category: 'Report',
      completedAt: '2024-01-15',
      size: '2.4MB',
      type: 'PDF'
    },
    {
      id: 2,
      title: '마케팅 캠페인 기획안',
      category: 'Marketing',
      completedAt: '2024-01-12',
      size: '1.8MB',
      type: 'DOCX'
    },
    {
      id: 3,
      title: '고객 응대 매뉴얼',
      category: 'Guide',
      completedAt: '2024-01-10',
      size: '3.2MB',
      type: 'PDF'
    }
  ];

  const getTypeIcon = (type: string): React.ComponentType<{ size?: number }> => {
    switch (type) {
      case 'PDF': return IoDocument;
      case 'DOCX': return IoDocumentText;
      default: return IoClipboard;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>보관함</h1>
        <p className={styles.pageSubtitle}>완성된 문서를 안전하게 보관하세요</p>
      </div>
      
      <div className={styles.archiveStats}>
        <div className={styles.statItem}>
          <div className={styles.statNumber}>{archives.length}</div>
          <div className={styles.statLabel}>보관된 문서</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statNumber}>7.4MB</div>
          <div className={styles.statLabel}>전체 용량</div>
        </div>
      </div>
      
      <div className={styles.archiveList}>
        {archives.map((archive) => {
          const IconComponent = getTypeIcon(archive.type);
          return (
            <div key={archive.id} className={styles.archiveItem}>
              <div className={styles.archiveIcon}>
                <IconComponent size={24} />
              </div>
              
              <div className={styles.archiveContent}>
                <h3 className={styles.archiveTitle}>{archive.title}</h3>
                <div className={styles.archiveMeta}>
                  <span className={styles.category}>{archive.category}</span>
                  <span className={styles.separator}>•</span>
                  <span className={styles.date}>{archive.completedAt}</span>
                  <span className={styles.separator}>•</span>
                  <span className={styles.size}>{archive.size}</span>
                </div>
              </div>
              
              <div className={styles.archiveActions}>
                <button className={styles.actionButton} title="다운로드">
                  <IoDownload size={16} />
                </button>
                <button className={styles.actionButton} title="공유">
                  <IoShare size={16} />
                </button>
                <button className={styles.actionButton} title="삭제">
                  <IoTrash size={16} />
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