import React from 'react';
import { IoAdd, IoMail, IoBarChart, IoCreate } from 'react-icons/io5';
import { IconType } from 'react-icons';
import './PageStyles.css';

interface Template {
  id: number;
  title: string;
  description: string;
  category: string;
  usageCount: number;
  icon: IconType;
}

const TemplatePage: React.FC = () => {
  const templates: Template[] = [
    {
      id: 1,
      title: '이메일 템플릿',
      description: '비즈니스 이메일 작성을 위한 다양한 템플릿',
      category: 'Business',
      usageCount: 15,
      icon: IoMail
    },
    {
      id: 2,
      title: '보고서 템플릿',
      description: '월간, 주간 보고서 작성 템플릿',
      category: 'Report',
      usageCount: 8,
      icon: IoBarChart
    },
    {
      id: 3,
      title: '블로그 포스트 템플릿',
      description: '매력적인 블로그 글 작성 템플릿',
      category: 'Content',
      usageCount: 23,
      icon: IoCreate
    }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">템플릿</h1>
        <p className="page-subtitle">다양한 글쓰기 템플릿을 활용해보세요</p>
      </div>
      
      <div className="add-button-container">
        <button className="add-button">
          <IoAdd size={16} />
          템플릿 추가
        </button>
      </div>
      
      <div className="template-grid">
        {templates.map((template) => {
          const IconComponent = template.icon;
          return (
            <div key={template.id} className="template-card">
              <div className="template-icon">
                <IconComponent size={32} />
              </div>
              <h3 className="template-title">{template.title}</h3>
              <p className="template-description">{template.description}</p>
              <div className="template-meta">
                <span className="category">{template.category}</span>
                <span className="usage-count">{template.usageCount}회 사용</span>
              </div>
              <button className="template-use-button">사용하기</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplatePage; 