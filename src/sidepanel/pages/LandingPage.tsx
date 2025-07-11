import React from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const handleStartClick = () => {
    onStart();
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="logo-section">
          <h1 className="logo">Tyquill</h1>
          <p className="tagline">AI-powered writing assistant</p>
        </div>
        
        <div className="features">
          <div className="feature-item">
            <div className="feature-icon">✨</div>
            <h3>Smart Writing</h3>
            <p>AI가 도와주는 스마트한 글쓰기</p>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">🚀</div>
            <h3>Fast & Easy</h3>
            <p>빠르고 간편한 사용법</p>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <h3>Perfect Results</h3>
            <p>완벽한 글쓰기 결과</p>
          </div>
        </div>
        
        <div className="cta-section">
          <button 
            className="start-button"
            onClick={handleStartClick}
          >
            시작하기
          </button>
          <p className="start-description">
            Tyquill과 함께 더 나은 글쓰기를 시작해보세요
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 