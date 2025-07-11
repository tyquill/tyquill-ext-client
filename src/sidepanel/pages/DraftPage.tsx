import React, { useState } from 'react';
import './PageStyles.css';

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
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">초안생성</h1>
        <p className="page-subtitle">AI가 도와주는 스마트한 글쓰기</p>
      </div>
      
      <div className="draft-generator">
        <div className="generator-form">
          <label htmlFor="prompt" className="form-label">
            어떤 글을 작성하고 싶으신가요?
          </label>
          <textarea
            id="prompt"
            className="prompt-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 회사 소개서, 이메일 초안, 블로그 포스트 등 원하는 글의 주제와 요구사항을 입력해주세요..."
            rows={4}
          />
          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading-spinner">⏳</span>
                AI 초안 생성 중...
              </>
            ) : (
              <>
                <span className="generate-icon">✨</span>
                초안 생성하기
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="recent-drafts">
        <h2 className="section-title">최근 생성한 초안</h2>
        <div className="content-list">
          {recentDrafts.map((draft) => (
            <div key={draft.id} className="content-item">
              <div className="content-header">
                <h3 className="content-title">{draft.title}</h3>
                <div className="content-actions">
                  <button className="action-button">🗑️</button>
                  <button className="action-button">✏️</button>
                </div>
              </div>
              
              <p className="content-preview">{draft.preview}</p>
              
              <div className="content-meta">
                <div className="tags">
                  <span className="tag">#{draft.type}</span>
                </div>
                <div className="meta-info">
                  <span className="date">{draft.createdAt}</span>
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