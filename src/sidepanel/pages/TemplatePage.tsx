import React from 'react';
import { IoAdd, IoMail, IoBarChart, IoCreate } from 'react-icons/io5';
import { IconType } from 'react-icons';
import styles from './PageStyles.module.css';

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
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>템플릿</h1>
        <p className={styles.pageSubtitle}>다양한 글쓰기 템플릿을 활용해보세요</p>
      </div>
      
      <div className={styles.addButtonContainer}>
        <button className={styles.addButton}>
          <IoAdd size={16} />
          템플릿 추가
        </button>
      </div>
      
      <div className={styles.templateGrid}>
        {templates.map((template) => {
          const IconComponent = template.icon;
          return (
            <div key={template.id} className={styles.templateCard}>
              <div className={styles.templateIcon}>
                <IconComponent size={32} />
              </div>
              <h3 className={styles.templateTitle}>{template.title}</h3>
              <p className={styles.templateDescription}>{template.description}</p>
              <div className={styles.templateMeta}>
                <span className={styles.category}>{template.category}</span>
                <span className={styles.usageCount}>{template.usageCount}회 사용</span>
              </div>
              <button className={styles.templateUseButton}>사용하기</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplatePage; 