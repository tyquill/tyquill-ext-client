import React from 'react';
import { IoDocument, IoDocumentText, IoClipboard, IoDownload, IoShare, IoTrash } from 'react-icons/io5';
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
      title: 'AI와 디자인의 미래: 생산성 혁신',
      category: '뉴스레터',
      completedAt: '2024.01.15',
      size: '2.4MB',
      type: 'PDF'
    },
    {
      id: 2,
      title: '생성형 AI 시대의 디자인 자동화',
      category: '뉴스레터',
      completedAt: '2024.01.12',
      size: '1.8MB',
      type: 'PDF'
    },
    {
      id: 3,
      title: '하이퍼-개인화와 AI의 역할',
      category: '뉴스레터',
      completedAt: '2024.01.10',
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
      </div>
      
      <div className={styles.archiveList}>
        {archives.map((archive) => {
          const IconComponent = getTypeIcon(archive.type);
          return (
            <div key={archive.id} className={styles.archiveItem}>
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