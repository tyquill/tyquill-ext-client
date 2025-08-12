import React, { useEffect, useReducer, useState, useMemo, useRef } from 'react';
import { IoAdd, IoClose, IoSparkles, IoCheckmark, IoTrash, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { RiAiGenerate } from 'react-icons/ri';
import { TbListDetails } from "react-icons/tb";
import styles from './PageStyles.module.css';
import articleStyles from './ArticleGeneratePage.module.css';
import { Scrap, mockTemplates } from '../../mock/data';
import { TagSelector } from '../../components/sidepanel/TagSelector/TagSelector';
import { TagList } from '../../components/sidepanel/TagList/TagList';
import { useToastHelpers } from '../../hooks/useToast';
import { ScrapResponse, scrapService } from '../../services/scrapService';
import { articleService, GenerateArticleDto, ScrapWithOptionalComment, TemplateSection } from '../../services/articleService';
import DiscoBallScene from '../../components/sidepanel/DiscoBallScene/DiscoBallScene';
import { FaWandMagicSparkles } from "react-icons/fa6";
import { writingStyleService, WritingStyle } from '../../services/writingStyleService';
import { PageType } from '../../types/pages';
import Tooltip from '../../components/common/Tooltip';
import tagSelectorStyles from '../../components/sidepanel/TagSelector/TagSelector.module.css';
import ProgressBar from '../../components/sidepanel/ProgressBar/ProgressBar';

interface ArticleGeneratePageProps {
  onNavigateToDetail: (articleId: number) => void;
  onNavigate: (page: PageType) => void;
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
  sectionIdCounter: number;
  isAnalyzing: boolean;
  isAnalysisConfirmModalOpen: boolean;
  selectedWritingStyleId: number | null; // writingStyleUrl -> selectedWritingStyleId
  isAnalyzingStyle: boolean;
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
  | { type: 'CLEAR_TEMPLATE' }
  | { type: 'TOGGLE_ANALYSIS_CONFIRM_MODAL' }
  | { type: 'SET_WRITING_STYLE_ID'; payload: number | null } // SET_WRITING_STYLE_URL -> SET_WRITING_STYLE_ID
  | { type: 'SET_ANALYZING_STYLE'; payload: boolean };

const STORAGE_KEY = 'tyquill-article-generate-draft';
const DEFAULT_MODAL_TOP_OFFSET = 160;

const getInitialState = (): ArticleGenerateState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    // console.log('🔍 Loading saved state:', saved);
    if (saved) {
      const parsedState = JSON.parse(saved);
      // console.log('🔍 Parsed state:', parsedState);
      // console.log('🔍 Template structure from storage:', parsedState.templateStructure);
      
      const restoredState = {
        ...parsedState,
        isScrapModalOpen: false,
        isTagDropdownOpen: false,
        isGenerating: false,
        generationError: null,
        generationStatus: 'idle',
        templateStructure: parsedState.templateStructure || null, // 템플릿 구조도 복원
        sectionIdCounter: parsedState.sectionIdCounter || 0,
        isAnalyzing: false,
        isAnalysisConfirmModalOpen: false,
        selectedWritingStyleId: parsedState.selectedWritingStyleId || null, // writingStyleUrl -> selectedWritingStyleId
        isAnalyzingStyle: false,
      };
      
      // console.log('✅ Restored state with template:', restoredState.templateStructure);
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
    sectionIdCounter: 0,
    isAnalyzing: false,
    isAnalysisConfirmModalOpen: false,
    selectedWritingStyleId: null,
    isAnalyzingStyle: false,
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
    case 'SET_TEMPLATE_STRUCTURE': {
      let counter = state.sectionIdCounter;
      const assignIds = (sections: TemplateSection[]): TemplateSection[] => {
        return sections.map(section => {
          const sectionId = section.id || `section_${counter++}`;
          return {
            ...section,
            id: sectionId,
            children: section.children ? assignIds(section.children) : [],
          };
        });
      };
      const sectionsWithIds = action.payload ? assignIds(action.payload) : null;
      return {
        ...state,
        templateStructure: sectionsWithIds,
        sectionIdCounter: counter,
      };
    }
    case 'SET_STRUCTURED_IDEA': {
      if (!state.templateStructure) return state;
      const updateKeyIdea = (sections: TemplateSection[]): TemplateSection[] =>
        sections.map(section =>
          section.id === action.payload.sectionId
            ? { ...section, keyIdea: action.payload.idea }
            : { ...section, children: section.children ? updateKeyIdea(section.children) : [] }
        );
      return {
        ...state,
        templateStructure: state.templateStructure ? updateKeyIdea(state.templateStructure) : null,
      };
    }
    case 'SET_TEMPLATE_TITLE': {
      if (!state.templateStructure) return state;
      const updateTitle = (sections: TemplateSection[]): TemplateSection[] =>
        sections.map(section =>
          section.id === action.payload.sectionId
            ? { ...section, title: action.payload.newTitle }
            : { ...section, children: section.children ? updateTitle(section.children) : [] }
        );
      return {
        ...state,
        templateStructure: state.templateStructure ? updateTitle(state.templateStructure) : null,
      };
    }
    case 'ADD_TEMPLATE_SECTION': {
      const newSectionId = `section_${state.sectionIdCounter}`;
      const newSection: TemplateSection = {
        title: action.payload.title,
        keyIdea: '',
        children: [],
        id: newSectionId,
      };
      if (!action.payload.parentId) {
        return {
          ...state,
          templateStructure: state.templateStructure ? [...state.templateStructure, newSection] : [newSection],
          sectionIdCounter: state.sectionIdCounter + 1,
        };
      } else {
        if (!state.templateStructure) return state;
        const addChildToSection = (sections: TemplateSection[]): TemplateSection[] =>
          sections.map(section =>
            section.id === action.payload.parentId
              ? { ...section, children: [...(section.children || []), newSection] }
              : { ...section, children: section.children ? addChildToSection(section.children) : [] }
          );
        return {
          ...state,
          templateStructure: addChildToSection(state.templateStructure),
          sectionIdCounter: state.sectionIdCounter + 1,
        };
      }
    }
    case 'REMOVE_TEMPLATE_SECTION': {
      if (!state.templateStructure) return state;
      const removeSectionById = (sections: TemplateSection[], targetId: string): TemplateSection[] =>
        sections.filter(section => {
          if (section.id === targetId) return false;
          if (section.children && section.children.length > 0) {
            section.children = removeSectionById(section.children, targetId);
          }
          return true;
        });
      return {
        ...state,
        templateStructure: removeSectionById(state.templateStructure, action.payload),
      };
    }
    case 'CLEAR_TEMPLATE':
      return { ...state, templateStructure: null };
    case 'TOGGLE_ANALYSIS_CONFIRM_MODAL':
      return { ...state, isAnalysisConfirmModalOpen: !state.isAnalysisConfirmModalOpen };
    case 'SET_WRITING_STYLE_ID':
      return { ...state, selectedWritingStyleId: action.payload };
    case 'SET_ANALYZING_STYLE':
      return { ...state, isAnalyzingStyle: action.payload };
    default:
      return state;
  }
}

const ArticleGeneratePage: React.FC<ArticleGeneratePageProps> = ({ 
  onNavigateToDetail, 
  onNavigate,
  currentPage,
  onRefreshArchiveList 
}) => {
  const { showSuccess, showError, showInfo } = useToastHelpers();
  const [state, dispatch] = useReducer(draftReducer, getInitialState());
  const [writingStyles, setWritingStyles] = useState<WritingStyle[]>([]);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [scrapModalTop, setScrapModalTop] = useState<number>(DEFAULT_MODAL_TOP_OFFSET);
  const SIDE_RAIL_WIDTH = 60; // Header에 추가된 사이드바 최소 폭과 동일하게 유지

  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false);
  const styleDropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const styles = await writingStyleService.getWritingStyles();
        setWritingStyles(styles);
      } catch (error) {
        console.error('Failed to fetch writing styles:', error);
        showError('저장된 문체 목록을 불러오는데 실패했습니다.');
      }
    };
    fetchStyles();
  }, []);

  // 디버깅: 템플릿 구조 상태 변화 추적
  useEffect(() => {
    // console.log('📊 Current template structure:', state.templateStructure);
  }, [state.templateStructure]);
  const [showAllTags, setShowAllTags] = useState<string | null>(null);
  const styleDropdownRef = useRef<HTMLDivElement | null>(null);

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
      sectionIdCounter: state.sectionIdCounter,
      selectedWritingStyleId: state.selectedWritingStyleId,
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
    state.sectionIdCounter,
    state.selectedWritingStyleId
  ]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // 모달 바깥 클릭 처리
      if (state.isScrapModalOpen) {
        const modalOverlay = document.querySelector(`.${articleStyles.modalOverlay}`);
        const scrapModal = document.querySelector(`.${articleStyles.scrapModal}`);
        
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

  // 문체 선택 드롭다운 바깥 클릭/ESC 시 닫기 (ScrapPage TagSelector 패턴 참고)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        styleDropdownButtonRef.current &&
        !styleDropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsStyleDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsStyleDropdownOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
   
  // 스크랩 모달을 헤더 하단에 정확히 맞추기 위한 동적 top 계산
  useEffect(() => {
    if (!state.isScrapModalOpen) return;

    const updateTopOffset = () => {
      try {
        const headerElement = headerRef.current;
        if (headerElement) {
          const rect = headerElement.getBoundingClientRect();
          // 헤더의 화면 기준 하단 좌표를 사용하여 오버레이 top 설정
          setScrapModalTop(Math.max(0, Math.round(rect.bottom)));
          return;
        }
      } catch (error) {
        console.error('Failed to update scrap modal top offset:', error);
      }
      setScrapModalTop(DEFAULT_MODAL_TOP_OFFSET);
    };

    updateTopOffset();
    window.addEventListener('resize', updateTopOffset);
    return () => window.removeEventListener('resize', updateTopOffset);
  }, [state.isScrapModalOpen]);

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
          files: ['content/index.js']
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

      // console.log(sections);

      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        throw new Error('페이지 구조를 분석할 수 없습니다.');
      }

      dispatch({ type: 'SET_TEMPLATE_STRUCTURE', payload: sections });
      showSuccess('AI 분석 완료', `${sections.length}개의 섹션으로 구성을 만들었습니다.`);

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
    // console.log('🔥 Adding section:', { parentId, title: newTitle });
    // console.log('🔥 Current template structure before:', state.templateStructure);
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
    // state.structuredIdeas가 존재하는지 확인하고, 객체 타입임을 보장
    const structuredIdeas = (state as any).structuredIdeas || {};
    const isTemplateMode = state.templateStructure && Object.values(structuredIdeas).some((idea: any) => typeof idea === 'string' && idea.trim() !== '');

    if (isTemplateMode) {
      if (!Object.values(structuredIdeas).some((idea: any) => typeof idea === 'string' && idea.trim() !== '')) {
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

    // Helper function to recursively remove 'id' from template sections
    const removeIdsFromTemplate = (sections: TemplateSection[]): any => {
      return sections.map(({ id, children, ...rest }) => {
        const newSection: Partial<TemplateSection> = { ...rest };
        if (children && children.length > 0) {
          newSection.children = removeIdsFromTemplate(children);
        }
        return newSection;
      });
    };

    try {
      dispatch({ type: 'SET_GENERATING', payload: true });
      dispatch({ type: 'SET_GENERATION_ERROR', payload: null });
      dispatch({ type: 'SET_GENERATION_STATUS', payload: 'idle' });

      const templateWithoutIds = state.templateStructure ? removeIdsFromTemplate(state.templateStructure) : [];

      // TODO: Update GenerateArticleDto to include template structure and ideas
      const generateData: GenerateArticleDto = {
        topic: isTemplateMode ? (state.templateStructure?.[0]?.title || '섹션 기반 아티클') : state.topic,
        keyInsight: isTemplateMode ? JSON.stringify((state as any).structuredIdeas) : state.keyInsight,
        scrapWithOptionalComment: state.selectedScraps.map(scrap => ({
          scrapId: scrap.scrapId,
          userComment: scrap.opinion || undefined,
        })),
        generationParams: state.handle || undefined,
        articleStructureTemplate: templateWithoutIds,
        writingStyleId: state.selectedWritingStyleId ?? undefined,
      };

      const startedAt = Date.now();
      let wasSuccess = false;
      try {
        const result = await articleService.generateArticle(generateData);
        dispatch({ type: 'SET_GENERATION_STATUS', payload: 'success' });
        showSuccess('초안 생성 완료', '보관함에서 생성된 초안을 확인해 보세요!');
        if (currentPage === 'archive' && onRefreshArchiveList) {
          onRefreshArchiveList();
        }
        wasSuccess = true;
      } catch (error: any) {
        dispatch({ type: 'SET_GENERATION_STATUS', payload: 'error' });
        showError('초안 생성 실패', error.message || '초안 생성 중 오류가 발생했습니다.');
      } finally {
        const elapsedMs = Date.now() - startedAt;
        const minDisplayMs = 800;
        if (elapsedMs < minDisplayMs) {
          await new Promise(resolve => setTimeout(resolve, minDisplayMs - elapsedMs));
        }
        // 성공 시에는 모달 유지 (사용자가 버튼으로 이동/닫기 선택)
        if (!wasSuccess) {
          setTimeout(() => {
            dispatch({ type: 'SET_GENERATION_STATUS', payload: 'idle' });
            dispatch({ type: 'SET_GENERATING', payload: false });
          }, 2000);
        }
      }

      dispatch({ type: 'SET_SUBJECT', payload: '' });
      dispatch({ type: 'SET_MESSAGE', payload: '' });
      dispatch({ type: 'SET_HANDLE', payload: '' });
      dispatch({ type: 'SET_WRITING_STYLE_ID', payload: null });
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
      // 성공인 경우에는 모달을 유지하므로 여기서 닫지 않음
      // 실패/오류 케이스는 위 finally 블록에서 처리
    }
  };

  const [allScraps, setAllScraps] = useState<ScrapResponse[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  // 키메시지 textarea 자동 높이 조정
  useEffect(() => {
    const textarea = document.getElementById('message') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [state.keyInsight]);

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

  // 예상 시간 계산 함수
  const calculateEstimatedTime = () => {
    let estimatedTime = 94; // 기본 94초
    
    // 스크랩 활용: 기본 23초 + 개당 3초 추가 (26 + (n-1)*2)
    if (state.selectedScraps.length > 0) {
      estimatedTime += 26 + (state.selectedScraps.length - 1) * 2;
    }
    
    // 커스텀 문체 활용: +32초
    if (state.selectedWritingStyleId !== null) {
      estimatedTime += 32;
    }
    
    // 섹션 구성 활용: +25초
    if (state.templateStructure !== null) {
      estimatedTime += 25;
    }
    
    return estimatedTime;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.page}>
        <div className={styles.pageHeader} ref={headerRef}>
          <div className={styles.headerControls}>
            <h1 className={styles.pageTitle}>뉴스레터 초안 생성</h1>
          </div>
        </div>
        
        <div className={articleStyles.scrollableContent}>
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
              className={articleStyles.keyMessageTextarea}
              value={state.keyInsight}
              onChange={(e) => {
                dispatch({ type: 'SET_MESSAGE', payload: e.target.value });
                // 자동 높이 조정
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onInput={(e) => {
                // 입력 시에도 높이 조정
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              placeholder="독자들에게 전달하고 싶은 핵심 메시지를 작성하세요. (예: 이제는 AI 뉴스레터 도구를 이용해, 뉴스레터 작가는 좋은 컨텐츠를 기획하고 소통하는 활동에 더욱 집중할 수 있다.)"
              rows={1}
            />
          </div>

          {/* 섹션 구성 */}
          <div className={styles.referenceSection}>
            <div className={articleStyles.sectionHeader}>
              <h3 className={styles.sectionTitle}>섹션 구성</h3>
              <div className={articleStyles.sectionActions}>
                <button 
                  onClick={() => addSection()}
                  className={articleStyles.sectionButton}
                >
                  <IoAdd size={14} />
                  섹션 추가
                </button>
                
                  <button 
                  onClick={() => dispatch({ type: 'TOGGLE_ANALYSIS_CONFIRM_MODAL' })}
                  disabled={state.isAnalyzing}
                  className={`${articleStyles.sectionButton} ${state.isAnalyzing ? articleStyles.sectionButtonDisabled : ''}`}
                >
                  <FaWandMagicSparkles size={14} />
                  {state.isAnalyzing ? '분석 중...' : '현재 페이지 섹션 분석'}
                </button>
              </div>
            </div>
            
            {!state.templateStructure && (
              <div className={articleStyles.emptyState}>
                <RiAiGenerate size={24} className={articleStyles.emptyStateIcon} />
                <p className={articleStyles.emptyStateTitle}>
                  섹션별로 구성해서 더 체계적인 글을 써 보세요.
                </p>
                <p className={articleStyles.emptyStateSubtitle}>
                  "섹션 추가" 또는 "현재 페이지 분석"으로 시작해 보세요
                </p>
              </div>
            )}

            {/* 섹션 구성 표시 */}
            {state.templateStructure && (
              <div className={articleStyles.sectionContainer}>
                <div className={articleStyles.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h4 className={articleStyles.sectionTitle}>
                      <TbListDetails size={18} className={articleStyles.sectionTitleIcon} />
                      섹션 구성
                    </h4>
                    <span className={articleStyles.sectionStatus}>
                      자동 저장됨
                    </span>
                  </div>
                  <button 
                    onClick={() => dispatch({ type: 'CLEAR_TEMPLATE' })}
                    className={articleStyles.clearButton}
                  >
                    × 초기화
                  </button>
                </div>
                {flattenSections(state.templateStructure).map(({ section, level, id, parentId }) => {
                  const isChild = level > 0;
                  return (
                    <div key={id} className={`${articleStyles.sectionItem} ${isChild ? articleStyles.sectionItemChild : ''}`}>
                      {/* 섹션 헤더 */}
                      <div className={articleStyles.sectionItemHeader}>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={section.title || ''}
                            onChange={(e) => {
                              handleTitleChange(section.id!, e.target.value);
                            }}
                            className={`${articleStyles.sectionInput} ${isChild ? articleStyles.sectionInputChild : ''}`}
                          />
                        </div>
                        
                        {/* 액션 버튼들 */}
                        <div className={articleStyles.sectionActions}>
                          {!isChild && (
                            <Tooltip content="하위 섹션 추가">
                              <div
                                onClick={() => addSection(id)}
                                className={articleStyles.addChildButton}
                              >
                                <IoAdd size={15} />
                              </div>
                            </Tooltip>
                          )}
                          
                          <Tooltip content="섹션 삭제">
                            <div
                              onClick={() => removeSection(id)}
                              className={articleStyles.removeButton}
                            >
                              <IoTrash size={15} />
                            </div>
                          </Tooltip>
                        </div>
                      </div>
                      
                      {/* 아이디어 입력 필드 */}
                      <textarea
                        value={section.keyIdea || ''}
                        onChange={(e) => handleIdeaChange(section.id!, e.target.value)}
                        rows={3}
                        className={articleStyles.ideaTextarea}
                      />
                    </div>
                  );
                })}
                
                {/* 새 섹션 추가 버튼 */}
                <button
                  onClick={() => addSection()}
                  className={articleStyles.addSectionButton}
                >
                  <IoAdd size={16} />
                  섹션 추가
                </button>
              </div>
            )}
          </div>

          {/* 문체 선택 섹션 */}
          <div className={articleStyles.referenceSection}>
            <h3 className={articleStyles.referenceSectionTitle}>문체 선택</h3>
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className={tagSelectorStyles.tagFilterContainer} style={{ marginRight: 0, flexGrow: 1 }}>
                  <button
                    ref={styleDropdownButtonRef}
                    className={tagSelectorStyles.tagFilterButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsStyleDropdownOpen((prev) => !prev);
                    }}
                  >
                    {state.selectedWritingStyleId
                      ? (writingStyles.find((ws) => ws.id === state.selectedWritingStyleId)?.name || '문체 선택')
                      : '기본 뉴스레터 문체'}
                    {isStyleDropdownOpen ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}
                  </button>
                  <div className={`${tagSelectorStyles.tagFilterDropdown} ${isStyleDropdownOpen ? tagSelectorStyles.visible : ''}`}>
                    <div
                      className={`${tagSelectorStyles.tagOption} ${state.selectedWritingStyleId ? '' : tagSelectorStyles.selected}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'SET_WRITING_STYLE_ID', payload: null });
                        setIsStyleDropdownOpen(false);
                      }}
                    >
                      기본 뉴스레터 문체
                    </div>
                    {writingStyles.map((ws) => (
                      <div
                        key={ws.id}
                        className={`${tagSelectorStyles.tagOption} ${state.selectedWritingStyleId === ws.id ? tagSelectorStyles.selected : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'SET_WRITING_STYLE_ID', payload: ws.id });
                          setIsStyleDropdownOpen(false);
                        }}
                      >
                        {ws.name}
                      </div>
                    ))}
                  </div>
                </div>
                <Tooltip content="문체 관리 페이지로 이동">
                  <button
                    onClick={() => onNavigate('style-management')}
                    className={articleStyles.sectionButton}
                    style={{ flexShrink: 0 }}
                  >
                    <IoAdd size={16} />
                    새로운 문체
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* 참고 자료 */}
          <div className={articleStyles.referenceSection}>
            <h3 className={articleStyles.referenceSectionTitle}>참고 자료</h3>
            <button 
              className={articleStyles.addReferenceButton}
              onClick={() => dispatch({ type: 'TOGGLE_SCRAP_MODAL' })}
            >
              <IoAdd size={16} />
              스크랩에서 자료 추가
            </button>
            
            <div className={articleStyles.referenceList}>
              {state.selectedScraps.map(scrap => (
                <div key={scrap.scrapId} className={articleStyles.referenceItem}>
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
                    className={articleStyles.referenceRemoveButton}
                    onClick={() => handleRemoveScrap(scrap.scrapId)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {state.generationError && (
            <div className={articleStyles.errorMessage}>
              {state.generationError}
            </div>
          )}
          </div>
          <div className={articleStyles.fixedButtonContainer}>
          <button 
            className={`${articleStyles.addButton} ${state.isGenerating ? articleStyles.loading : ''}`}
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

        {/* AI 분석 컨펌 모달 */}
        {state.isAnalysisConfirmModalOpen && (
          <div 
            className={articleStyles.analysisModalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                dispatch({ type: 'TOGGLE_ANALYSIS_CONFIRM_MODAL' });
              }
            }}
          >
            <div className={articleStyles.analysisModal}>
              <div className={articleStyles.modalHeader}>
                <h2 className={articleStyles.modalTitle}>AI 페이지 분석</h2>
                <button 
                  className={articleStyles.modalCloseButton}
                  onClick={() => dispatch({ type: 'TOGGLE_ANALYSIS_CONFIRM_MODAL' })}
                >
                  <IoClose />
                </button>
              </div>
              
              <div className={articleStyles.analysisModalContent}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <DiscoBallScene />
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>
                    현재 페이지를 분석하여 섹션을 자동 생성합니다
                  </h3>
                  <p style={{ margin: '0 0 20px 0', color: '#666', lineHeight: '1.6', fontSize: '16px' }}>
                    AI가 현재 페이지의 내용을 분석하여 적절한 섹션 구성을 제안합니다.<br />
                    분석에는 약 10~30초 정도 소요됩니다.
                  </p>
                  
                  {/* 기존 섹션이 있을 때 경고 메시지 */}
                  {state.templateStructure && state.templateStructure.length > 0 && (
                    <div style={{ 
                      margin: '0 0 20px 0', 
                      padding: '12px 16px', 
                      backgroundColor: '#fef3c7', 
                      border: '1px solid #f59e0b', 
                      borderRadius: '8px',
                      color: '#92400e',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>
                      ⚠️ <strong>주의:</strong> 기존에 작성한 섹션이 있는 것 같습니다. 
                      <br />
                      AI 분석을 진행하면 현재 섹션 구성은 사라집니다.
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_ANALYSIS_CONFIRM_MODAL' })}
                      style={{
                        padding: '10px 20px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={async () => {
                        dispatch({ type: 'TOGGLE_ANALYSIS_CONFIRM_MODAL' });
                        await handleGenerateTemplateFromPage();
                      }}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#3b82f6',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      분석 시작
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 초안 생성 중 모달 (비활성 오버레이) */}
        {state.isGenerating && (
          <div className={articleStyles.analysisModalOverlay} onClick={(e) => e.stopPropagation()}>
            <div className={articleStyles.analysisModal}>
              <div className={articleStyles.modalHeader}>
                <h2 className={articleStyles.modalTitle}>초안 생성 중</h2>
              </div>
              <div className={articleStyles.analysisModalContent}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <DiscoBallScene />
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
                    {state.generationStatus === 'success' ? '초안 생성이 완료되었습니다!' : '초안 생성 요청을 처리 중입니다'}
                  </h3>
                  <ProgressBar 
                    estimatedTimeSeconds={calculateEstimatedTime()}
                    isCompleted={state.generationStatus === 'success'}
                  />
                </div>
                {state.generationStatus === 'success' && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 12 }}>
                    <button
                      onClick={() => onNavigate('archive')}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#3b82f6',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      보관함으로 이동
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'SET_GENERATING', payload: false })}
                      style={{
                        padding: '10px 20px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      닫기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {state.isScrapModalOpen && (
          <div 
            className={articleStyles.modalOverlay}
            style={{ top: scrapModalTop, right: SIDE_RAIL_WIDTH }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                dispatch({ type: 'TOGGLE_SCRAP_MODAL' });
              }
            }}
          >
            <div
              className={articleStyles.scrapModal}
              style={{ maxHeight: `calc(100vh - ${scrapModalTop + 32}px)` }}
            >
              <div className={articleStyles.modalHeader}>
                <h2 className={articleStyles.modalTitle}>스크랩 선택</h2>
                <button 
                  className={articleStyles.modalCloseButton}
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

              <div
                className={articleStyles.modalContent}
                style={{ maxHeight: `calc(100vh - ${scrapModalTop + 172}px)` }}
              >
                {filteredScraps.map((scrap: ScrapResponse) => (
                  <div
                    key={scrap.scrapId}
                    className={`${articleStyles.scrapItem} ${
                      state.selectedScraps.find(s => s.scrapId === scrap.scrapId) ? articleStyles.selected : ''
                    }`}
                    onClick={() => handleScrapSelect(scrap)}
                    data-url={scrap.url}
                  >
                    <div className={articleStyles.scrapTitle}>{scrap.title}</div>
                    <div className={articleStyles.scrapContent}>{scrap.content.length > 100 ? `${scrap.content.substring(0, 100)}...` : scrap.content}</div>
                    <div className={articleStyles.scrapFooter}>
                      <div className={articleStyles.scrapTags}>
                        <TagList tags={scrap.tags?.map(tag => tag.name) || []} />
                      </div>
                      <div className={articleStyles.scrapDate}>{formatScrapDate(scrap.createdAt)}</div>
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
