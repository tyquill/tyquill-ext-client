import React, { useEffect, useReducer, useState, useMemo } from 'react';
import { IoAdd, IoClose } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { Scrap, mockTemplates } from '../../mock/data';
import { TagSelector } from '../components/TagSelector';
import { TagList } from '../components/TagList';
import { ScrapResponse, scrapService } from '../../services/scrapService';
import { articleService, GenerateArticleDto, ScrapWithOptionalComment } from '../../services/articleService';

interface ArticleGeneratePageProps {
  onNavigateToDetail: (articleId: number) => void;
}

interface SelectedScrap extends ScrapResponse {
  opinion: string;
}

interface ArticleGenerateState {
  topic: string;
  keyInsight: string;
  handle: string;
  selectedTemplate: string;
  isScrapModalOpen: boolean;
  selectedScraps: SelectedScrap[];
  selectedTags: string[];
  isTagDropdownOpen: boolean;
  isGenerating: boolean;
  generationError: string | null;
}

type DraftAction =
  | { type: 'SET_SUBJECT'; payload: string }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'SET_HANDLE'; payload: string }
  | { type: 'SET_TEMPLATE'; payload: string }
  | { type: 'TOGGLE_SCRAP_MODAL' }
  | { type: 'ADD_SCRAP'; payload: ScrapResponse }
  | { type: 'UPDATE_SCRAP_OPINION'; payload: { id: number; opinion: string } }
  | { type: 'REMOVE_SCRAP'; payload: number }
  | { type: 'CLEAR_SCRAPS' }
  | { type: 'TOGGLE_TAG'; payload: string }
  | { type: 'REMOVE_TAG'; payload: string }
  | { type: 'TOGGLE_TAG_DROPDOWN' }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_GENERATION_ERROR'; payload: string | null };

const STORAGE_KEY = 'tyquill-article-generate-draft';

const getInitialState = (): ArticleGenerateState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsedState = JSON.parse(saved);
      return {
        ...parsedState,
        isScrapModalOpen: false,
        isTagDropdownOpen: false,
        isGenerating: false,
        generationError: null,
      };
    }
  } catch (error) {
    console.warn('Failed to load saved draft state:', error);
  }
  
  return {
    topic: '',
    keyInsight: '',
    handle: '',
    selectedTemplate: '비즈니스 미팅 요청',
    isScrapModalOpen: false,
    selectedScraps: [],
    selectedTags: [],
    isTagDropdownOpen: false,
    isGenerating: false,
    generationError: null,
  };
};

function draftReducer(state: ArticleGenerateState, action: DraftAction): ArticleGenerateState {
  switch (action.type) {
    case 'SET_SUBJECT':
      return { ...state, topic: action.payload };
    case 'SET_MESSAGE':
      return { ...state, keyInsight: action.payload };
    case 'SET_HANDLE':
      return { ...state, handle: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    case 'TOGGLE_SCRAP_MODAL':
      return { ...state, isScrapModalOpen: !state.isScrapModalOpen };
    case 'ADD_SCRAP':
      return !state.selectedScraps.find(s => s.scrapId === action.payload.scrapId)
        ? { ...state, selectedScraps: [...state.selectedScraps, { ...action.payload, opinion: '' }] }
        : state;
    case 'UPDATE_SCRAP_OPINION':
      return {
        ...state,
        selectedScraps: state.selectedScraps.map(scrap =>
          scrap.scrapId === action.payload.id ? { ...scrap, opinion: action.payload.opinion } : scrap
        ),
      };
    case 'REMOVE_SCRAP':
      return {
        ...state,
        selectedScraps: state.selectedScraps.filter(scrap => scrap.scrapId !== action.payload),
      };
    case 'CLEAR_SCRAPS':
      return {
        ...state,
        selectedScraps: [],
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
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_GENERATION_ERROR':
      return { ...state, generationError: action.payload };
    default:
      return state;
  }
}

const ArticleGeneratePage: React.FC<ArticleGeneratePageProps> = ({ onNavigateToDetail }) => {
  const [state, dispatch] = useReducer(draftReducer, getInitialState());
  const [showAllTags, setShowAllTags] = useState<string | null>(null);

  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    const stateToSave = {
      topic: state.topic,
      keyInsight: state.keyInsight,
      handle: state.handle,
      selectedTemplate: state.selectedTemplate,
      selectedScraps: state.selectedScraps,
      selectedTags: state.selectedTags,
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save draft state:', error);
    }
  }, [state.topic, state.keyInsight, state.handle, state.selectedTemplate, state.selectedScraps, state.selectedTags]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // 모달 바깥 클릭 처리
      if (state.isScrapModalOpen) {
        const modalOverlay = document.querySelector(`.${styles.modalOverlay}`);
        const scrapModal = document.querySelector(`.${styles.scrapModal}`);
        
        if (modalOverlay && target === modalOverlay && !scrapModal?.contains(target)) {
          dispatch({ type: 'TOGGLE_SCRAP_MODAL' });
        }
      }

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
  }, [showAllTags, state.isScrapModalOpen]);

  const handleScrapSelect = (scrap: ScrapResponse) => {
    // 이미 선택된 스크랩인지 확인
    const isSelected = state.selectedScraps.find(s => s.scrapId === scrap.scrapId);
    
    if (isSelected) {
      // 이미 선택된 경우 선택 해제
      dispatch({ type: 'REMOVE_SCRAP', payload: scrap.scrapId });
    } else {
      // 선택되지 않은 경우 추가
      dispatch({ type: 'ADD_SCRAP', payload: scrap });
    }
  };

  const handleOpinionChange = (id: number, opinion: string) => {
    dispatch({ type: 'UPDATE_SCRAP_OPINION', payload: { id, opinion } });
  };

  const handleRemoveScrap = (id: number) => {
    dispatch({ type: 'REMOVE_SCRAP', payload: id });
  };

  const handleGenerateArticle = async () => {
    if (!state.topic || !state.keyInsight) {
      dispatch({ type: 'SET_GENERATION_ERROR', payload: '주제와 키메시지를 입력해주세요.' });
      return;
    }

    try {
      dispatch({ type: 'SET_GENERATING', payload: true });
      dispatch({ type: 'SET_GENERATION_ERROR', payload: null });

      const generateData: GenerateArticleDto = {
        topic: state.topic,
        keyInsight: state.keyInsight,
        scrapWithOptionalComment: state.selectedScraps.map(scrap => ({
          scrapId: scrap.scrapId,
          userComment: scrap.opinion || undefined,
        })),
        generationParams: state.handle || undefined,
      };

      // console.log('🤖 Generating article with data:', generateData);

      const result = await articleService.generateArticle(generateData);
      // console.log('✅ Article generated:', result);
      // console.log('✅ Article ID from result:', result.id);
      // console.log('✅ onNavigateToDetail function:', onNavigateToDetail);
      
      // 초기 상태로 리셋 및 localStorage 클리어 (네비게이션 전에 실행)
      dispatch({ type: 'SET_SUBJECT', payload: '' });
      dispatch({ type: 'SET_MESSAGE', payload: '' });
      dispatch({ type: 'SET_HANDLE', payload: '' });
      dispatch({ type: 'CLEAR_SCRAPS' });
      
      // Clear saved draft after successful generation
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear saved draft state:', error);
      }
      
      // 성공 시 상세 페이지로 이동
      if (onNavigateToDetail && result.id) {
        // console.log('🚀 Navigating to detail page with articleId:', result.id);
        onNavigateToDetail(result.id);
      } else {
        // console.log('❌ Navigation failed - missing onNavigateToDetail or articleId');
        // console.log('onNavigateToDetail:', onNavigateToDetail);
        // console.log('result.id:', result.id);
        alert('아티클이 성공적으로 생성되었습니다!');
      }
      
    } catch (error: any) {
      // console.error('❌ Failed to generate article:', error);
      dispatch({ type: 'SET_GENERATION_ERROR', payload: error.message || '아티클 생성에 실패했습니다.' });
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false });
    }
  };




  const [allScraps, setAllScraps] = useState<ScrapResponse[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchScraps = async () => {
      const scraps: ScrapResponse[] = await scrapService.getScraps();
      setAllScraps(scraps);
      setAllTags(Array.from(new Set(scraps.flatMap(scrap => scrap.tags?.map(tag => tag.name) || []))).sort());
    };
    fetchScraps();
  }, []);

  // 선택된 태그에 따라 필터링된 스크랩 목록
  const filteredScraps = useMemo(() => {
    if (state.selectedTags.length === 0) {
      return allScraps; // 선택된 태그가 없으면 모든 스크랩 표시
    }
    
    return allScraps.filter(scrap => {
      // 선택된 태그 중 하나라도 스크랩에 포함되어 있으면 표시
      return state.selectedTags.some(selectedTag => 
        scrap.tags?.some(tag => tag.name === selectedTag)
      );
    });
  }, [allScraps, state.selectedTags]);

  // 날짜 포맷팅 함수
  const formatScrapDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
    } catch (error) {
      return dateString; // 파싱 실패시 원본 반환
    }
  };

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
            value={state.topic}
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
            value={state.keyInsight}
            onChange={(e) => dispatch({ type: 'SET_MESSAGE', payload: e.target.value })}
            placeholder="독자들에게 전달하고 싶은 핵심 메시지를 작성해주세요. (예: 생성형 AI를 활용한 디자인 자동화와 하이퍼-개인화가 핵심이 될 것이다.)"
            rows={4}
          />
        </div>

        {/* <div className={styles.formGroup}>
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
        </div> */}

        {/* <div className={styles.formGroup}>
          <label htmlFor="template" className={styles.formLabel}>
            템플릿 선택 <span style={{ color: '#999', fontSize: '0.9em' }}>(개발 중)</span>
          </label>
          <select
            id="template"
            className={styles.formSelect}
            value={state.selectedTemplate}
            onChange={(e) => dispatch({ type: 'SET_TEMPLATE', payload: e.target.value })}
            disabled={true}
            style={{ opacity: 0.6 }}
          >
            {mockTemplates.map(template => (
              <option key={template.id} value={template.title}>
                {template.title}
              </option>
            ))}
          </select>
        </div> */}

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
              <div key={scrap.scrapId} className={styles.referenceItem}>
                <div>
                  <div>{scrap.title}</div>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={scrap.opinion}
                    onChange={(e) => handleOpinionChange(scrap.scrapId, e.target.value)}
                    placeholder="이 자료에 대한 의견을 입력하세요"
                  />
                </div>
                <button 
                  className={styles.removeButton}
                  onClick={() => handleRemoveScrap(scrap.scrapId)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {state.generationError && (
          <div className={styles.errorMessage}>
            {state.generationError}
          </div>
        )}

        <button 
          className={`${styles.submitButton} ${state.isGenerating ? styles.loading : ''}`}
          onClick={handleGenerateArticle}
          disabled={state.isGenerating}
        >
          {state.isGenerating ? '생성 중...' : '초안 생성하기'}
        </button>
      </div>

      {state.isScrapModalOpen && (
        <div 
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              dispatch({ type: 'TOGGLE_SCRAP_MODAL' });
            }
          }}
        >
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
              {filteredScraps.map((scrap: ScrapResponse) => (
                <div
                  key={scrap.scrapId}
                  className={`${styles.scrapItem} ${
                    state.selectedScraps.find(s => s.scrapId === scrap.scrapId) ? styles.selected : ''
                  }`}
                  onClick={() => handleScrapSelect(scrap)}
                  data-url={scrap.url}
                >
                  <div className={styles.scrapTitle}>{scrap.title}</div>
                  <div className={styles.scrapContent}>{scrap.content.length > 100 ? `${scrap.content.substring(0, 100)}...` : scrap.content}</div>
                  <div className={styles.scrapFooter}>
                    <div className={styles.scrapTags}>
                      <TagList tags={scrap.tags?.map(tag => tag.name) || []} />
                    </div>
                    <div className={styles.scrapDate}>{formatScrapDate(scrap.createdAt)}</div>
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

export default ArticleGeneratePage; 