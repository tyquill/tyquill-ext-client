import React, { useEffect, useState, useMemo, useRef } from 'react';
import { IoAdd, IoClose, IoSparkles, IoCheckmark, IoTrash, IoChevronDown, IoChevronUp, IoArrowBack } from 'react-icons/io5';
import { RiAiGenerate } from 'react-icons/ri';
import { TbListDetails } from "react-icons/tb";
import styles from './PageStyles.module.css';
import articleStyles from './ArticleGeneratePage.module.css';
import { TagSelector } from '../../components/sidepanel/TagSelector/TagSelector';
import { TagList } from '../../components/sidepanel/TagList/TagList';
import { useToastHelpers } from '../../hooks/useToast';
import { ScrapResponse, scrapService } from '../../services/scrapService';
import { articleService, GenerateArticleV3Dto, TemplateSection, StreamEvent } from '../../services/articleService';
import DiscoBallScene from '../../components/sidepanel/DiscoBallScene/DiscoBallScene';
import Confetti from '../../components/sidepanel/Confetti/Confetti';
import { FaWandMagicSparkles } from "react-icons/fa6";
import { writingStyleService, WritingStyle } from '../../services/writingStyleService';
import { PageType } from '../../types/pages';
import Tooltip from '../../components/common/Tooltip';
import tagSelectorStyles from '../../components/sidepanel/TagSelector/TagSelector.module.css';
import { browser } from 'wxt/browser';
import { useArticleGenerateStore } from '../../stores/articleGenerateStore';
import { libraryItemService, LibraryItemDto } from '../../services/libraryItemService';
import { useI18n } from '../../hooks/useI18n';
import WritingStyleSelection from '../../components/sidepanel/WritingStyleSelection/WritingStyleSelection';
import {
  trackArticleTopicSetBridge,
  trackArticleKeyMessageSetBridge,
  trackArticleStyleSelectedBridge,
  trackArticleStyleCreateClickedBridge,
  trackArticleSectionAddedBridge,
  trackArticleSectionRemovedBridge,
  trackArticleSectionAnalyzeClickedBridge,
  trackArticleReferenceAddedBridge,
  trackArticleReferenceRemovedBridge,
  trackArticleReferenceModalOpenedBridge,
  trackArticleGenerationStartedBridge
} from '../../analytics/bridge';

interface ArticleGeneratePageProps {
  onNavigateToDetail: (articleId: string) => void; // UUID
  onNavigate: (page: PageType) => void;
  currentPage?: string;
  onRefreshArchiveList?: () => void;
}

const DEFAULT_MODAL_TOP_OFFSET = 160;

const ArticleGeneratePage: React.FC<ArticleGeneratePageProps> = ({
  onNavigateToDetail,
  onNavigate,
  currentPage,
  onRefreshArchiveList
}) => {
  const { showSuccess, showError, showInfo } = useToastHelpers();
  const { t, currentLanguage } = useI18n();
  
  // Zustand 스토어 사용
  const {
    // 상태 값들
    viewState,
    topic,
    keyInsight,
    handle,
    selectedTemplate,
    selectedScraps,
    selectedTags,
    isScrapModalOpen,
    isTagDropdownOpen,
    isAnalysisConfirmModalOpen,
    isGenerating,
    generationError,
    generationStatus,
    templateStructure,
    isAnalyzing,
    selectedWritingStyleId,
    isAnalyzingStyle,
    isStreaming,
    streamingProgress,
    streamingStep,
    streamingMessage,
    partialContent,
    completedSteps,
    stepMessages,
    nodeContents,

    // 액션들
    setViewState,
    setTopic,
    setKeyInsight,
    setHandle,
    setSelectedTemplate,
    addScrap,
    removeScrap,
    updateScrapOpinion,
    clearScraps,
    toggleTag,
    removeTag,
    toggleScrapModal,
    toggleTagDropdown,
    toggleAnalysisConfirmModal,
    setGenerating,
    setGenerationError,
    setGenerationStatus,
    setTemplateStructure,
    setStructuredIdea,
    setTemplateTitle,
    addTemplateSection,
    removeTemplateSection,
    clearTemplate,
    setAnalyzing,
    setWritingStyleId,
    setAnalyzingStyle,
    setStreaming,
    setStreamingProgress,
    setStreamingStep,
    setStreamingMessage,
    setPartialContent,
    addCompletedStep,
    setNodeContent,
    clearNodeContents,
    clearStreamingState,
    resetForm,
  } = useArticleGenerateStore();

  const [writingStyles, setWritingStyles] = useState<WritingStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState<boolean>(true);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [scrapModalTop, setScrapModalTop] = useState<number>(DEFAULT_MODAL_TOP_OFFSET);
  const SIDE_RAIL_WIDTH = 60; // Header에 추가된 사이드바 최소 폭과 동일하게 유지
  const keyMessageRef = useRef<HTMLTextAreaElement>(null);

  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false);
  const styleDropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const generationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationStartTimeRef = useRef<number>(0);
  // 참고 자료 모달 탭 상태
  const [referenceModalTab, setReferenceModalTab] = useState<'SCRAP' | 'PDF'>('SCRAP');
  // 모달 취소 복구를 위한 백업 상태
  const backupSelectedScrapsRef = useRef<ScrapResponse[]>([]);
  const backupSelectedUploadsRef = useRef<Array<{ uploadedFileId: number; title: string; usagePrompt: string }>>([]);
  // 탭별 태그 필터(탭 이동 시 초기화)
  const [scrapTagFilters, setScrapTagFilters] = useState<string[]>([]);
  const [uploadTagFilters, setUploadTagFilters] = useState<string[]>([]);

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        setIsLoadingStyles(true);
        const styles = await writingStyleService.getWritingStyles();
        setWritingStyles(styles);
      } catch (error) {
        console.error('Failed to fetch writing styles:', error);
        showError(t('articleGenerate_failedToLoadStyles'));
      } finally {
        setIsLoadingStyles(false);
      }
    };
    fetchStyles();
  }, []);

  const [showAllTags, setShowAllTags] = useState<string | null>(null);
  const styleDropdownRef = useRef<HTMLDivElement | null>(null);

  // Memoized selected style name for efficient lookup
  const selectedStyleName = useMemo(() => {
    if (selectedWritingStyleId === null) {
      return t('articleGenerate_defaultNewsletterStyle');
    }

    const style = writingStyles.find(s => s.id === selectedWritingStyleId);
    return style?.name || t('articleGenerate_defaultNewsletterStyle');
  }, [selectedWritingStyleId, writingStyles, t]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // 모달 바깥 클릭 처리
      if (isScrapModalOpen) {
        const modalOverlay = document.querySelector(`.${articleStyles.modalOverlay}`);
        const scrapModal = document.querySelector(`.${articleStyles.scrapModal}`);
        
        if (modalOverlay && target === modalOverlay && !scrapModal?.contains(target)) {
          toggleScrapModal();
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
  }, [showAllTags, isScrapModalOpen, toggleScrapModal]);

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

  // 초안 생성 중 경과 시간 타이머 (시작/종료는 isGenerating 기준으로만 제어)
  useEffect(() => {
    if (isGenerating) {
      generationStartTimeRef.current = Date.now();
      setElapsedSeconds(0);
      generationTimerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - generationStartTimeRef.current) / 1000);
        setElapsedSeconds(prev => (prev !== secs ? secs : prev));
      }, 50);
    }

    return () => {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
    };
  }, [isGenerating]);

  // 완료 시 타이머 정지 (표시값 유지)
  useEffect(() => {
    if (generationStatus === 'completed' && generationTimerRef.current) {
      clearInterval(generationTimerRef.current);
      generationTimerRef.current = null;
    }
  }, [generationStatus]);

  const formatElapsed = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}${t('articleGenerate_minutes')} ${remainingSeconds}${t('articleGenerate_seconds')}`;
  };
   
  // 스크랩 모달을 헤더 하단에 정확히 맞추기 위한 동적 top 계산
  useEffect(() => {
    if (!isScrapModalOpen) return;

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
  }, [isScrapModalOpen]);

  const handleScrapSelect = async (scrap: ScrapResponse) => {
    const isSelected = selectedScraps.find(s => s.scrapId === scrap.scrapId);

    if (isSelected) {
      removeScrap(scrap.scrapId);
      try {
        await trackArticleReferenceRemovedBridge({
          reference_type: 'scrap',
          reference_id: scrap.scrapId,
          from: 'modal'
        })
      } catch {}
    } else {
      addScrap(scrap);
      try {
        await trackArticleReferenceAddedBridge({
          reference_type: 'scrap',
          reference_id: scrap.scrapId,
          from: 'modal'
        })
      } catch {}
    }
  };

  const handleOpinionChange = (id: string, opinion: string) => { // UUID
    updateScrapOpinion(id, opinion);
  };

  const handleRemoveScrap = async (id: string) => { // UUID
    removeScrap(id);
    try {
      await trackArticleReferenceRemovedBridge({
        reference_type: 'scrap',
        reference_id: id,
        from: 'inline'
      })
    } catch {}
  };

  const handleGenerateTemplateFromPage = async () => {
    if (isAnalyzing) return;

    try {
      setAnalyzing(true);

      // 현재 활성 탭 정보 가져오기 - background script를 통해
      const tabInfoResponse = await browser.runtime.sendMessage({ action: 'getActiveTabInfo' });

      if (!tabInfoResponse || !tabInfoResponse.success) {
        throw new Error(tabInfoResponse?.error || t('articleGenerate_cannotFindActiveTab'));
      }

      const tab = tabInfoResponse.data;

      if (!tab?.id) {
        throw new Error(t('articleGenerate_cannotFindActiveTab'));
      }

      // URL 체크 - 제한된 페이지에서는 스크랩 불가
      if (tab.url?.startsWith('chrome://') ||
          tab.url?.startsWith('chrome-extension://') ||
          tab.url?.startsWith('browser://') ||
          tab.url?.startsWith('browser-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error(t('articleGenerate_cannotScrapThisPage'));
      }

      showInfo(t('articleGenerate_pageAnalysis'), t('articleGenerate_analysisDescription'));

      // 페이지 콘텐츠 스크랩 - background script를 통해 처리
      const response = await browser.runtime.sendMessage({
        action: 'clipCurrentPageForStyle'
      });

      if (!response.success) {
        throw new Error(response.error || t('articleGenerate_pageContentFetchFailed'));
      }

      // 서버에 콘텐츠 분석 요청
      const templateSections = await articleService.analyzeContentForTemplate({
        content: response.data.content,
      });

      const sections = templateSections.sections

      // console.log(sections);

      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        throw new Error(t('articleGenerate_cannotAnalyzePageStructure'));
      }

      setTemplateStructure(sections);
      showSuccess(t('articleGenerate_aiAnalysisComplete'), t('articleGenerate_sectionsCreated').replace('{count}', sections.length.toString()));

    } catch (error: any) {
      console.error('Template generation error:', error);
      showError(t('articleGenerate_sectionGenerationFailed'), error.message || t('articleGenerate_sectionGenerationError'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleIdeaChange = (sectionId: string, idea: string) => {
    setStructuredIdea(sectionId, idea);
  };

  const handleTitleChange = (sectionId: string, newTitle: string) => {
    setTemplateTitle(sectionId, newTitle);
  };

  const addSection = async (parentId?: string) => {
    const newTitle = parentId ? t('articleGenerate_newSubsection') : t('articleGenerate_newSection');
    addTemplateSection(parentId, newTitle);

    try {
      await trackArticleSectionAddedBridge({
        is_subsection: !!parentId,
        parent_id: parentId || null
      })
    } catch {}
  };

  const removeSection = async (sectionId: string) => {
    removeTemplateSection(sectionId);

    try {
      await trackArticleSectionRemovedBridge({
        section_id: sectionId
      })
    } catch {}
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
    // 초안 생성 시작 이벤트 추적
    try {
      await trackArticleGenerationStartedBridge({
        has_topic: !!topic,
        has_key_insight: !!keyInsight,
        has_template: !!templateStructure && templateStructure.length > 0,
        template_sections_count: templateStructure ? templateStructure.length : 0,
        selected_scraps_count: selectedScraps.length,
        selected_uploads_count: selectedUploads.length,
        writing_style_id: selectedWritingStyleId,
        is_custom_style: !!selectedWritingStyleId
      })
    } catch {}

    // templateStructure에서 섹션별 아이디어 수집
    const collectIdeas = (sections: TemplateSection[]): Record<string, string> => {
      const ideas: Record<string, string> = {};
      sections.forEach(section => {
        if (section.keyIdea && section.keyIdea.trim()) {
          ideas[section.id!] = section.keyIdea;
        }
        if (section.children) {
          Object.assign(ideas, collectIdeas(section.children));
        }
      });
      return ideas;
    };

    const structuredIdeas = templateStructure ? collectIdeas(templateStructure) : {};
    const isTemplateMode = templateStructure && Object.values(structuredIdeas).some((idea: any) => typeof idea === 'string' && idea.trim() !== '');

    if (isTemplateMode) {
      if (!Object.values(structuredIdeas).some((idea: any) => typeof idea === 'string' && idea.trim() !== '')) {
        showError(t('articleGenerate_inputError'), t('articleGenerate_enterSectionIdeas'));
        return;
      }
    } else {
      if (!topic || !keyInsight) {
        setGenerationError(t('articleGenerate_enterTopicAndKeyInsight'));
        showError(t('articleGenerate_inputError'), t('articleGenerate_enterTopicAndKeyMessage'));
        return;
      }
    }

    if (isGenerating || isStreaming) return;

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
      setGenerating(true);
      setGenerationError(null);
      setGenerationStatus('processing');
      clearStreamingState();
      setStreaming(true);  // clearStreamingState 이후에 호출해야 함!

      const templateWithoutIds = templateStructure ? removeIdsFromTemplate(templateStructure) : [];

      // V3 API를 사용한 스트리밍 생성 (PDF 지원)
      const generateData: GenerateArticleV3Dto = {
        topic: isTemplateMode ? (templateStructure?.[0]?.title || t('articleGenerate_sectionBasedArticle')) : topic,
        keyInsight: isTemplateMode ? JSON.stringify(structuredIdeas) : keyInsight,
        scrapWithOptionalComment: selectedScraps.map(scrap => ({
          scrapId: scrap.scrapId,
          userComment: scrap.opinion || undefined,
        })),
        generationParams: handle || undefined,
        articleStructureTemplate: templateWithoutIds,
        writingStyleId: selectedWritingStyleId ?? undefined,
        // V3에서 추가: PDF 업로드 지원
        uploadWithUsagePrompt: selectedUploads.map(upload => ({
          uploadedFileId: upload.uploadedFileId,
          usagePrompt: upload.usagePrompt,
        })),
      };

      // Handle streaming events
      const handleStreamEvent = (event: StreamEvent) => {
        // Helper to get localized message
        const getLocalizedMessage = (event: StreamEvent): string => {
          if (currentLanguage === 'en' && event.message_en) {
            return event.message_en;
          } else if (currentLanguage === 'ko' && event.message_ko) {
            return event.message_ko;
          }
          // Fallback to message or node name
          return event.message || event.node || '';
        };

        if (event.type === 'progress') {
          if (event.progress !== undefined) {
            setStreamingProgress(event.progress);
          }
          const localizedMessage = getLocalizedMessage(event);
          if (localizedMessage) {
            setStreamingMessage(localizedMessage);
          }
        } else if (event.type === 'node_start') {
          if (event.node) {
            const localizedMessage = getLocalizedMessage(event);
            setStreamingStep(event.node, localizedMessage);
            setStreamingMessage(localizedMessage);
          }
        } else if (event.type === 'node_complete') {
          if (event.node) {
            addCompletedStep(event.node);
          }
        } else if (event.type === 'token') {
          // Accumulate partial content
          if (event.content) {
            setPartialContent(event.content);
            // Store content per node for step-by-step display
            if (event.node) {
              setNodeContent(event.node, event.content);
            }
          }
        } else if (event.type === 'complete') {
          setGenerationStatus('completed');
          setStreaming(false);

          // Show success message
          showSuccess(
            t('articleGenerate_draftGenerationComplete'),
            event.title ? `${t('articleGenerate_titlePrefix')} ${event.title}` : ''
          );

          if (currentPage === 'content' && onRefreshArchiveList) {
            onRefreshArchiveList();
          }

          // Clear form fields
          setTopic('');
          setKeyInsight('');
          setHandle('');
          clearScraps();
          setSelectedUploads([]);
          clearTemplate();
          // Don't reset viewState - keep user in draft-form view
        } else if (event.type === 'error') {
          setGenerationStatus('failed');
          setGenerating(false);
          setStreaming(false);
          const errorMsg = event.message || t('articleGenerate_generationHint');
          setGenerationError(errorMsg);
          showError(t('articleGenerate_draftGenerationFailed'), errorMsg);
        }
      };

      // Start streaming generation
      articleService
        .generateArticleV3Stream(generateData, handleStreamEvent)
        .then(() => {
          // Stream completed successfully
        })
        .catch((error) => {
          setGenerationStatus('failed');
          setGenerating(false);
          setStreaming(false);
          const errorMsg = error.message || t('articleGenerate_requestFailed');
          setGenerationError(errorMsg);
          showError(t('articleGenerate_draftGenerationFailed'), errorMsg);
        });

    } catch (error: any) {
      setGenerationError(error.message || t('articleGenerate_draftGenerationFailedGeneral'));
      setGenerationStatus('failed');
      setGenerating(false);
      setStreaming(false);
      showError(t('articleGenerate_requestSendFailed'), error.message || t('articleGenerate_requestError'));
    }
  };

  const [allScraps, setAllScraps] = useState<ScrapResponse[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  // 업로드된 PDF 관리 상태 (사용 프롬프트만)
  const [allUploads, setAllUploads] = useState<LibraryItemDto[]>([]);
  const [allUploadTags, setAllUploadTags] = useState<string[]>([]);
  const [selectedUploads, setSelectedUploads] = useState<Array<{
    uploadedFileId: number;
    title: string;
    usagePrompt: string; // 해당 자료를 어떻게 쓸지 지시문
  }>>([]);
  // 막힘 애니메이션 상태 (75자 도달 시 순간 흔들기)
  const [blockedAnimIds, setBlockedAnimIds] = useState<Set<string | number>>(new Set());


  const triggerBlockedAnim = (id: string | number) => { // UUID string or number
    setBlockedAnimIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setBlockedAnimIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 380);
  };

  const toggleUploadSelection = async (upload: LibraryItemDto) => {
    setSelectedUploads(prev => {
      const exists = prev.find(u => u.uploadedFileId === upload.id);
      if (exists) return prev.filter(u => u.uploadedFileId !== upload.id);
      return [...prev, { uploadedFileId: upload.id, title: upload.title, usagePrompt: '' }];
    });

    const isSelected = selectedUploads.find(u => u.uploadedFileId === upload.id);
    try {
      if (isSelected) {
        await trackArticleReferenceRemovedBridge({
          reference_type: 'pdf',
          reference_id: upload.id,
          from: 'modal'
        })
      } else {
        await trackArticleReferenceAddedBridge({
          reference_type: 'pdf',
          reference_id: upload.id,
          from: 'modal'
        })
      }
    } catch {}
  };

  const setUploadUsagePrompt = (uploadedFileId: number, value: string) => {
    setSelectedUploads(prev => prev.map(u => u.uploadedFileId === uploadedFileId ? { ...u, usagePrompt: value } : u));
  };




  useEffect(() => {
    const fetchScraps = async () => {
      const scraps: ScrapResponse[] = await scrapService.getScraps();
      setAllScraps(scraps);
      setAllTags(Array.from(new Set(scraps.flatMap(scrap => scrap.tags?.map(tag => tag.name) || []))).sort());
    };
    fetchScraps();
  }, []);

  // 업로드된 PDF 목록 로드
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const uploads = await libraryItemService.list('UPLOAD');
        const pdfs = uploads.filter((u: LibraryItemDto) => (u.mimeType?.includes('pdf') || u.url?.toLowerCase().endsWith('.pdf')));
        setAllUploads(pdfs);
        setAllUploadTags(Array.from(new Set(pdfs.flatMap((u: LibraryItemDto) => u.tags || []))).sort());
      } catch (err) {
        console.error('Failed to load uploads', err);
      }
    };
    fetchUploads();
  }, []);

  const filteredUploads = useMemo(() => {
    if (uploadTagFilters.length === 0) return allUploads;
    return allUploads.filter((u: LibraryItemDto) => (u.tags || []).some((t: string) => uploadTagFilters.includes(t)));
  }, [allUploads, uploadTagFilters]);

  const filteredScraps = useMemo(() => {
    if (scrapTagFilters.length === 0) {
      return allScraps;
    }
    
    return allScraps.filter(scrap => {
      return scrapTagFilters.some(selectedTag => 
        scrap.tags?.some(tag => tag.name === selectedTag)
      );
    });
  }, [allScraps, scrapTagFilters]);

  // 탭 이동 시 해당 탭의 태그 선택 초기화
  useEffect(() => {
    if (referenceModalTab === 'SCRAP') {
      setScrapTagFilters([]);
    } else {
      setUploadTagFilters([]);
    }
  }, [referenceModalTab]);

  const toggleScrapTagFilter = (tag: string) => {
    setScrapTagFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const removeScrapTagFilter = (tag: string) => {
    setScrapTagFilters(prev => prev.filter(t => t !== tag));
  };
  const toggleUploadTagFilter = (tag: string) => {
    setUploadTagFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const removeUploadTagFilter = (tag: string) => {
    setUploadTagFilters(prev => prev.filter(t => t !== tag));
  };

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

  // 예상 시간 UI 제거됨: 계산 로직 삭제

  // Handle style selection
  const handleStyleSelection = (styleId: number | null) => {
    setWritingStyleId(styleId);
    setViewState('draft-form');
  };

  // Handle back to style selection
  const handleBackToStyleSelection = () => {
    setViewState('style-selection');
  };

  // Render style selection view
  if (viewState === 'style-selection') {
    return (
      <div className={styles.pageContainer}>
        <div className={`${styles.page} ${articleStyles.articleGeneratePageLayout}`}>
          <WritingStyleSelection
            onStyleSelected={handleStyleSelection}
            onNavigate={onNavigate}
            selectedStyleId={selectedWritingStyleId}
          />
        </div>
      </div>
    );
  }

  // Render draft form view
  return (
    <div className={styles.pageContainer}>
      <div className={`${styles.page} ${articleStyles.articleGeneratePageLayout}`}>
        <div className={articleStyles.scrollableContent}>
          <div className={articleStyles.articlePageHeader} ref={headerRef}>
            <div className={styles.headerControls}>
              <button
                className={articleStyles.backButton}
                onClick={handleBackToStyleSelection}
                title={t('common_back')}
              >
                <IoArrowBack size={20} />
              </button>
              <h1 className={styles.pageTitle}>{t('articleGenerate_newsletterDraftGeneration')}</h1>
            </div>
            {/* Display selected style */}
            <div className={articleStyles.selectedStyleInfo}>
              <span className={articleStyles.selectedStyleLabel}>
                {t('articleGenerate_writeStyleSelection')}:
              </span>
              <span className={articleStyles.selectedStyleName}>
                {isLoadingStyles ? (
                  <span style={{ opacity: 0.6 }}>{t('common_loading') || 'Loading...'}</span>
                ) : (
                  selectedStyleName
                )}
              </span>
            </div>
          </div>

          <div className={styles.draftForm}>
          <div className={styles.formGroup}>
            <label htmlFor="subject" className={styles.formLabel}>
              {t('articleGenerate_topicLabel')}
            </label>
            <input
              id="subject"
              type="text"
              className={styles.formInput}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onBlur={async () => {
                if (topic && topic.trim()) {
                  try {
                    await trackArticleTopicSetBridge({
                      topic_length: topic.length,
                      has_content: true
                    })
                  } catch {}
                }
              }}
              placeholder={t('articleGenerate_topicFormPlaceholder')}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="message" className={styles.formLabel}>
              {t('articleGenerate_keyMessageLabel')}
            </label>
            <textarea
              ref={keyMessageRef}
              id="message"
              className={articleStyles.keyMessageTextarea}
              value={keyInsight}
              onChange={(e) => setKeyInsight(e.target.value)}
              onBlur={async () => {
                if (keyInsight && keyInsight.trim()) {
                  try {
                    await trackArticleKeyMessageSetBridge({
                      message_length: keyInsight.length,
                      has_content: true
                    })
                  } catch {}
                }
              }}
              placeholder={t('articleGenerate_keyMessageFormPlaceholder')}
            />
          </div>

          {/* 섹션 구성 */}
          <div className={styles.referenceSection}>
            <div className={articleStyles.sectionHeader}>
              <h3 className={styles.sectionTitle}>{t('articleGenerate_sectionConfiguration')}</h3>
              <div className={articleStyles.sectionActions}>
                <button 
                  onClick={() => addSection()}
                  className={articleStyles.sectionButton}
                >
                  <IoAdd size={14} />
                  {t('articleGenerate_addSection')}
                </button>
                
                  <button
                  onClick={async () => {
                    toggleAnalysisConfirmModal();
                    try {
                      await trackArticleSectionAnalyzeClickedBridge({
                        from: 'section_header'
                      })
                    } catch {}
                  }}
                  disabled={isAnalyzing}
                  className={`${articleStyles.sectionButton} ${isAnalyzing ? articleStyles.sectionButtonDisabled : ''}`}
                >
                  <FaWandMagicSparkles size={14} />
                  {isAnalyzing ? t('articleGenerate_analyzing') : t('articleGenerate_currentPageSectionAnalysis')}
                </button>
              </div>
            </div>
            
            {!templateStructure && (
              <div className={articleStyles.emptyState}>
                <RiAiGenerate size={24} className={articleStyles.emptyStateIcon} />
                <p className={articleStyles.emptyStateTitle}>
                  {t('articleGenerate_structuredWritingHelp')}
                </p>
                <p className={articleStyles.emptyStateSubtitle}>
                  {t('articleGenerate_structuredWritingStart')}
                </p>
              </div>
            )}

            {/* 섹션 구성 표시 */}
            {templateStructure && (
              <div className={articleStyles.sectionContainer}>
                <div className={articleStyles.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h4 className={articleStyles.sectionTitle}>
                      <TbListDetails size={18} className={articleStyles.sectionTitleIcon} />
                      {t('articleGenerate_sectionConfiguration')}
                    </h4>
                    <span className={articleStyles.sectionStatus}>
                      {t('articleGenerate_autoSaved')}
                    </span>
                  </div>
                  <button 
                    onClick={() => clearTemplate()}
                    className={articleStyles.clearButton}
                  >
                    × {t('articleGenerate_reset')}
                  </button>
                </div>
                {flattenSections(templateStructure).map(({ section, level, id, parentId }) => {
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
                            <Tooltip content={t('articleGenerate_addSubsection')}>
                              <div
                                onClick={() => addSection(id)}
                                className={articleStyles.addChildButton}
                              >
                                <IoAdd size={15} />
                              </div>
                            </Tooltip>
                          )}
                          
                          <Tooltip content={t('articleGenerate_deleteSection')}>
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
                        placeholder={t('articleGenerate_sectionIdeaPlaceholder')}
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
                  {t('articleGenerate_addSection')}
                </button>
              </div>
            )}
          </div>

          {/* 참고 자료 */}
          <div className={articleStyles.referenceSection}>
          <h3 className={articleStyles.referenceSectionTitle}>{t('articleGenerate_referenceMaterials')}</h3>
          <button
            className={articleStyles.addReferenceButton}
            onClick={async () => {
              // 모달 열기 전에 현재 선택 상태 백업
              backupSelectedScrapsRef.current = [...selectedScraps];
              backupSelectedUploadsRef.current = JSON.parse(JSON.stringify(selectedUploads));
              setReferenceModalTab('SCRAP');
              toggleScrapModal();
              try {
                await trackArticleReferenceModalOpenedBridge({
                  existing_scraps_count: selectedScraps.length,
                  existing_uploads_count: selectedUploads.length
                })
              } catch {}
            }}
          >
            <IoAdd size={16} />
            {t('articleGenerate_addReferenceMaterials')}
          </button>
            
            <div className={articleStyles.referenceList}>
              {selectedScraps.map(scrap => (
                <div key={scrap.scrapId} className={articleStyles.referenceItem}>
                  <div style={{ flex: 1 }}>
                    <div>{scrap.title}</div>
                    <textarea
                      value={scrap.opinion || ''}
                      maxLength={75}
                      onChange={(e) => {
                        const v = e.target.value.slice(0, 75);
                        handleOpinionChange(scrap.scrapId, v);
                      }}
                      onKeyDown={(e) => {
                        const len = (scrap.opinion?.length || 0);
                        const isModifier = e.ctrlKey || e.metaKey || e.altKey;
                        const isNavKey = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','PageUp','PageDown','Shift','Control','Meta','Alt','Escape'].includes(e.key);
                        const isDeletion = ['Backspace','Delete'].includes(e.key);
                        const willAddChar = !isModifier && !isNavKey && !isDeletion && e.key.length === 1;
                        if (len >= 75 && willAddChar) {
                          triggerBlockedAnim(scrap.scrapId);
                        }
                      }}
                      rows={1}
                      className={`${styles.formInput} ${(scrap.opinion?.length || 0) >= 75 ? articleStyles.blockedInput : ''} ${blockedAnimIds.has(scrap.scrapId) ? articleStyles.shake : ''}`}
                      style={{
                        resize: 'none',
                        overflow: 'hidden',
                        minHeight: '36px',
                        fieldSizing: 'content'
                      } as React.CSSProperties}
                      placeholder={t('articleGenerate_howToUseThisMaterial')}
                    />
                    <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12, color: ((scrap.opinion?.length || 0) >= 75) ? '#ef4444' : '#6b7280' }}>
                      {(scrap.opinion?.length || 0)}/75
                    </div>
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
            {/* 선택된 PDF 요약 표시 및 프롬프트 수정 */}
            {selectedUploads.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: '#374151' }}>{t('articleGenerate_selectedPDF')}</h4>
                <div className={articleStyles.referenceList} style={{ marginTop: 8 }}>
                  {selectedUploads.map(u => (
                    <div key={u.uploadedFileId} className={articleStyles.referenceItem}>
                      <div style={{ flex: 1 }}>
                        <div>{u.title}</div>
                        <textarea
                          value={u.usagePrompt || ''}
                          maxLength={75}
                          onChange={(e) => {
                            const v = e.target.value.slice(0, 75);
                            setUploadUsagePrompt(u.uploadedFileId, v);
                          }}
                          onKeyDown={(e) => {
                            const len = (u.usagePrompt?.length || 0);
                            const isModifier = e.ctrlKey || e.metaKey || e.altKey;
                            const isNavKey = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','PageUp','PageDown','Shift','Control','Meta','Alt','Escape'].includes(e.key);
                            const isDeletion = ['Backspace','Delete'].includes(e.key);
                            const willAddChar = !isModifier && !isNavKey && !isDeletion && e.key.length === 1;
                            if (len >= 75 && willAddChar) {
                              triggerBlockedAnim(u.uploadedFileId);
                            }
                          }}
                          rows={1}
                          className={`${styles.formInput} ${(u.usagePrompt?.length || 0) >= 75 ? articleStyles.blockedInput : ''} ${blockedAnimIds.has(u.uploadedFileId) ? articleStyles.shake : ''}`}
                          style={{
                            resize: 'none',
                            overflow: 'hidden',
                            minHeight: '36px',
                            fieldSizing: 'content'
                          } as React.CSSProperties}
                          placeholder={t('articleGenerate_howToUseThisMaterial')}
                        />
                        <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12, color: ((u.usagePrompt?.length || 0) >= 75) ? '#ef4444' : '#6b7280' }}>
                          {(u.usagePrompt?.length || 0)}/75
                        </div>
                      </div>
                      <button
                        className={articleStyles.referenceRemoveButton}
                        onClick={async () => {
                          setSelectedUploads(prev => prev.filter(x => x.uploadedFileId !== u.uploadedFileId))
                          try {
                            await trackArticleReferenceRemovedBridge({
                              reference_type: 'pdf',
                              reference_id: u.uploadedFileId,
                              from: 'inline'
                            })
                          } catch {}
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {generationError && (
            <div className={articleStyles.errorMessage}>
              {generationError}
            </div>
          )}
          </div>
        </div>

        {/* Footer - 초안 생성 버튼 */}
        <div className={articleStyles.fixedButtonContainer}>
          <button 
            className={`${articleStyles.addButton} ${isGenerating ? articleStyles.loading : ''}`}
            onClick={handleGenerateArticle}
            disabled={isGenerating || (!topic && !templateStructure)}
          >
            {generationStatus === 'completed' ? (
              <>
                <IoCheckmark size={20} />
                {t('articleGenerate_generationRequestComplete')}
              </>
            ) : generationStatus === 'failed' ? (
              <>
                <IoClose size={20} />
                {t('articleGenerate_failed')}
              </>
            ) : (
              <>
                <IoSparkles size={20} />
                {t('articleGenerate_generateDraft')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI 분석 컨펌 모달 */}
      {isAnalysisConfirmModalOpen && (
        <div 
          className={articleStyles.analysisModalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              toggleAnalysisConfirmModal();
            }
          }}
        >
          <div className={articleStyles.analysisModal}>
              <div className={articleStyles.modalHeader}>
                <h2 className={articleStyles.modalTitle}>{t('articleGenerate_aiPageAnalysis')}</h2>
                <button 
                  className={articleStyles.modalCloseButton}
                  onClick={() => toggleAnalysisConfirmModal()}
                >
                  <IoClose />
                </button>
              </div>
              
              <div className={articleStyles.analysisModalContent}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <DiscoBallScene />
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>
                    {t('articleGenerate_analysisExplanation')}
                  </h3>
                  <p style={{ margin: '0 0 20px 0', color: '#666', lineHeight: '1.6', fontSize: '16px' }}>
                    {t('articleGenerate_analysisDetailExplanation').split('\nBR').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < t('articleGenerate_analysisDetailExplanation').split('\nBR').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                  
                  {/* 기존 섹션이 있을 때 경고 메시지 */}
                  {templateStructure && templateStructure.length > 0 && (
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
                      {t('articleGenerate_warningExistingSections').split('\nBR').map((line, index) => (
                        <React.Fragment key={index}>
                          {line}
                          {index < t('articleGenerate_warningExistingSections').split('\nBR').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => toggleAnalysisConfirmModal()}
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
                      {t('common_cancel')}
                    </button>
                    <button
                      onClick={async () => {
                        toggleAnalysisConfirmModal();
                        await handleGenerateTemplateFromPage();
                      }}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#111827',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {t('articleGenerate_startAnalysis')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 초안 생성 중 모달 (비활성 오버레이) */}
        {isGenerating && (
          <div className={articleStyles.analysisModalOverlay} onClick={(e) => e.stopPropagation()}>
            <div className={articleStyles.analysisModal}>
              <div className={articleStyles.modalHeader}>
                <h2 className={articleStyles.modalTitle}>{t('articleGenerate_draftGenerationInProgress')}</h2>
              </div>
              <div className={articleStyles.analysisModalContent}>
                <div style={{ textAlign: 'center', padding: '20px 0', position: 'relative' }}>
                  {generationStatus === 'completed' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        marginBottom: 8
                      }}>
                        <IoCheckmark size={28} />
                      </div>
                      <Confetti
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: 0,
                          height: 140,
                          zIndex: 2,
                        }}
                      />
                    </div>
                  )}
                  <h3 style={{ margin: '12px 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
                    {generationStatus === 'completed' ? t('articleGenerate_draftGenerationComplete') : t('articleGenerate_processingRequest')}
                  </h3>

                  {/* Streaming Progress */}
                  {generationStatus !== 'completed' && isStreaming && (
                    <>
                      {/* Current Step Message */}
                      {streamingMessage && (
                        <p style={{ margin: '0 0 12px 0', color: '#111827', lineHeight: '1.5', fontSize: '14px', fontWeight: 500 }}>
                          {streamingMessage}
                        </p>
                      )}

                      {/* Step Progress List */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        marginTop: '12px',
                        marginBottom: '12px'
                      }}>
                        {/* Show completed steps */}
                        {completedSteps.map((step, index) => (
                          <div
                            key={`completed-${step}-${index}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px',
                              color: '#6b7280',
                              padding: '6px 8px',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: '#111827',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              flexShrink: 0
                            }}>
                              <IoCheckmark size={12} />
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>{stepMessages[step] || step}</span>
                          </div>
                        ))}

                        {/* Show current step */}
                        {streamingStep && !completedSteps.includes(streamingStep) && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px',
                              color: '#111827',
                              fontWeight: 500,
                              padding: '6px 8px',
                              textAlign: 'left'
                            }}
                          >
                            <div className={articleStyles.stepSpinner} />
                            <span style={{ flex: 1, textAlign: 'left' }}>{streamingMessage || streamingStep}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {generationStatus !== 'completed' && !isStreaming && (
                    <p style={{ margin: '0 0 8px 0', color: '#666', lineHeight: '1.5', fontSize: '14px' }}>
                      {t('articleGenerate_estimatedTime')}
                    </p>
                  )}

                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: '13px' }}>
                    {t('articleGenerate_elapsedTimeLabel')}: {formatElapsed(elapsedSeconds)}
                  </div>
                </div>
                {generationStatus === 'completed' && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 12 }}>
                    <button
                      onClick={() => {
                        setGenerating(false);
                        setGenerationStatus('idle');
                        setGenerationError(null);
                        onNavigate('content');
                      }}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#111827',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      {t('articleGenerate_goToArchive')}
                    </button>
                    <button
                      onClick={() => {
                        setGenerating(false);
                        setGenerationStatus('idle');
                        setGenerationError(null);
                      }}
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
                      {t('common_close')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isScrapModalOpen && (
          <div 
            className={articleStyles.modalOverlay}
            style={{ top: scrapModalTop, right: SIDE_RAIL_WIDTH }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                toggleScrapModal();
              }
            }}
          >
            <div
              className={articleStyles.scrapModal}
              style={{ maxHeight: `calc(100vh - ${scrapModalTop + 32}px)` }}
            >
              <div className={articleStyles.modalHeader}>
                <h2 className={articleStyles.modalTitle}>{t('articleGenerate_selectReferenceMaterials')}</h2>
              </div>
              {/* 탭 */}
              <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px 16px' }}>
                <button
                  className={articleStyles.sectionButton}
                  style={{ background: referenceModalTab === 'SCRAP' ? '#111827' : '#fff', color: referenceModalTab === 'SCRAP' ? '#fff' : '#111827' }}
                  onClick={() => setReferenceModalTab('SCRAP')}
                >{t('articleGenerate_scraps')}</button>
                <button
                  className={articleStyles.sectionButton}
                  style={{ background: referenceModalTab === 'PDF' ? '#111827' : '#fff', color: referenceModalTab === 'PDF' ? '#fff' : '#111827' }}
                  onClick={() => setReferenceModalTab('PDF')}
                >{t('articleGenerate_pdf')}</button>
              </div>

              {/* 스크랩 탭: 태그 + 리스트 */}
              {referenceModalTab === 'SCRAP' && (
                <>
                  <TagSelector
                    availableTags={allTags}
                    selectedTags={scrapTagFilters}
                    onTagSelect={toggleScrapTagFilter}
                    onTagRemove={removeScrapTagFilter}
                  />
                </>
              )}

              {/* PDF 탭: 태그 선택 위치를 스크랩과 동일하게 */}
              {referenceModalTab === 'PDF' && (
                <>
                  <TagSelector
                    availableTags={allUploadTags}
                    selectedTags={uploadTagFilters}
                    onTagSelect={toggleUploadTagFilter}
                    onTagRemove={removeUploadTagFilter}
                  />
                </>
              )}

              <div
                className={articleStyles.modalContent}
                style={{ maxHeight: `calc(100vh - ${scrapModalTop + 240}px)` }}
              >
                {referenceModalTab === 'SCRAP' && (
                  <>
                    {filteredScraps.map((scrap: ScrapResponse) => (
                      <div
                        key={scrap.scrapId}
                        className={`${articleStyles.scrapItem} ${
                          selectedScraps.find(s => s.scrapId === scrap.scrapId) ? articleStyles.selected : ''
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
                  </>
                )}

                {referenceModalTab === 'PDF' && (
                  <>
                    {filteredUploads.length === 0 ? (
                      <div className={articleStyles.emptyState}>
                        <p className={articleStyles.emptyStateSubtitle}>{t('articleGenerate_noPDFsFound')}</p>
                      </div>
                    ) : (
                      filteredUploads.map(upload => {
                        const selected = selectedUploads.find(u => u.uploadedFileId === upload.id);
                        return (
                          <div
                            key={upload.id}
                            className={`${articleStyles.scrapItem} ${selected ? articleStyles.selected : ''}`}
                            onClick={() => toggleUploadSelection(upload)}
                            data-url={upload.url}
                          >
                            <div className={articleStyles.scrapTitle}>{upload.title}</div>
                            <div className={articleStyles.scrapContent}>
                              {upload.previewText ? (upload.previewText.length > 100 ? `${upload.previewText.substring(0, 100)}...` : upload.previewText) : t('articleGenerate_noDescription')}
                            </div>
                            <div className={articleStyles.scrapFooter}>
                              <div className={articleStyles.scrapTags}>
                                <TagList tags={upload.tags || []} />
                              </div>
                              <div className={articleStyles.scrapDate}>{formatScrapDate(upload.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer with confirmation buttons */}
              <div className={articleStyles.modalFooter}>
                <button
                  className={articleStyles.cancelButton}
                  onClick={() => {
                    // 취소: 백업으로 복구 후 닫기
                    clearScraps();
                    backupSelectedScrapsRef.current.forEach(s => addScrap(s));
                    setSelectedUploads(JSON.parse(JSON.stringify(backupSelectedUploadsRef.current)));
                    toggleScrapModal();
                  }}
                >
                  <IoClose size={16} />
                  {t('common_cancel')}
                </button>
                <button
                  className={articleStyles.confirmButton}
                  onClick={() => toggleScrapModal()}
                >
                  <IoCheckmark size={16} />
                  {t('articleGenerate_confirmSelection')}
                </button>
              </div>


            </div>
          </div>
        )}
    </div>
  );
};

export default ArticleGeneratePage;
