import React, { useEffect, useState, useMemo, useRef } from 'react';
import { IoAdd, IoClose, IoSparkles, IoCheckmark, IoTrash, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { RiAiGenerate } from 'react-icons/ri';
import { TbListDetails } from "react-icons/tb";
import styles from './PageStyles.module.css';
import articleStyles from './ArticleGeneratePage.module.css';
import { TagSelector } from '../../components/sidepanel/TagSelector/TagSelector';
import { TagList } from '../../components/sidepanel/TagList/TagList';
import { useToastHelpers } from '../../hooks/useToast';
import { ScrapResponse, scrapService } from '../../services/scrapService';
import { articleService, GenerateArticleV2Dto, TemplateSection } from '../../services/articleService';
import DiscoBallScene from '../../components/sidepanel/DiscoBallScene/DiscoBallScene';
import Confetti from '../../components/sidepanel/Confetti/Confetti';
import { FaWandMagicSparkles } from "react-icons/fa6";
import { writingStyleService, WritingStyle } from '../../services/writingStyleService';
import { PageType } from '../../types/pages';
import Tooltip from '../../components/common/Tooltip';
import tagSelectorStyles from '../../components/sidepanel/TagSelector/TagSelector.module.css';
import { browser } from 'wxt/browser';
import { useArticleGenerateStore } from '../../stores/articleGenerateStore';
import { mp } from '../../lib/mixpanel';

interface ArticleGeneratePageProps {
  onNavigateToDetail: (articleId: number) => void;
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
  
  // Zustand 스토어 사용
  const {
    // 상태 값들
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
    
    // 액션들
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
    resetForm,
  } = useArticleGenerateStore();

  const [writingStyles, setWritingStyles] = useState<WritingStyle[]>([]);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [scrapModalTop, setScrapModalTop] = useState<number>(DEFAULT_MODAL_TOP_OFFSET);
  const SIDE_RAIL_WIDTH = 60; // Header에 추가된 사이드바 최소 폭과 동일하게 유지

  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false);
  const styleDropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const generationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationStartTimeRef = useRef<number>(0);
  
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

  const [showAllTags, setShowAllTags] = useState<string | null>(null);
  const styleDropdownRef = useRef<HTMLDivElement | null>(null);

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
    return `${minutes}분 ${remainingSeconds}초`;
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

  const handleScrapSelect = (scrap: ScrapResponse) => {
    const isSelected = selectedScraps.find(s => s.scrapId === scrap.scrapId);
    
    if (isSelected) {
      removeScrap(scrap.scrapId);
    } else {
      addScrap(scrap);
    }
  };

  const handleOpinionChange = (id: number, opinion: string) => {
    updateScrapOpinion(id, opinion);
  };

  const handleRemoveScrap = (id: number) => {
    removeScrap(id);
  };

  const handleGenerateTemplateFromPage = async () => {
    if (isAnalyzing) return;

    try {
      setAnalyzing(true);
      
      // 현재 활성 탭 정보 가져오기
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      
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
        await browser.tabs.sendMessage(tab.id, { type: 'PING' });
      } catch (pingError) {
        // Content script 수동 주입 시도
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/index.js']
        });
        
        // 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      showInfo('페이지 분석 중...', '현재 페이지의 구조를 분석하여 템플릿을 생성하고 있습니다.');

      // 페이지 콘텐츠 스크랩
      const response = await browser.tabs.sendMessage(tab.id, {
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

      setTemplateStructure(sections);
      showSuccess('AI 분석 완료', `${sections.length}개의 섹션으로 구성을 만들었습니다.`);

    } catch (error: any) {
      console.error('Template generation error:', error);
      showError('섹션 구성 실패', error.message || '섹션 구성 생성 중 오류가 발생했습니다.');
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

  const addSection = (parentId?: string) => {
    const newTitle = parentId ? '새 하위 섹션' : '새 섹션';
    addTemplateSection(parentId, newTitle);
  };

  const removeSection = (sectionId: string) => {
    removeTemplateSection(sectionId);
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
        showError('입력 오류', '섹션의 아이디어를 하나 이상 입력해주세요.');
        return;
      }
    } else {
      if (!topic || !keyInsight) {
        setGenerationError('주제와 키메시지를 입력해주세요.');
        showError('입력 오류', '주제와 키메시지를 모두 입력해주세요.');
        return;
      }
    }

    if (isGenerating) return;

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
      setGenerationStatus('idle');

      const templateWithoutIds = templateStructure ? removeIdsFromTemplate(templateStructure) : [];

      // V2 API를 사용한 비동기 생성
      const generateData: GenerateArticleV2Dto = {
        topic: isTemplateMode ? (templateStructure?.[0]?.title || '섹션 기반 아티클') : topic,
        keyInsight: isTemplateMode ? JSON.stringify(structuredIdeas) : keyInsight,
        scrapWithOptionalComment: selectedScraps.map(scrap => ({
          scrapId: scrap.scrapId,
          userComment: scrap.opinion || undefined,
        })),
        generationParams: handle || undefined,
        articleStructureTemplate: templateWithoutIds,
        writingStyleId: selectedWritingStyleId ?? undefined,
      };

      // V2 API로 비동기 생성 시작
      setGenerationStatus('processing');
      
      articleService.generateArticleV2(generateData)
        .then(async (response) => {
          // 즉시 요청 성공 메시지 표시
          showInfo('초안 생성 시작', `아티클 생성이 시작되었습니다.`);
          
          try {
            // 백그라운드에서 완성 대기 (최대 50회, 5초 간격 = 2.5분)
            const completedArticle = await articleService.waitForArticleCompletion(response.articleId, 50, 5000);
            
            if (completedArticle.status === 'completed') {
              setGenerationStatus('completed');
              // showSuccess('초안 생성 완료', '보관함에서 생성된 초안을 확인해 보세요!');
              
              // Track article generation success
              try {
                mp.track('Article_Generated', {
                  scraps_count: selectedScraps.length,
                  tags_count: selectedTags.length,
                  has_template: !!templateStructure,
                  writing_style_id: selectedWritingStyleId,
                  generation_time_seconds: elapsedSeconds,
                  timestamp: Date.now()
                });
              } catch (error) {
                console.error('Mixpanel tracking error:', error);
              }
              
              if (currentPage === 'archive' && onRefreshArchiveList) {
                onRefreshArchiveList();
              }
              
              // 완료 상태에서는 폼 필드만 개별적으로 초기화 (생성 상태는 유지)
              setTopic('');
              setKeyInsight('');
              setHandle('');
              clearScraps();
              // selectedTags는 유지 (다음 생성에 유용할 수 있음)
              clearTemplate();
            } else if (completedArticle.status === 'failed') {
              setGenerationStatus('failed');
              setGenerating(false);
              // showError('초안 생성 실패', '생성 중 오류가 발생했습니다.');
              
              // Track article generation failure
              try {
                mp.track('Article_Generation_Failed', {
                  error: 'Generation failed during processing',
                  scraps_count: selectedScraps.length,
                  has_template: !!templateStructure,
                  timestamp: Date.now()
                });
              } catch (error) {
                console.error('Mixpanel tracking error:', error);
              }
            }
          } catch (pollingError) {
            // 폴링 타임아웃 또는 오류 시에도 사용자에게 알림
            console.error('폴링 오류:', pollingError);
            setGenerationStatus('failed');
            setGenerating(false);
            showError('상태 확인 실패', '생성 상태를 확인할 수 없습니다. 보관함을 직접 확인해주세요.');
          }
        })
        .catch(error => {
          setGenerationStatus('failed');
          setGenerating(false);
          showError('초안 생성 실패', error.message || '초안 생성 요청에 실패했습니다.');
          
          // Track article generation failure
          try {
            mp.track('Article_Generation_Failed', {
              error: error.message,
              scraps_count: selectedScraps.length,
              has_template: !!templateStructure,
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Mixpanel tracking error:', error);
          }
        });

    } catch (error: any) {
      setGenerationError(error.message || '초안 생성에 실패했습니다.');
      setGenerationStatus('failed');
      setGenerating(false);
      showError('요청 전송 실패', error.message || '요청을 보내는 중 오류가 발생했습니다.');
      
      // Track article generation failure
      try {
        mp.track('Article_Generation_Failed', {
          error: error.message,
          scraps_count: selectedScraps.length,
          has_template: !!templateStructure,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Mixpanel tracking error:', error);
      }
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
  }, [keyInsight]);

  useEffect(() => {
    const fetchScraps = async () => {
      const scraps: ScrapResponse[] = await scrapService.getScraps();
      setAllScraps(scraps);
      setAllTags(Array.from(new Set(scraps.flatMap(scrap => scrap.tags?.map(tag => tag.name) || []))).sort());
    };
    fetchScraps();
  }, []);

  const filteredScraps = useMemo(() => {
    if (selectedTags.length === 0) {
      return allScraps;
    }
    
    return allScraps.filter(scrap => {
      return selectedTags.some(selectedTag => 
        scrap.tags?.some(tag => tag.name === selectedTag)
      );
    });
  }, [allScraps, selectedTags]);

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

  return (
    <div className={styles.pageContainer}>
      <div className={`${styles.page} ${articleStyles.articleGeneratePageLayout}`}>
        <div className={articleStyles.scrollableContent}>
          <div className={articleStyles.articlePageHeader} ref={headerRef}>
            <div className={styles.headerControls}>
              <h1 className={styles.pageTitle}>뉴스레터 초안 생성</h1>
            </div>
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
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
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
              value={keyInsight}
              onChange={(e) => {
                setKeyInsight(e.target.value);
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
                  onClick={() => {
                    addSection();
                    // Track section addition
                    try {
                      mp.track('Section_Added', {
                        total_sections: templateStructure ? templateStructure.length + 1 : 1,
                        timestamp: Date.now()
                      });
                    } catch (error) {
                      console.error('Mixpanel tracking error:', error);
                    }
                  }}
                  className={articleStyles.sectionButton}
                >
                  <IoAdd size={14} />
                  섹션 추가
                </button>
                
                  <button 
                  onClick={() => {
                    toggleAnalysisConfirmModal();
                    // Track page analysis initiated
                    try {
                      mp.track('Page_Analysis_Modal_Opened', {
                        has_existing_template: !!templateStructure,
                        timestamp: Date.now()
                      });
                    } catch (error) {
                      console.error('Mixpanel tracking error:', error);
                    }
                  }}
                  disabled={isAnalyzing}
                  className={`${articleStyles.sectionButton} ${isAnalyzing ? articleStyles.sectionButtonDisabled : ''}`}
                >
                  <FaWandMagicSparkles size={14} />
                  {isAnalyzing ? '분석 중...' : '현재 페이지 섹션 분석'}
                </button>
              </div>
            </div>
            
            {!templateStructure && (
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
            {templateStructure && (
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
                    onClick={() => clearTemplate()}
                    className={articleStyles.clearButton}
                  >
                    × 초기화
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
                    {selectedWritingStyleId
                      ? (writingStyles.find((ws) => ws.id === selectedWritingStyleId)?.name || '문체 선택')
                      : '기본 뉴스레터 문체'}
                    {isStyleDropdownOpen ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}
                  </button>
                  <div className={`${tagSelectorStyles.tagFilterDropdown} ${isStyleDropdownOpen ? tagSelectorStyles.visible : ''}`}>
                    <div
                      className={`${tagSelectorStyles.tagOption} ${selectedWritingStyleId ? '' : tagSelectorStyles.selected}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setWritingStyleId(null);
                        setIsStyleDropdownOpen(false);
                      }}
                    >
                      기본 뉴스레터 문체
                    </div>
                    {writingStyles.map((ws) => (
                      <div
                        key={ws.id}
                        className={`${tagSelectorStyles.tagOption} ${selectedWritingStyleId === ws.id ? tagSelectorStyles.selected : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setWritingStyleId(ws.id);
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
              onClick={() => {
                toggleScrapModal();
                // Track scrap modal opened
                try {
                  mp.track('Scrap_Modal_Opened', {
                    current_scraps_count: selectedScraps.length,
                    timestamp: Date.now()
                  });
                } catch (error) {
                  console.error('Mixpanel tracking error:', error);
                }
              }}
            >
              <IoAdd size={16} />
              스크랩에서 자료 추가
            </button>
            
            <div className={articleStyles.referenceList}>
              {selectedScraps.map(scrap => (
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
                생성 요청 완료
              </>
            ) : generationStatus === 'failed' ? (
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
                <h2 className={articleStyles.modalTitle}>AI 페이지 분석</h2>
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
                    현재 페이지를 분석하여 섹션을 자동 생성합니다
                  </h3>
                  <p style={{ margin: '0 0 20px 0', color: '#666', lineHeight: '1.6', fontSize: '16px' }}>
                    AI가 현재 페이지의 내용을 분석하여 적절한 섹션 구성을 제안합니다.<br />
                    분석에는 약 10~30초 정도 소요됩니다.
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
                      ⚠️ <strong>주의:</strong> 기존에 작성한 섹션이 있는 것 같습니다. 
                      <br />
                      AI 분석을 진행하면 현재 섹션 구성은 사라집니다.
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
                      취소
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
        {isGenerating && (
          <div className={articleStyles.analysisModalOverlay} onClick={(e) => e.stopPropagation()}>
            <div className={articleStyles.analysisModal}>
              <div className={articleStyles.modalHeader}>
                <h2 className={articleStyles.modalTitle}>초안 생성 중</h2>
              </div>
              <div className={articleStyles.analysisModalContent}>
                <div style={{ textAlign: 'center', padding: '20px 0', position: 'relative' }}>
                  {generationStatus === 'completed' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: '#10b981',
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
                  ) : (
                    <div className={articleStyles.loadingSpinner} />
                  )}
                  <h3 style={{ margin: '12px 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
                    {generationStatus === 'completed' ? '초안 생성이 완료되었습니다!' : '초안 생성 요청을 처리 중입니다'}
                  </h3>
                  {generationStatus !== 'completed' && (
                    <p style={{ margin: '0 0 8px 0', color: '#666', lineHeight: '1.5', fontSize: '14px' }}>
                      입력한 내용에 따라 최소 1분 ~ 최대 4분이 소요됩니다.
                    </p>
                  )}
                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: '13px' }}>
                    경과 시간: {formatElapsed(elapsedSeconds)}
                  </div>
                </div>
                {generationStatus === 'completed' && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 12 }}>
                    <button
                      onClick={() => {
                        setGenerating(false);
                        setGenerationStatus('idle');
                        setGenerationError(null);
                        onNavigate('archive');
                      }}
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
                      닫기
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
                <h2 className={articleStyles.modalTitle}>스크랩 선택</h2>
                <button 
                  className={articleStyles.modalCloseButton}
                  onClick={() => toggleScrapModal()}
                >
                  <IoClose />
                </button>
              </div>

              <TagSelector
                availableTags={allTags}
                selectedTags={selectedTags}
                onTagSelect={(tag) => toggleTag(tag)}
                onTagRemove={(tag) => removeTag(tag)}
              />

              <div
                className={articleStyles.modalContent}
                style={{ maxHeight: `calc(100vh - ${scrapModalTop + 172}px)` }}
              >
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
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ArticleGeneratePage;
