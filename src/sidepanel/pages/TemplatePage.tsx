import React, { useState } from 'react';
import { IoCreate, IoTrash, IoAdd } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { Template, mockTemplates } from '../../mock/data';

type TemplateMode = 'load' | 'create';

const TemplatePage: React.FC = () => {
  const [templateMode, setTemplateMode] = useState<TemplateMode>('load');
  const [activeMethod, setActiveMethod] = useState<'description' | 'link'>('link');
  const [templateName, setTemplateName] = useState('');
  const [templateLink, setTemplateLink] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [importTemplateName, setImportTemplateName] = useState('');

  const handleMethodChange = (method: 'description' | 'link') => {
    setActiveMethod(method);
    // 방식 변경시 입력 필드 초기화
    setTemplateName('');
    setTemplateLink('');
    setTemplateDescription('');
  };

  const renderLoadTemplate = () => {
    return (
      <div className={styles.loadTemplateContainer}>
        <div className={styles.mailySoGuide}>
          <p className={styles.guideText}>
            maily.so의 <a href="https://app.maily.so/templates" target="_blank" rel="noopener noreferrer" className={styles.guideLink}>자신의 템플릿 페이지</a>로 이동하여 클릭 한 번에 자신의 템플릿을 불러오세요.
          </p>
        </div>

        <div className={styles.importForm}>
          <div className={styles.formGroup}>
            <label htmlFor="importTemplateName" className={styles.formLabel}>
              템플릿 이름
            </label>
            <input
              id="importTemplateName"
              type="text"
              className={styles.formInput}
              value={importTemplateName}
              onChange={(e) => setImportTemplateName(e.target.value)}
              placeholder="템플릿 이름을 입력하세요"
            />
          </div>
          <button className={styles.submitButton}>
            <IoAdd size={20} />
            현재 페이지에서 템플릿 불러오기
          </button>
        </div>

        <h2 className={styles.sectionTitle}>저장된 템플릿</h2>
        <div className={styles.templateList}>
          {mockTemplates.map((template) => (
            <div key={template.id} className={styles.templateItem}>
              <div className={styles.templateContent}>
                <h3 className={styles.templateItemTitle}>{template.title}</h3>
                <p className={styles.templateItemDescription}>{template.description}</p>
                <div className={styles.templateItemMeta}>
                  {template.type === 'link' ? '링크 기반' : '설명 기반'} • {template.createdAt}
                </div>
              </div>
              <div className={styles.templateActions}>
                <button className={styles.actionButton}>
                  <IoCreate size={16} />
                </button>
                <button className={styles.actionButton}>
                  <IoTrash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCreateTemplate = () => {
    return (
      <div className={styles.createTemplateContainer}>
        <div className={styles.templateButtons}>
          <button 
            className={`${styles.templateMethodButton} ${activeMethod === 'description' ? '' : styles.inactive}`}
            onClick={() => handleMethodChange('description')}
          >
            설명으로 만들기
          </button>
          <button 
            className={`${styles.templateMethodButton} ${activeMethod === 'link' ? '' : styles.inactive}`}
            onClick={() => handleMethodChange('link')}
          >
            링크로 구조 학습하기
          </button>
        </div>

        <div className={styles.templateForm}>
          <div className={styles.formGroup}>
            <label htmlFor="templateName" className={styles.formLabel}>
              템플릿 이름
            </label>
            <input
              id="templateName"
              type="text"
              className={styles.formInput}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="템플릿 이름을 입력하세요"
            />
          </div>

          {activeMethod === 'link' ? (
            <div className={styles.formGroup}>
              <label htmlFor="templateLink" className={styles.formLabel}>
                참고링크
              </label>
              <input
                id="templateLink"
                type="text"
                className={styles.formInput}
                value={templateLink}
                onChange={(e) => setTemplateLink(e.target.value)}
                placeholder="https://example.com/newsletter1"
              />
              <p className={styles.formHelp}>
                참고하고 싶은 글의 링크를 1개 이상 입력하세요. AI가 링크들의 공통적인 구조를 분석하여 템플릿을 생성합니다.
              </p>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label htmlFor="templateDescription" className={styles.formLabel}>
                템플릿 구조 설명
              </label>
              <textarea
                id="templateDescription"
                className={styles.formTextarea}
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="AI가 이해할 수 있도록 원하는 이메일 템플릿 구조를 자세히 설명해주세요. (예: '제목, 인사말, 본문 내용, 감사 인사, 서명으로 구성된 비즈니스 이메일 템플릿')"
                rows={4}
              />
            </div>
          )}

          <button className={styles.submitButton}>
            템플릿 저장
          </button>
        </div>

        <h2 className={styles.sectionTitle}>저장된 템플릿</h2>
        <div className={styles.templateList}>
          {mockTemplates.map((template) => (
            <div key={template.id} className={styles.templateItem}>
              <div className={styles.templateContent}>
                <h3 className={styles.templateItemTitle}>{template.title}</h3>
                <p className={styles.templateItemDescription}>{template.description}</p>
                <div className={styles.templateItemMeta}>
                  {template.type === 'link' ? '링크 기반' : '설명 기반'} • {template.createdAt}
                </div>
              </div>
              <div className={styles.templateActions}>
                <button className={styles.actionButton}>
                  <IoCreate size={16} />
                </button>
                <button className={styles.actionButton}>
                  <IoTrash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.templatePage}>
      <div className={styles.templateModeButtons}>
        <button
          className={`${styles.mainModeButton} ${templateMode === 'load' ? styles.active : ''}`}
          onClick={() => setTemplateMode('load')}
        >
          템플릿 불러오기
        </button>
        <button
          className={`${styles.mainModeButton} ${templateMode === 'create' ? styles.active : ''}`}
          onClick={() => setTemplateMode('create')}
        >
          템플릿 생성하기
        </button>
      </div>
      <div className={styles.templateContent}>
        {templateMode === 'load' ? renderLoadTemplate() : renderCreateTemplate()}
      </div>
    </div>
  );
};

export default TemplatePage; 