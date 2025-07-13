import React, { useState, useRef, useEffect } from 'react';
import { IoAdd, IoTrash, IoChevronDown, IoClose } from 'react-icons/io5';
import styles from './PageStyles.module.css';

interface Scrap {
  id: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  source: string;
  url: string;
}

const ScrapPage: React.FC = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver>();
  const lastScrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const allTags = [
    'AI', 'Technology', 'Trends', 'Automation', 'Productivity',
    'Chrome', 'Development', 'Web', 'Design', 'UI/UX',
    'System', 'Frontend', 'Architecture', 'React', 'Performance',
    'JavaScript', 'TypeScript', 'Accessibility', 'Standards'
  ];

  const scraps: Scrap[] = [
    {
      id: 1,
      title: '2025년 AI 기술 트렌드와 전망',
      content: 'ChatGPT와 GPT-4의 등장으로 AI 산업이 급속도로 발전하고 있으며, 생성형 AI를 활용한 새로운 비즈니스 모델들이 등장하고 있습니다...',
      tags: ['AI', 'Technology', 'Trends'],
      createdAt: '2024-01-15',
      source: 'TechCrunch',
      url: 'https://techcrunch.com/2024/01/15/ai-trends-2025'
    },
    {
      id: 2,
      title: '효율적인 업무 자동화 방법',
      content: '반복적인 업무를 자동화하여 생산성을 높이는 다양한 도구와 방법론을 소개합니다...',
      tags: ['Automation', 'Productivity'],
      createdAt: '2024-01-14',
      source: 'Medium',
      url: 'https://medium.com/productivity/automation-methods'
    },
    {
      id: 3,
      title: '웹 개발자를 위한 Chrome Extension 가이드',
      content: 'Chrome Extension 개발의 기초부터 고급 기능까지 상세히 다루는 가이드입니다. Manifest V3 업데이트와 보안 관련 주요 변경사항을 포함합니다...',
      tags: ['Chrome', 'Development', 'Web'],
      createdAt: '2024-01-13',
      source: 'Dev.to',
      url: 'https://dev.to/chrome-extension-guide-2024'
    },
    {
      id: 4,
      title: '디자인 시스템 구축 전략',
      content: '효율적인 디자인 시스템 구축을 위한 전략과 실제 사례를 소개합니다. 컴포넌트 설계부터 문서화까지 전반적인 프로세스를 다룹니다...',
      tags: ['Design', 'UI/UX', 'System'],
      createdAt: '2024-01-12',
      source: 'Smashing Magazine',
      url: 'https://smashingmagazine.com/design-system-strategy'
    },
    {
      id: 5,
      title: '마이크로 프론트엔드 아키텍처의 이해',
      content: '대규모 프론트엔드 애플리케이션을 효과적으로 관리하기 위한 마이크로 프론트엔드 아키텍처의 개념과 구현 방법을 설명합니다...',
      tags: ['Frontend', 'Architecture', 'Web'],
      createdAt: '2024-01-11',
      source: 'InfoQ',
      url: 'https://infoq.com/micro-frontend-architecture'
    },
    {
      id: 6,
      title: 'React 성능 최적화 기법',
      content: 'React 애플리케이션의 성능을 극대화하기 위한 다양한 최적화 기법을 소개합니다. 메모이제이션, 코드 스플리팅, 가상화 등을 다룹니다...',
      tags: ['React', 'Performance', 'JavaScript'],
      createdAt: '2024-01-10',
      source: 'React Blog',
      url: 'https://react.dev/blog/performance-optimization'
    },
    {
      id: 7,
      title: 'TypeScript 5.0 새로운 기능 소개',
      content: 'TypeScript 5.0 버전에서 추가된 새로운 기능과 개선사항을 상세히 설명합니다. 데코레이터, 모듈 시스템 개선 등을 포함합니다...',
      tags: ['TypeScript', 'JavaScript', 'Development'],
      createdAt: '2024-01-09',
      source: 'TypeScript Blog',
      url: 'https://devblogs.microsoft.com/typescript/typescript-5-0'
    },
    {
      id: 8,
      title: '웹 접근성 가이드라인 2024',
      content: '최신 웹 접근성 표준과 가이드라인을 소개합니다. WCAG 3.0의 주요 변경사항과 실제 구현 방법을 다룹니다...',
      tags: ['Accessibility', 'Web', 'Standards'],
      createdAt: '2024-01-08',
      source: 'A11Y Project',
      url: 'https://a11yproject.com/guidelines-2024'
    }
  ];

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          setLoading(true);
          // 이전 타임아웃이 있다면 클리어
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          // 새로운 타임아웃 설정
          loadingTimeoutRef.current = setTimeout(() => {
            // TODO: Implement actual data fetching
            setLoading(false);
          }, 1000);
        }
      },
      { threshold: 0.5 }
    );

    if (lastScrapRef.current) {
      observer.observe(lastScrapRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // 컴포넌트 언마운트 시 타임아웃 클리어
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, hasMore]);

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return '';
    }
  };

  const ScrapItem: React.FC<{ scrap: Scrap; onDelete: () => void }> = ({ scrap, onDelete }) => {
    return (
      <div className={styles.contentItem} data-url={scrap.url}>
        <div className={styles.contentHeader}>
          <a href={scrap.url} target="_blank" rel="noopener noreferrer" className={styles.contentTitle}>
            {scrap.title}
          </a>
          <button onClick={onDelete} className={styles.deleteButton}>
            <IoTrash />
          </button>
        </div>
        <div className={styles.contentDescription}>{scrap.content}</div>
        <div className={styles.contentFooter}>
          <div className={styles.tags}>
            {scrap.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>#{tag}</span>
            ))}
          </div>
          <div className={styles.contentDate}>{scrap.createdAt}</div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.fixedContent}>
        <div className={styles.tagFilterContainer} ref={dropdownRef}>
          <button
            className={styles.tagFilterButton}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            태그 선택
            <IoChevronDown size={16} />
          </button>
          
          {isDropdownOpen && (
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
        
        <div className={styles.addButtonContainer}>
          <button className={styles.addButton}>
            <IoAdd size={16} />
            스크랩 추가
          </button>
        </div>
      </div>

      <div className={styles.scrollableContent}>
        <div className={styles.scrapList}>
          {scraps.map((scrap, index) => (
            <ScrapItem
              key={scrap.id} 
              scrap={scrap} 
              onDelete={() => {
                // TODO: Implement actual deletion logic
                console.log('Delete scrap:', scrap.id);
              }}
            />
          ))}
        </div>
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingIndicator}>
              Loading...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrapPage; 