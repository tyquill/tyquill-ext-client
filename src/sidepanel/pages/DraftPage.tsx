import React, { useReducer, useState } from 'react';
import { IoAdd, IoClose } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { Scrap, mockScraps, mockTemplates } from '../../mock/data';
import { TagSelector } from '../components/TagSelector';
import { TagList } from '../components/TagList';

interface SelectedScrap extends Scrap {
  opinion: string;
}

interface DraftState {
  subject: string;
  message: string;
  handle: string;
  selectedTemplate: string;
  isScrapModalOpen: boolean;
  selectedScraps: SelectedScrap[];
  selectedTags: string[];
  isTagDropdownOpen: boolean;
}

type DraftAction =
  | { type: 'SET_SUBJECT'; payload: string }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'SET_HANDLE'; payload: string }
  | { type: 'SET_TEMPLATE'; payload: string }
  | { type: 'TOGGLE_SCRAP_MODAL' }
  | { type: 'ADD_SCRAP'; payload: Scrap }
  | { type: 'UPDATE_SCRAP_OPINION'; payload: { id: string; opinion: string } }
  | { type: 'REMOVE_SCRAP'; payload: string }
  | { type: 'TOGGLE_TAG'; payload: string }
  | { type: 'REMOVE_TAG'; payload: string }
  | { type: 'TOGGLE_TAG_DROPDOWN' };

const initialState: DraftState = {
  subject: '',
  message: '',
  handle: '',
  selectedTemplate: '비즈니스 미팅 요청',
  isScrapModalOpen: false,
  selectedScraps: [],
  selectedTags: [],
  isTagDropdownOpen: false,
};

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'SET_SUBJECT':
      return { ...state, subject: action.payload };
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'SET_HANDLE':
      return { ...state, handle: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    case 'TOGGLE_SCRAP_MODAL':
      return { ...state, isScrapModalOpen: !state.isScrapModalOpen };
    case 'ADD_SCRAP':
      return !state.selectedScraps.find(s => s.id === action.payload.id)
        ? { ...state, selectedScraps: [...state.selectedScraps, { ...action.payload, opinion: '' }] }
        : state;
    case 'UPDATE_SCRAP_OPINION':
      return {
        ...state,
        selectedScraps: state.selectedScraps.map(scrap =>
          scrap.id === action.payload.id ? { ...scrap, opinion: action.payload.opinion } : scrap
        ),
      };
    case 'REMOVE_SCRAP':
      return {
        ...state,
        selectedScraps: state.selectedScraps.filter(scrap => scrap.id !== action.payload),
      };
    case 'TOGGLE_TAG':
      return {
        ...state,
        selectedTags: state.selectedTags.includes(action.payload)
          ? state.selectedTags.filter(tag => tag !== action.payload)
          : [...state.selectedTags, action.payload],
      };
    case 'REMOVE_TAG':
      return {
        ...state,
        selectedTags: state.selectedTags.filter(tag => tag !== action.payload),
      };
    case 'TOGGLE_TAG_DROPDOWN':
      return { ...state, isTagDropdownOpen: !state.isTagDropdownOpen };
    default:
      return state;
  }
}

const DraftPage: React.FC = () => {
  const [state, dispatch] = useReducer(draftReducer, initialState);
  const dropdownRef = React.useRef<HTMLButtonElement>(null);
  const [showAllTags, setShowAllTags] = useState<string | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // 태그 목록 툴팁 처리
      if (showAllTags !== null) {
        const tagListTooltip = document.querySelector(`[data-taglist-id="${showAllTags}"]`);
        if (tagListTooltip && !tagListTooltip.contains(target) &&
            !(target instanceof HTMLButtonElement && target.classList.contains(styles.moreTag))) {
          setShowAllTags(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAllTags]);

  const allTags = Array.from(new Set(mockScraps.flatMap(scrap => scrap.tags))).sort();

  const handleScrapSelect = (scrap: Scrap) => {
    dispatch({ type: 'ADD_SCRAP', payload: scrap });
  };

  const handleOpinionChange = (id: string, opinion: string) => {
    dispatch({ type: 'UPDATE_SCRAP_OPINION', payload: { id, opinion } });
  };

  const handleRemoveScrap = (id: string) => {
    dispatch({ type: 'REMOVE_SCRAP', payload: id });
  };

  const handleTagSelect = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: 'TOGGLE_TAG', payload: tag });
  };

  const handleTagRemove = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: 'REMOVE_TAG', payload: tag });
  };

  const toggleDropdown = (event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: 'TOGGLE_TAG_DROPDOWN' });
  };

  const filteredScraps = mockScraps.filter(scrap =>
    state.selectedTags.length === 0 || scrap.tags.some(tag => state.selectedTags.includes(tag))
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
            value={state.subject}
            onChange={(e) => dispatch({ type: 'SET_SUBJECT', payload: e.target.value })}
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
            value={state.message}
            onChange={(e) => dispatch({ type: 'SET_MESSAGE', payload: e.target.value })}
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
            value={state.handle}
            onChange={(e) => dispatch({ type: 'SET_HANDLE', payload: e.target.value })}
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
            value={state.selectedTemplate}
            onChange={(e) => dispatch({ type: 'SET_TEMPLATE', payload: e.target.value })}
          >
            {mockTemplates.map(template => (
              <option key={template.id} value={template.title}>
                {template.title}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.referenceSection}>
          <h3 className={styles.sectionTitle}>참고 자료 선택</h3>
          <button 
            className={styles.addReferenceButton}
            onClick={() => dispatch({ type: 'TOGGLE_SCRAP_MODAL' })}
          >
            <IoAdd size={16} />
            스크랩에서 자료 추가
          </button>
          <div className={styles.referenceList}>
            {state.selectedScraps.map(scrap => (
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

      {state.isScrapModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.scrapModal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>스크랩 선택</h2>
              <button 
                className={styles.modalCloseButton}
                onClick={() => dispatch({ type: 'TOGGLE_SCRAP_MODAL' })}
              >
                <IoClose />
              </button>
            </div>

            <TagSelector
              availableTags={allTags}
              selectedTags={state.selectedTags}
              onTagSelect={(tag) => dispatch({ type: 'TOGGLE_TAG', payload: tag })}
              onTagRemove={(tag) => dispatch({ type: 'REMOVE_TAG', payload: tag })}
            />

            <div className={styles.modalContent}>
              {filteredScraps.map(scrap => (
                <div
                  key={scrap.id}
                  className={`${styles.scrapItem} ${
                    state.selectedScraps.find(s => s.id === scrap.id) ? styles.selected : ''
                  }`}
                  onClick={() => handleScrapSelect(scrap)}
                  data-url={scrap.url}
                >
                  <div className={styles.scrapTitle}>{scrap.title}</div>
                  <div className={styles.scrapContent}>{scrap.content}</div>
                  <div className={styles.scrapFooter}>
                    <div className={styles.scrapTags}>
                      <TagList tags={scrap.tags} />
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