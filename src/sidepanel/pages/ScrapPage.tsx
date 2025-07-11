import React from 'react';
import './PageStyles.css';

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
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">스크랩</h1>
        <p className="page-subtitle">저장된 콘텐츠를 관리하고 활용하세요</p>
      </div>
      
      <div className="add-button-container">
        <button className="add-button">
          <span className="add-icon">+</span>
          스크랩 추가
        </button>
      </div>
      
      <div className="content-list">
        {scraps.map((scrap) => (
          <div key={scrap.id} className="content-item">
            <div className="content-header">
              <h3 className="content-title">{scrap.title}</h3>
              <div className="content-actions">
                <button className="action-button">🗑️</button>
                <button className="action-button">✏️</button>
              </div>
            </div>
            
            <p className="content-preview">{scrap.content}</p>
            
            <div className="content-meta">
              <div className="tags">
                {scrap.tags.map((tag, index) => (
                  <span key={index} className="tag">#{tag}</span>
                ))}
              </div>
              <div className="meta-info">
                <span className="source">{scrap.source}</span>
                <span className="date">{scrap.createdAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrapPage; 