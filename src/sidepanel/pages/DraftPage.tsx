import React, { useState } from 'react';
import { IoAdd, IoClose, IoChevronDown } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { Scrap, mockScraps, mockTemplates } from '../../mock/data';

interface SelectedScrap extends Scrap {
  opinion: string;
}

const DraftPage: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [handle, setHandle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('기본 뉴스레터 템플릿');
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [selectedScraps, setSelectedScraps] = useState<SelectedScrap[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const allTags = Array.from(new Set(mockScraps.flatMap(scrap => scrap.tags))).sort();

  const handleScrapSelect = (scrap: Scrap) => {
    if (!selectedScraps.find(s => s.id === scrap.id)) {
      setSelectedScraps([...selectedScraps, { ...scrap, opinion: '' }]);
    }
  };

  const handleOpinionChange = (id: string, opinion: string) => {
    setSelectedScraps(selectedScraps.map(scrap => 
      scrap.id === id ? { ...scrap, opinion } : scrap
    ));
  };

  const handleRemoveScrap = (id: string) => {
    setSelectedScraps(selectedScraps.filter(scrap => scrap.id !== id));
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleTagRemove = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const filteredScraps = mockScraps.filter(scrap =>
    selectedTags.length === 0 || scrap.tags.some(tag => selectedTags.includes(tag))
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>뉴스레터 초안 생성</h1>
      </div>
      
      <div className={styles.draftForm}>
        <div className={styles.formGroup}>
          <label htmlFor="subject" className={styles.formLabel}>
            주제
          </label>
          <input
            id="subject"
            type="text"
            className={styles.formInput}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="뉴스레터의 핵심 주제를 입력하세요"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="message" className={styles.formLabel}>
            키메시지
          </label>
          <textarea
            id="message"
            className={styles.formTextarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="독자들에게 전달하고 싶은 핵심 메시지를 작성해주세요. (예: 생성형 AI를 활용한 디자인 자동화와 하이퍼-개인화가 핵심이 될 것이다.)"
            rows={4}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="handle" className={styles.formLabel}>
            maily 핸들
          </label>
          <input
            id="handle"
            type="text"
            className={styles.formInput}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="예: josh"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="template" className={styles.formLabel}>
            템플릿 선택
          </label>
          <select
            id="template"
            className={styles.formSelect}
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            {mockTemplates.map(template => (
              <option key={template.id} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.referenceSection}>
          <h3 className={styles.sectionTitle}>참고 자료 선택</h3>
          <button 
            className={styles.addReferenceButton}
            onClick={() => setIsScrapModalOpen(true)}
          >
            <IoAdd size={16} />
            스크랩에서 자료 추가
          </button>
          <div className={styles.referenceList}>
            {selectedScraps.map(scrap => (
              <div key={scrap.id} className={styles.referenceItem}>
                <div>
                  <div>{scrap.title}</div>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={scrap.opinion}
                    onChange={(e) => handleOpinionChange(scrap.id, e.target.value)}
                    placeholder="이 자료에 대한 의견을 입력하세요"
                  />
                </div>
                <button 
                  className={styles.removeButton}
                  onClick={() => handleRemoveScrap(scrap.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <button className={styles.submitButton}>
          초안 생성하기
        </button>
      </div>

      {isScrapModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.scrapModal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>스크랩 선택</h2>
              <button 
                className={styles.modalCloseButton}
                onClick={() => setIsScrapModalOpen(false)}
              >
                <IoClose />
              </button>
            </div>

            <div className={styles.tagFilterContainer}>
              <button
                className={styles.tagFilterButton}
                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              >
                태그 선택
                <IoChevronDown size={16} />
              </button>
              
              {isTagDropdownOpen && (
                <div className={styles.tagFilterDropdown}>
                  {allTags.map(tag => (
                    <div
                      key={tag}
                      className={`${styles.tagOption} ${selectedTags.includes(tag) ? styles.selected : ''}`}
                      onClick={() => handleTagSelect(tag)}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              )}
              
              {selectedTags.length > 0 && (
                <div className={styles.selectedTags}>
                  {selectedTags.map(tag => (
                    <span key={tag} className={styles.selectedTag}>
                      #{tag}
                      <button onClick={() => handleTagRemove(tag)}>
                        <IoClose size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalContent}>
              {filteredScraps.map(scrap => (
                <div
                  key={scrap.id}
                  className={`${styles.scrapItem} ${
                    selectedScraps.find(s => s.id === scrap.id) ? styles.selected : ''
                  }`}
                  onClick={() => handleScrapSelect(scrap)}
                >
                  <div className={styles.scrapTitle}>{scrap.title}</div>
                  <div className={styles.scrapContent}>{scrap.content}</div>
                  <div className={styles.scrapFooter}>
                    <div className={styles.scrapTags}>
                      {scrap.tags.map((tag, index) => (
                        <span key={index} className={styles.tag}>#{tag}</span>
                      ))}
                    </div>
                    <div className={styles.scrapDate}>{scrap.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftPage; 