import React, { useEffect, useReducer, useState, useMemo } from 'react';
import { IoAdd, IoClose, IoSparkles, IoCheckmark, IoTrash, IoRemove } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { Scrap, mockTemplates } from '../../mock/data';
import { TagSelector } from '../components/TagSelector';
import { TagList } from '../components/TagList';
import { useToastHelpers } from '../../hooks/useToast';
import { ScrapResponse, scrapService } from '../../services/scrapService';
import { articleService, GenerateArticleDto, ScrapWithOptionalComment, TemplateSection } from '../../services/articleService';

interface ArticleGeneratePageProps {
  onNavigateToDetail: (articleId: number) => void;
  currentPage?: string;
  onRefreshArchiveList?: () => void;
}

interface SelectedScrap extends ScrapResponse {
  opinion: string;
}

// Template sections are imported from articleService

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
  generationStatus: 'idle' | 'success' | 'error';
  // New state properties
  templateStructure: TemplateSection[] | null;
  structuredIdeas: Record<string, string>;
  templateTitles: Record<string, string>; // 편집된 템플릿 제목들 (sectionId 기반)
  sectionIdCounter: number; // 고유 ID 생성용 카운터
  isAnalyzing: boolean;
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
  | { type: 'SET_GENERATION_ERROR'; payload: string | null }
  | { type: 'SET_GENERATION_STATUS'; payload: 'idle' | 'success' | 'error' }
  // New actions
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_TEMPLATE_STRUCTURE'; payload: TemplateSection[] | null }
  | { type: 'SET_STRUCTURED_IDEA'; payload: { sectionId: string; idea: string } }
  | { type: 'SET_TEMPLATE_TITLE'; payload: { sectionId: string; newTitle: string } }
  | { type: 'ADD_TEMPLATE_SECTION'; payload: { parentId?: string; title: string } }
  | { type: 'REMOVE_TEMPLATE_SECTION'; payload: string }
  | { type: 'CLEAR_TEMPLATE' };

const STORAGE_KEY = 'tyquill-article-generate-draft';

const getInitialState = (): ArticleGenerateState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('🔍 Loading saved state:', saved);
    if (saved) {
      const parsedState = JSON.parse(saved);
      console.log('🔍 Parsed state:', parsedState);
      console.log('🔍 Template structure from storage:', parsedState.templateStructure);
      
      const restoredState = {
        ...parsedState,
        isScrapModalOpen: false,
        isTagDropdownOpen: false,
        isGenerating: false,
        generationError: null,
        generationStatus: 'idle',
        templateStructure: parsedState.templateStructure || null, // 템플릿 구조도 복원
        structuredIdeas: parsedState.structuredIdeas || {},
        templateTitles: parsedState.templateTitles || {},
        sectionIdCounter: parsedState.sectionIdCounter || 0,
        isAnalyzing: false,
      };
      
      console.log('✅ Restored state with template:', restoredState.templateStructure);
      return restoredState;
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
    generationStatus: 'idle',
    templateStructure: null, // 기본값은 null
    structuredIdeas: {},
    templateTitles: {},
    sectionIdCounter: 0,
    isAnalyzing: false,
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
    case 'SET_GENERATION_STATUS':
      return { ...state, generationStatus: action.payload };
    // New reducers
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    case 'SET_TEMPLATE_STRUCTURE':
      // AI로 생성된 섹션에도 고유 ID 부여 및 기본 제목 저장
      let counter = state.sectionIdCounter;
      const initialTitles: Record<string, string> = {};
      
      const assignIds = (sections: TemplateSection[]): TemplateSection[] => {
        return sections.map(section => {
          const sectionId = section.id || `section_${counter++}`;
          initialTitles[sectionId] = section.title; // 기본 제목 저장
          return {
            ...section,
            id: sectionId,
            children: section.children ? assignIds(section.children) : []
          };
        });
      };
      
      const sectionsWithIds = action.payload ? assignIds(action.payload) : null;
      
      return { 
        ...state, 
        templateStructure: sectionsWithIds, 
        structuredIdeas: {}, 
        templateTitles: initialTitles, // AI 섹션들의 기본 제목 저장
        sectionIdCounter: counter
      };
    case 'SET_STRUCTURED_IDEA':
      return { ...state, structuredIdeas: { ...state.structuredIdeas, [action.payload.sectionId]: action.payload.idea } };
    case 'SET_TEMPLATE_TITLE':
      return { ...state, templateTitles: { ...state.templateTitles, [action.payload.sectionId]: action.payload.newTitle } };
    case 'ADD_TEMPLATE_SECTION':
      const newSectionId = `section_${state.sectionIdCounter}`;
      const newSection: TemplateSection = {
        title: action.payload.title,
        description: '',
        children: [],
        id: newSectionId
      };
      
      if (!action.payload.parentId) {
        // 최상위 섹션 추가 (templateStructure가 null이면 새 배열 생성)
        return {
          ...state,
          templateStructure: state.templateStructure ? [...state.templateStructure, newSection] : [newSection],
          templateTitles: { ...state.templateTitles, [newSectionId]: action.payload.title }, // 기본 제목 저장
          sectionIdCounter: state.sectionIdCounter + 1
        };
      } else {
        // 하위 섹션 추가 - templateStructure가 없으면 스킵
        if (!state.templateStructure) return state;
        
        const addChildToSection = (sections: TemplateSection[]): TemplateSection[] => {
          return sections.map((section) => {
            if (section.id === action.payload.parentId) {
              return {
                ...section,
                children: [...(section.children || []), newSection]
              };
            }
            if (section.children && section.children.length > 0) {
              return {
                ...section,
                children: addChildToSection(section.children)
              };
            }
            return section;
          });
        };
        
        return {
          ...state,
          templateStructure: addChildToSection(state.templateStructure),
          templateTitles: { ...state.templateTitles, [newSectionId]: action.payload.title }, // 기본 제목 저장
          sectionIdCounter: state.sectionIdCounter + 1
        };
      }
    case 'REMOVE_TEMPLATE_SECTION':
      if (!state.templateStructure) return state;
      
      const removeSectionById = (sections: TemplateSection[], targetId: string): TemplateSection[] => {
        return sections.filter((section) => {
          if (section.id === targetId) {
            return false; // 이 섹션 제거
          }
          
          if (section.children && section.children.length > 0) {
            section.children = removeSectionById(section.children, targetId);
          }
          
          return true;
        });
      };
      
      // 삭제된 섹션의 데이터도 제거
      const updatedStructuredIdeas = { ...state.structuredIdeas };
      const updatedTemplateTitles = { ...state.templateTitles };
      delete updatedStructuredIdeas[action.payload];
      delete updatedTemplateTitles[action.payload];
      
      return {
        ...state,
        templateStructure: removeSectionById(state.templateStructure, action.payload),
        structuredIdeas: updatedStructuredIdeas,
        templateTitles: updatedTemplateTitles
      };
    case 'CLEAR_TEMPLATE':
      return { ...state, templateStructure: null, structuredIdeas: {}, templateTitles: {} };
    default:
      return state;
  }
}

const ArticleGeneratePage: React.FC<ArticleGeneratePageProps> = ({ 
  onNavigateToDetail, 
  currentPage,
  onRefreshArchiveList 
}) => {
  const { showSuccess, showError, showInfo } = useToastHelpers();
  const [state, dispatch] = useReducer(draftReducer, getInitialState());
  
  // 디버깅: 템플릿 구조 상태 변화 추적
  useEffect(() => {
    console.log('📊 Current template structure:', state.templateStructure);
  }, [state.templateStructure]);
  const [showAllTags, setShowAllTags] = useState<string | null>(null);

  // Save state to localStorage whenever relevant state changes (템플릿 포함)
  useEffect(() => {
    const stateToSave = {
      topic: state.topic,
      keyInsight: state.keyInsight,
      handle: state.handle,
      selectedTemplate: state.selectedTemplate,
      selectedScraps: state.selectedScraps,
      selectedTags: state.selectedTags,
      // 템플릿 관련 상태들도 저장
      templateStructure: state.templateStructure,
      structuredIdeas: state.structuredIdeas,
      templateTitles: state.templateTitles,
      sectionIdCounter: state.sectionIdCounter,
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save draft state:', error);
    }
  }, [
    state.topic, 
    state.keyInsight, 
    state.handle, 
    state.selectedTemplate, 
    state.selectedScraps, 
    state.selectedTags,
    state.templateStructure,
    state.structuredIdeas,
    state.templateTitles,
    state.sectionIdCounter
  ]);

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
    const isSelected = state.selectedScraps.find(s => s.scrapId === scrap.scrapId);
    
    if (isSelected) {
      dispatch({ type: 'REMOVE_SCRAP', payload: scrap.scrapId });
    } else {
      dispatch({ type: 'ADD_SCRAP', payload: scrap });
    }
  };

  const handleOpinionChange = (id: number, opinion: string) => {
    dispatch({ type: 'UPDATE_SCRAP_OPINION', payload: { id, opinion } });
  };

  const handleRemoveScrap = (id: number) => {
    dispatch({ type: 'REMOVE_SCRAP', payload: id });
  };

  const handleGenerateTemplateFromPage = async () => {
    if (state.isAnalyzing) return;

    try {
      dispatch({ type: 'SET_ANALYZING', payload: true });
      
      // 현재 활성 탭 정보 가져오기
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id) {
        throw new Error('활성 탭을 찾을 수 없습니다.');
      }

      // URL 체크 - 제한된 페이지에서는 스크랩 불가
      if (tab.url?.startsWith('chrome://') || 
          tab.url?.startsWith('chrome-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error('이 페이지에서는 스크랩할 수 없습니다. (chrome://, extension:// 등 제한된 페이지)');
      }

      // Content Script가 로드되었는지 확인
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
      } catch (pingError) {
        // Content script 수동 주입 시도
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['contentScript/index.js']
        });
        
        // 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      showInfo('페이지 분석 중...', '현재 페이지의 구조를 분석하여 템플릿을 생성하고 있습니다.');

      // 페이지 콘텐츠 스크랩
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'CLIP_PAGE',
        options: { includeMetadata: false }
      });

      if (!response.success) {
        throw new Error(response.error || '페이지 콘텐츠를 가져오는데 실패했습니다.');
      }

      // 서버에 콘텐츠 분석 요청
      const templateSections = await articleService.analyzeContentForTemplate({
        content: response.data.content,
      });

      const sections = templateSections.sections

      console.log(sections);

      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        throw new Error('페이지 구조를 분석할 수 없습니다.');
      }

      dispatch({ type: 'SET_TEMPLATE_STRUCTURE', payload: sections });
      showSuccess('섹션 구성 완료', `${sections.length}개의 섹션으로 구성을 만들었습니다.`);

    } catch (error: any) {
      console.error('Template generation error:', error);
      showError('섹션 구성 실패', error.message || '섹션 구성 생성 중 오류가 발생했습니다.');
    } finally {
      dispatch({ type: 'SET_ANALYZING', payload: false });
    }
  };

  const handleIdeaChange = (sectionId: string, idea: string) => {
    dispatch({ type: 'SET_STRUCTURED_IDEA', payload: { sectionId, idea } });
  };

  const handleTitleChange = (sectionId: string, newTitle: string) => {
    dispatch({ type: 'SET_TEMPLATE_TITLE', payload: { sectionId, newTitle } });
  };

  const addSection = (parentId?: string) => {
    const newTitle = parentId ? '새 하위 섹션' : '새 섹션';
    console.log('🔥 Adding section:', { parentId, title: newTitle });
    console.log('🔥 Current template structure before:', state.templateStructure);
    dispatch({ type: 'ADD_TEMPLATE_SECTION', payload: { parentId, title: newTitle } });
  };

  const removeSection = (sectionId: string) => {
    dispatch({ type: 'REMOVE_TEMPLATE_SECTION', payload: sectionId });
  };

  // 섹션 구조를 평탄화하여 렌더링하는 함수 (ID 기반)
  const flattenSections = (sections: TemplateSection[], level = 0, parentId?: string): Array<{ section: TemplateSection; level: number; id: string; parentId?: string }> => {
    const result: Array<{ section: TemplateSection; level: number; id: string; parentId?: string }> = [];
    
    sections.forEach((section) => {
      const sectionId = section.id!; // 이제 고유 ID 사용
      result.push({ section, level, id: sectionId, parentId });
      
      if (section.children && section.children.length > 0) {
        result.push(...flattenSections(section.children, level + 1, sectionId));
      }
    });
    
    return result;
  };

  const handleGenerateArticle = async () => {
    const isTemplateMode = state.templateStructure && Object.values(state.structuredIdeas).some(idea => idea.trim() !== '');

    if (isTemplateMode) {
      if (!Object.values(state.structuredIdeas).some(idea => idea.trim() !== '')) {
        showError('입력 오류', '섹션의 아이디어를 하나 이상 입력해주세요.');
        return;
      }
    } else {
      if (!state.topic || !state.keyInsight) {
        dispatch({ type: 'SET_GENERATION_ERROR', payload: '주제와 키메시지를 입력해주세요.' });
        showError('입력 오류', '주제와 키메시지를 모두 입력해주세요.');
        return;
      }
    }

    if (state.isGenerating) return;

    try {
      dispatch({ type: 'SET_GENERATING', payload: true });
      dispatch({ type: 'SET_GENERATION_ERROR', payload: null });
      dispatch({ type: 'SET_GENERATION_STATUS', payload: 'idle' });

      // TODO: Update GenerateArticleDto to include template structure and ideas
      const generateData: GenerateArticleDto = {
        topic: isTemplateMode ? (state.templateStructure?.[0]?.title || '섹션 기반 아티클') : state.topic,
        keyInsight: isTemplateMode ? JSON.stringify(state.structuredIdeas) : state.keyInsight,
        scrapWithOptionalComment: state.selectedScraps.map(scrap => ({
          scrapId: scrap.scrapId,
          userComment: scrap.opinion || undefined,
        })),
        generationParams: state.handle || undefined,
      };

      articleService.generateArticle(generateData)
        .then(result => {
          showSuccess('초안 생성 완료', '보관함에서 생성된 초안을 확인해 보세요!');
          if (currentPage === 'archive' && onRefreshArchiveList) {
            onRefreshArchiveList();
          }
        })
        .catch(error => {
          showError('초안 생성 실패', error.message || '초안 생성 중 오류가 발생했습니다.');
        });

      dispatch({ type: 'SET_GENERATION_STATUS', payload: 'success' });
      showInfo('초안 생성 요청 전송', '초안 생성 요청을 보냈습니다. (예상 대기 시간: 2분)');
      
      setTimeout(() => {
        dispatch({ type: 'SET_GENERATION_STATUS', payload: 'idle' });
      }, 2000);

      dispatch({ type: 'SET_SUBJECT', payload: '' });
      dispatch({ type: 'SET_MESSAGE', payload: '' });
      dispatch({ type: 'SET_HANDLE', payload: '' });
      dispatch({ type: 'CLEAR_SCRAPS' });
      dispatch({ type: 'CLEAR_TEMPLATE' });
      
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear saved draft state:', error);
      }

    } catch (error: any) {
      dispatch({ type: 'SET_GENERATION_ERROR', payload: error.message || '초안 생성에 실패했습니다.' });
      dispatch({ type: 'SET_GENERATION_STATUS', payload: 'error' });
      showError('요청 전송 실패', error.message || '요청을 보내는 중 오류가 발생했습니다.');
      
      setTimeout(() => {
        dispatch({ type: 'SET_GENERATION_STATUS', payload: 'idle' });
      }, 3000);
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

  const filteredScraps = useMemo(() => {
    if (state.selectedTags.length === 0) {
      return allScraps;
    }
    
    return allScraps.filter(scrap => {
      return state.selectedTags.some(selectedTag => 
        scrap.tags?.some(tag => tag.name === selectedTag)
      );
    });
  }, [allScraps, state.selectedTags]);

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
      return dateString;
    }
  };

  return (
    <div className={styles.pageContainer}>
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

          {/* 섹션 구성 */}
          <div className={styles.referenceSection}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 className={styles.sectionTitle}>섹션 구성</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => addSection()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <IoAdd size={14} />
                  섹션 추가
                </button>
                
                <button 
                  onClick={handleGenerateTemplateFromPage}
                  disabled={state.isAnalyzing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: state.isAnalyzing ? '#f1f5f9' : 'white',
                    color: state.isAnalyzing ? '#64748b' : '#374151',
                    cursor: state.isAnalyzing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!state.isAnalyzing) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!state.isAnalyzing) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                  title="현재 페이지를 분석하여 자동으로 섹션 구성을 생성합니다"
                >
                  <IoSparkles size={14} />
                  {state.isAnalyzing ? '분석 중...' : 'AI 분석'}
                </button>
              </div>
            </div>
            
            {!state.templateStructure && (
              <div style={{
                padding: '24px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '2px dashed #cbd5e1',
                textAlign: 'center',
                color: '#64748b',
                marginBottom: '20px'
              }}>
                <IoSparkles size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '500' }}>
                  섹션별로 구성해서 더 체계적인 글을 써보세요
                </p>
                <p style={{ margin: '0', fontSize: '13px', opacity: 0.8 }}>
                  "섹션 추가" 또는 "AI 분석"으로 시작해보세요
                </p>
              </div>
            )}

            {/* 섹션 구성 표시 */}
            {state.templateStructure && (
              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                backgroundColor: '#f8fafc', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '20px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h4 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#1e293b',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <IoSparkles size={18} style={{ color: '#3b82f6' }} />
                      섹션 구성
                    </h4>
                    <span style={{
                      fontSize: '12px',
                      color: '#10b981',
                      backgroundColor: '#d1fae5',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '500'
                    }}>
                      자동 저장됨
                    </span>
                  </div>
                  <button 
                    onClick={() => dispatch({ type: 'CLEAR_TEMPLATE' })}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e2e8f0';
                      e.currentTarget.style.color = '#475569';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }}
                  >
                    × 초기화
                  </button>
                </div>
                {flattenSections(state.templateStructure).map(({ section, level, id, parentId }) => {
                  // 제목이 한 번이라도 편집되었다면 templateTitles의 값을 사용 (빈 문자열 포함)
                  const hasBeenEdited = section.id! in state.templateTitles;
                  const currentTitle = hasBeenEdited ? state.templateTitles[section.id!] : section.title;
                  const isChild = level > 0;
                  
                  return (
                    <div key={id} style={{
                      marginBottom: '16px',
                      marginLeft: isChild ? '24px' : '0',
                      padding: '16px',
                      backgroundColor: isChild ? '#f8fafc' : 'white',
                      borderRadius: '8px',
                      border: `1px solid ${isChild ? '#cbd5e1' : '#e2e8f0'}`,
                      borderLeft: isChild ? '4px solid #3b82f6' : '1px solid #e2e8f0'
                    }}>
                      {/* 섹션 헤더 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={currentTitle || ''} // 빈 문자열도 허용
                            onChange={(e) => {
                              handleTitleChange(section.id!, e.target.value);
                            }}
                            style={{
                              width: '100%',
                              fontSize: isChild ? '14px' : '15px',
                              fontWeight: isChild ? '400' : '500',
                              color: '#1e293b',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              backgroundColor: isChild ? 'white' : '#f8fafc',
                              transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                              e.target.style.backgroundColor = 'white';
                              e.target.style.borderColor = '#3b82f6';
                              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.backgroundColor = isChild ? 'white' : '#f8fafc';
                              e.target.style.borderColor = '#e2e8f0';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                        
                        {/* 액션 버튼들 */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {!isChild && (
                            <button
                              onClick={() => addSection(id)}
                              title="하위 섹션 추가"
                              style={{
                                padding: '6px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#bae6fd';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#e0f2fe';
                              }}
                            >
                              <IoAdd size={14} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => removeSection(id)}
                            title="섹션 삭제"
                            style={{
                              padding: '6px',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fecaca';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                            }}
                          >
                            <IoTrash size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* 아이디어 입력 필드 */}
                      <textarea
                        value={state.structuredIdeas[section.id!] || ''}
                        onChange={(e) => handleIdeaChange(section.id!, e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '12px',
                          backgroundColor: 'white',
                          resize: 'vertical',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  );
                })}
                
                {/* 새 섹션 추가 버튼 */}
                <button
                  onClick={() => addSection()}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    marginTop: '16px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.color = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <IoAdd size={16} />
                  섹션 추가
                </button>
              </div>
            )}
          </div>

          {/* 참고 자료 */}
          <div className={styles.referenceSection}>
            <h3 className={styles.sectionTitle}>참고 자료</h3>
            <button 
              className={styles.addReferenceButton}
              onClick={() => dispatch({ type: 'TOGGLE_SCRAP_MODAL' })}
              style={{ width: '100%', marginBottom: '16px' }}
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

          <div className={styles.addButtonContainer}>
            <button 
              className={`${styles.addButton} ${state.isGenerating ? styles.loading : ''}`}
              onClick={handleGenerateArticle}
              disabled={state.isGenerating || (!state.topic && !state.templateStructure)}
            >
              {state.generationStatus === 'success' ? (
                <>
                  <IoCheckmark size={20} />
                  생성 요청 완료
                </>
              ) : state.generationStatus === 'error' ? (
                <>
                  <IoClose size={20} />
                  실패
                </>
              ) : (
                <>
                  <IoSparkles size={20} />
                  초안 생성하기
                </>
              )}
            </button>
          </div>
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
    </div>
  );
};

export default ArticleGeneratePage;