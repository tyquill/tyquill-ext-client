import React from 'react';
import { IoAdd, IoCreate, IoTrash } from 'react-icons/io5';
import styles from './PageStyles.module.css';

const ScrapPage: React.FC = () => {
  const scraps = [
    {
      id: 1,
      title: '2025년 AI 기술 트렌드와 전망',
      content: 'ChatGPT와 GPT-4의 등장으로 AI 산업이 급속도로 발전하고 있으며, 생성형 AI를 활용한 새로운 비즈니스 모델들이 등장하고 있습니다...',
      tags: ['AI', 'Technology', 'Trends'],
      createdAt: '2024-01-15',
      source: 'TechCrunch'
    },
    {
      id: 2,
      title: '효율적인 업무 자동화 방법',
      content: '반복적인 업무를 자동화하여 생산성을 높이는 다양한 도구와 방법론을 소개합니다...',
      tags: ['Automation', 'Productivity'],
      createdAt: '2024-01-14',
      source: 'Medium'
    }
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>스크랩</h1>
        <p className={styles.pageSubtitle}>저장된 콘텐츠를 관리하고 활용하세요</p>
      </div>
      
      <div className={styles.addButtonContainer}>
        <button className={styles.addButton}>
          <IoAdd size={16} />
          스크랩 추가
        </button>
      </div>
      
      <div className={styles.contentList}>
        {scraps.map((scrap) => (
          <div key={scrap.id} className={styles.contentItem}>
            <div className={styles.contentHeader}>
              <h3 className={styles.contentTitle}>{scrap.title}</h3>
              <div className={styles.contentActions}>
                <button className={styles.actionButton}>
                  <IoTrash size={16} />
                </button>
                <button className={styles.actionButton}>
                  <IoCreate size={16} />
                </button>
              </div>
            </div>
            
            <p className={styles.contentPreview}>{scrap.content}</p>
            
            <div className={styles.contentMeta}>
              <div className={styles.tags}>
                {scrap.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>#{tag}</span>
                ))}
              </div>
              <div className={styles.metaInfo}>
                <span className={styles.source}>{scrap.source}</span>
                <span className={styles.date}>{scrap.createdAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrapPage; 