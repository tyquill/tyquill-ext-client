import React, { useState } from 'react';
import { IoReload, IoSparkles, IoTrash, IoCreate } from 'react-icons/io5';
import styles from './PageStyles.module.css';

const DraftPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    // 시뮬레이션: 3초 후 완료
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  const recentDrafts = [
    {
      id: 1,
      title: '마케팅 전략 제안서',
      preview: '2024년 디지털 마케팅 트렌드를 기반으로 한 새로운 마케팅 전략...',
      createdAt: '2024-01-15',
      type: 'Business'
    },
    {
      id: 2,
      title: '프로젝트 진행 보고서',
      preview: '1분기 프로젝트 진행 현황과 주요 성과를 정리한 보고서...',
      createdAt: '2024-01-14',
      type: 'Report'
    }
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>초안생성</h1>
        <p className={styles.pageSubtitle}>AI가 도와주는 스마트한 글쓰기</p>
      </div>
      
      <div className={styles.draftGenerator}>
        <div className={styles.generatorForm}>
          <label htmlFor="prompt" className={styles.formLabel}>
            어떤 글을 작성하고 싶으신가요?
          </label>
          <textarea
            id="prompt"
            className={styles.promptTextarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 회사 소개서, 이메일 초안, 블로그 포스트 등 원하는 글의 주제와 요구사항을 입력해주세요..."
            rows={4}
          />
          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <IoReload size={16} className={styles.loadingSpinner} />
                AI 초안 생성 중...
              </>
            ) : (
              <>
                <IoSparkles size={16} />
                초안 생성하기
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className={styles.recentDrafts}>
        <h2 className={styles.sectionTitle}>최근 생성한 초안</h2>
        <div className={styles.contentList}>
          {recentDrafts.map((draft) => (
            <div key={draft.id} className={styles.contentItem}>
              <div className={styles.contentHeader}>
                <h3 className={styles.contentTitle}>{draft.title}</h3>
                <div className={styles.contentActions}>
                  <button className={styles.actionButton}>
                    <IoTrash size={16} />
                  </button>
                  <button className={styles.actionButton}>
                    <IoCreate size={16} />
                  </button>
                </div>
              </div>
              
              <p className={styles.contentPreview}>{draft.preview}</p>
              
              <div className={styles.contentMeta}>
                <div className={styles.tags}>
                  <span className={styles.tag}>#{draft.type}</span>
                </div>
                <div className={styles.metaInfo}>
                  <span className={styles.date}>{draft.createdAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DraftPage; 