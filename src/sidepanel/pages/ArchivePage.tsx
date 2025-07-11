import React from 'react';
import './PageStyles.css';

const ArchivePage: React.FC = () => {
  const archives = [
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF': return '📄';
      case 'DOCX': return '📝';
      default: return '📋';
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">보관함</h1>
        <p className="page-subtitle">완성된 문서를 안전하게 보관하세요</p>
      </div>
      
      <div className="archive-stats">
        <div className="stat-item">
          <div className="stat-number">{archives.length}</div>
          <div className="stat-label">보관된 문서</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">7.4MB</div>
          <div className="stat-label">전체 용량</div>
        </div>
      </div>
      
      <div className="archive-list">
        {archives.map((archive) => (
          <div key={archive.id} className="archive-item">
            <div className="archive-icon">
              {getTypeIcon(archive.type)}
            </div>
            
            <div className="archive-content">
              <h3 className="archive-title">{archive.title}</h3>
              <div className="archive-meta">
                <span className="category">{archive.category}</span>
                <span className="separator">•</span>
                <span className="date">{archive.completedAt}</span>
                <span className="separator">•</span>
                <span className="size">{archive.size}</span>
              </div>
            </div>
            
            <div className="archive-actions">
              <button className="action-button" title="다운로드">
                ⬇️
              </button>
              <button className="action-button" title="공유">
                🔗
              </button>
              <button className="action-button" title="삭제">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArchivePage; 