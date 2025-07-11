import React, { useState } from 'react';
import { IoAdd } from 'react-icons/io5';
import styles from './PageStyles.module.css';

const DraftPage: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [handle, setHandle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('기본 뉴스레터 템플릿');

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
            <option value="기본 뉴스레터 템플릿">기본 뉴스레터 템플릿</option>
          </select>
        </div>

        <div className={styles.referenceSection}>
          <h3 className={styles.sectionTitle}>참고 자료 선택</h3>
          <button className={styles.addReferenceButton}>
            <IoAdd size={16} />
            스크랩에서 자료 추가
          </button>
          <div className={styles.referenceItem}>
            <span>AI와 디자인의 미래: 생산성 혁신</span>
            <button className={styles.removeButton}>×</button>
          </div>
        </div>

        <button className={styles.submitButton}>
          초안 생성하기
        </button>
      </div>
    </div>
  );
};

export default DraftPage; 