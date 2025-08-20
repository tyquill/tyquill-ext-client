import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ScrapResponse } from '../services/scrapService';
import { TemplateSection } from '../services/articleService';

interface SelectedScrap extends ScrapResponse {
  opinion: string;
}

interface ArticleGenerateState {
  // 기본 입력 필드
  topic: string;
  keyInsight: string;
  handle: string;
  selectedTemplate: string;
  
  // 스크랩 관련
  selectedScraps: SelectedScrap[];
  
  // 태그 관련
  selectedTags: string[];
  
  // 모달 상태
  isScrapModalOpen: boolean;
  isTagDropdownOpen: boolean;
  isAnalysisConfirmModalOpen: boolean;
  
  // 생성 상태
  isGenerating: boolean;
  generationError: string | null;
  generationStatus: 'idle' | 'processing' | 'completed' | 'failed';
  
  // 템플릿 구조 관련
  templateStructure: TemplateSection[] | null;
  sectionIdCounter: number;
  isAnalyzing: boolean;
  
  // 문체 선택
  selectedWritingStyleId: number | null;
  isAnalyzingStyle: boolean;
}

interface ArticleGenerateActions {
  // 기본 입력 액션
  setTopic: (topic: string) => void;
  setKeyInsight: (keyInsight: string) => void;
  setHandle: (handle: string) => void;
  setSelectedTemplate: (template: string) => void;
  
  // 스크랩 관련 액션
  addScrap: (scrap: ScrapResponse) => void;
  removeScrap: (scrapId: number) => void;
  updateScrapOpinion: (scrapId: number, opinion: string) => void;
  clearScraps: () => void;
  
  // 태그 관련 액션
  toggleTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  
  // 모달 관련 액션
  toggleScrapModal: () => void;
  toggleTagDropdown: () => void;
  toggleAnalysisConfirmModal: () => void;
  
  // 생성 관련 액션
  setGenerating: (isGenerating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setGenerationStatus: (status: 'idle' | 'processing' | 'completed' | 'failed') => void;
  
  // 템플릿 구조 관련 액션
  setTemplateStructure: (structure: TemplateSection[] | null) => void;
  setStructuredIdea: (sectionId: string, idea: string) => void;
  setTemplateTitle: (sectionId: string, newTitle: string) => void;
  addTemplateSection: (parentId?: string, title?: string) => void;
  removeTemplateSection: (sectionId: string) => void;
  clearTemplate: () => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  
  // 문체 관련 액션
  setWritingStyleId: (styleId: number | null) => void;
  setAnalyzingStyle: (isAnalyzing: boolean) => void;
  
  // 전체 상태 초기화
  resetForm: () => void;
}

type ArticleGenerateStore = ArticleGenerateState & ArticleGenerateActions;

const STORAGE_KEY = 'tyquill-article-generate-draft';

const initialState: ArticleGenerateState = {
  topic: '',
  keyInsight: '',
  handle: '',
  selectedTemplate: '비즈니스 미팅 요청',
  selectedScraps: [],
  selectedTags: [],
  isScrapModalOpen: false,
  isTagDropdownOpen: false,
  isAnalysisConfirmModalOpen: false,
  isGenerating: false,
  generationError: null,
  generationStatus: 'idle',
  templateStructure: null,
  sectionIdCounter: 0,
  isAnalyzing: false,
  selectedWritingStyleId: null,
  isAnalyzingStyle: false,
};

// ID 할당 헬퍼 함수
const assignIdsToSections = (sections: TemplateSection[], counter: { value: number }): TemplateSection[] => {
  return sections.map(section => {
    const sectionId = section.id || `section_${counter.value++}`;
    return {
      ...section,
      id: sectionId,
      children: section.children ? assignIdsToSections(section.children, counter) : [],
    };
  });
};

// 섹션 업데이트 헬퍼 함수들
const updateSectionKeyIdea = (sections: TemplateSection[], sectionId: string, idea: string): TemplateSection[] =>
  sections.map(section =>
    section.id === sectionId
      ? { ...section, keyIdea: idea }
      : { ...section, children: section.children ? updateSectionKeyIdea(section.children, sectionId, idea) : [] }
  );

const updateSectionTitle = (sections: TemplateSection[], sectionId: string, newTitle: string): TemplateSection[] =>
  sections.map(section =>
    section.id === sectionId
      ? { ...section, title: newTitle }
      : { ...section, children: section.children ? updateSectionTitle(section.children, sectionId, newTitle) : [] }
  );

const addChildToSection = (sections: TemplateSection[], parentId: string, newSection: TemplateSection): TemplateSection[] =>
  sections.map(section =>
    section.id === parentId
      ? { ...section, children: [...(section.children || []), newSection] }
      : { ...section, children: section.children ? addChildToSection(section.children, parentId, newSection) : [] }
  );

const removeSectionById = (sections: TemplateSection[], targetId: string): TemplateSection[] =>
  sections.filter(section => {
    if (section.id === targetId) return false;
    if (section.children && section.children.length > 0) {
      section.children = removeSectionById(section.children, targetId);
    }
    return true;
  });

export const useArticleGenerateStore = create<ArticleGenerateStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...initialState,

        // 기본 입력 액션
        setTopic: (topic: string) => set((state) => {
          state.topic = topic;
        }),

        setKeyInsight: (keyInsight: string) => set((state) => {
          state.keyInsight = keyInsight;
        }),

        setHandle: (handle: string) => set((state) => {
          state.handle = handle;
        }),

        setSelectedTemplate: (template: string) => set((state) => {
          state.selectedTemplate = template;
        }),

        // 스크랩 관련 액션
        addScrap: (scrap: ScrapResponse) => set((state) => {
          const exists = state.selectedScraps.find(s => s.scrapId === scrap.scrapId);
          if (!exists) {
            state.selectedScraps.push({ ...scrap, opinion: '' });
          }
        }),

        removeScrap: (scrapId: number) => set((state) => {
          state.selectedScraps = state.selectedScraps.filter(scrap => scrap.scrapId !== scrapId);
        }),

        updateScrapOpinion: (scrapId: number, opinion: string) => set((state) => {
          const scrap = state.selectedScraps.find(s => s.scrapId === scrapId);
          if (scrap) {
            scrap.opinion = opinion;
          }
        }),

        clearScraps: () => set((state) => {
          state.selectedScraps = [];
        }),

        // 태그 관련 액션
        toggleTag: (tag: string) => set((state) => {
          const index = state.selectedTags.indexOf(tag);
          if (index === -1) {
            state.selectedTags.push(tag);
          } else {
            state.selectedTags.splice(index, 1);
          }
        }),

        removeTag: (tag: string) => set((state) => {
          state.selectedTags = state.selectedTags.filter(t => t !== tag);
        }),

        // 모달 관련 액션
        toggleScrapModal: () => set((state) => {
          state.isScrapModalOpen = !state.isScrapModalOpen;
        }),

        toggleTagDropdown: () => set((state) => {
          state.isTagDropdownOpen = !state.isTagDropdownOpen;
        }),

        toggleAnalysisConfirmModal: () => set((state) => {
          state.isAnalysisConfirmModalOpen = !state.isAnalysisConfirmModalOpen;
        }),

        // 생성 관련 액션
        setGenerating: (isGenerating: boolean) => set((state) => {
          state.isGenerating = isGenerating;
        }),

        setGenerationError: (error: string | null) => set((state) => {
          state.generationError = error;
        }),

        setGenerationStatus: (status: 'idle' | 'processing' | 'completed' | 'failed') => set((state) => {
          state.generationStatus = status;
        }),

        // 템플릿 구조 관련 액션
        setTemplateStructure: (structure: TemplateSection[] | null) => set((state) => {
          if (structure) {
            const counter = { value: state.sectionIdCounter };
            const sectionsWithIds = assignIdsToSections(structure, counter);
            state.templateStructure = sectionsWithIds;
            state.sectionIdCounter = counter.value;
          } else {
            state.templateStructure = null;
          }
        }),

        setStructuredIdea: (sectionId: string, idea: string) => set((state) => {
          if (state.templateStructure) {
            state.templateStructure = updateSectionKeyIdea(state.templateStructure, sectionId, idea);
          }
        }),

        setTemplateTitle: (sectionId: string, newTitle: string) => set((state) => {
          if (state.templateStructure) {
            state.templateStructure = updateSectionTitle(state.templateStructure, sectionId, newTitle);
          }
        }),

        addTemplateSection: (parentId?: string, title = '새 섹션') => set((state) => {
          const newSectionId = `section_${state.sectionIdCounter}`;
          const newSection: TemplateSection = {
            title: parentId ? '새 하위 섹션' : title,
            keyIdea: '',
            children: [],
            id: newSectionId,
          };

          if (!parentId) {
            if (state.templateStructure) {
              state.templateStructure.push(newSection);
            } else {
              state.templateStructure = [newSection];
            }
          } else {
            if (state.templateStructure) {
              state.templateStructure = addChildToSection(state.templateStructure, parentId, newSection);
            }
          }
          
          state.sectionIdCounter++;
        }),

        removeTemplateSection: (sectionId: string) => set((state) => {
          if (state.templateStructure) {
            state.templateStructure = removeSectionById(state.templateStructure, sectionId);
          }
        }),

        clearTemplate: () => set((state) => {
          state.templateStructure = null;
        }),

        setAnalyzing: (isAnalyzing: boolean) => set((state) => {
          state.isAnalyzing = isAnalyzing;
        }),

        // 문체 관련 액션
        setWritingStyleId: (styleId: number | null) => set((state) => {
          state.selectedWritingStyleId = styleId;
        }),

        setAnalyzingStyle: (isAnalyzing: boolean) => set((state) => {
          state.isAnalyzingStyle = isAnalyzing;
        }),

        // 전체 상태 초기화
        resetForm: () => set((state) => {
          Object.assign(state, {
            ...initialState,
            // 모달 상태는 유지
            isScrapModalOpen: false,
            isTagDropdownOpen: false,
            isAnalysisConfirmModalOpen: false,
            isGenerating: false,
            generationError: null,
            generationStatus: 'idle',
            isAnalyzing: false,
            isAnalyzingStyle: false,
          });
        }),
      })),
      {
        name: STORAGE_KEY,
        partialize: (state) => ({
          topic: state.topic,
          keyInsight: state.keyInsight,
          handle: state.handle,
          selectedTemplate: state.selectedTemplate,
          selectedScraps: state.selectedScraps,
          selectedTags: state.selectedTags,
          templateStructure: state.templateStructure,
          sectionIdCounter: state.sectionIdCounter,
          selectedWritingStyleId: state.selectedWritingStyleId,
        }),
      }
    )
  )
);
