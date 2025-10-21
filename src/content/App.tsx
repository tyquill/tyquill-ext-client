import React, { useEffect, useState, useMemo } from 'react';
import { browser } from 'wxt/browser';
import { useLanguageStore } from '../stores/languageStore';
import { useI18n } from '../hooks/useI18n';
import FloatingButton from '../components/content/FloatingButton/FloatingButton';
import ScrapToast from '../components/content/ScrapToast/ScrapToast';
import { WebClipper } from '../utils/webClipper';
import { initLinkedInInjector } from '../utils/linkedinInjector';
import { clipAndScrapCurrentPage } from '../utils/scrapHelper';
import { initThreadsInjector } from '../utils/threadsInjector';
import { initYouTubeInjector } from '../utils/youtubeInjector';
import { initXInjector } from '../utils/xInjector';
import { initRedditInjector } from '../utils/redditInjector';

interface ScrapData {
  title: string;
  url?: string;
}

const App: React.FC = () => {
  const { initializeLanguage } = useLanguageStore();
  const { t } = useI18n();
  const [showScrapToast, setShowScrapToast] = useState(false);
  const [scrapData, setScrapData] = useState<ScrapData | null>(null);
  const [currentUrl, setCurrentUrl] = useState(window.location.href);

  // URL 변경 감지
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentUrl(window.location.href);
    };

    // SPA 네비게이션 감지
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('pushstate', handleUrlChange);
    window.addEventListener('replacestate', handleUrlChange);

    // MutationObserver로 URL 변경 감지 (SPA 보조)
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        handleUrlChange();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('pushstate', handleUrlChange);
      window.removeEventListener('replacestate', handleUrlChange);
      observer.disconnect();
    };
  }, [currentUrl]);

  const isThreads = useMemo(() => (typeof window !== 'undefined') && (
    window.location.hostname.includes('threads.net') ||
    window.location.hostname.includes('threads.com') ||
    window.location.href.startsWith('https://www.instagram.com/threads/')
  ), [currentUrl]);

  const isYouTube = useMemo(() => (typeof window !== 'undefined') && (
    window.location.hostname.includes('youtube.com') ||
    window.location.hostname.includes('m.youtube.com')
  ), [currentUrl]);

  const isX = useMemo(() => (typeof window !== 'undefined') && (
    window.location.hostname.includes('x.com') ||
    window.location.hostname.includes('twitter.com')
  ), [currentUrl]);

  const isReddit = useMemo(() => (typeof window !== 'undefined') && (
    window.location.hostname.includes('reddit.com') ||
    window.location.hostname.includes('redd.it')
  ), [currentUrl]);

  const isLinkedIn = useMemo(() => (typeof window !== 'undefined') && window.location.hostname.includes('linkedin.com'), [currentUrl]);

  // 언어 설정 초기화
  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  // Background Script로부터의 메시지 처리 (FloatingButton 관련만)
  useEffect(() => {
    const handleMessage = async (request: any, _sender: any, sendResponse: any) => {
      // console.log('Main App 메시지 수신:', request);

      // PING 요청 처리 (content script 로드 확인용)
      if (request.type === 'PING') {
        if (sendResponse) {
          sendResponse({ success: true, loaded: true });
        }
        return;
      }

      if (request.type === 'SETTINGS_CHANGED') {
        // console.log('설정 변경 감지:', request.settings);

        // 설정 변경 시 CustomEvent를 통해 FloatingButton에 직접 알림
        window.dispatchEvent(new CustomEvent('tyquill-settings-changed', {
          detail: request.settings
        }));

        // 응답 보내기 (선택사항)
        if (sendResponse) {
          sendResponse({ success: true });
        }
      }

      // 인증 상태 변경 처리
      if (request.type === 'AUTH_STATE_CHANGED') {
        // console.log('Auth state changed in content script:', request.isAuthenticated);
        // FloatingButton과 다른 컴포넌트들에 인증 상태 변경 알림
        window.dispatchEvent(new CustomEvent('tyquill-auth-changed', {
          detail: { isAuthenticated: request.isAuthenticated }
        }));

        if (sendResponse) {
          sendResponse({ success: true });
        }
      }

      // 스크랩 요청 처리 (새 메시지 포맷)
      if (request.type === 'CLIP_PAGE') {
        try {
          const clipper = new WebClipper(request.options || {});
          const result = await clipper.clipPage();

          if (sendResponse) {
            sendResponse({ success: true, data: result });
          }
        } catch (error) {
          console.error('스크랩 실패:', error);
          if (sendResponse) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        return true; // 비동기 응답을 위해 true 반환
      }

      // 스크랩 요청 처리 (레거시)
      if (request.action === 'scrapePage') {
        try {
          const clipper = new WebClipper(request.options || {});
          const result = await clipper.clipPage();

          if (sendResponse) {
            sendResponse(result);
          }
        } catch (error) {
          console.error('스크랩 실패:', error);
          if (sendResponse) {
            sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        return true; // 비동기 응답을 위해 true 반환
      }

      // Ping 요청 처리 (Content Script 활성 확인용)
      if (request.type === 'PING') {
        if (sendResponse) {
          sendResponse({ success: true });
        }
        return true;
      }

      // 스크랩 완료 알림 처리
      if (request.action === 'scrapCreated') {
        try {
          const { data } = request;
          if (data) {
            setScrapData({
              title: data.title || data.url || t('page'),
              url: data.url,
            });
            setShowScrapToast(true);
          }
          if (sendResponse) {
            sendResponse({ success: true });
          }
        } catch (error) {
          console.error('❌ 스크랩 알림 표시 실패:', error);
        }
        return true;
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    // Chrome Extension API에서는 removeListener가 지원되지 않으므로
    // cleanup 함수는 비워둠 (컴포넌트 언마운트 시 자동으로 정리됨)
    return () => {
      // browser.runtime.onMessage.removeListener(handleMessage); // 이 메서드는 존재하지 않음
    };
  }, []);

  // Chrome storage 변경 감지 (언어 설정 동기화)
  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      if (changes['tyquill-language-preference']) {
        // 언어 설정이 변경되면 content script에서도 동기화
        initializeLanguage();
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [initializeLanguage]);

  // Web client -> Extension: 설치 감지 프로토콜 처리 (TYQUILL_GET_AUTH_REQUEST)
  useEffect(() => {
    const handleAuthHandshake = async (event: MessageEvent) => {
      // Only accept messages from our SaaS domains: localhost or *.tyquill.ai
      try {
        const originHost = new URL(event.origin).hostname;
        const isAllowed = originHost === 'localhost' || originHost.endsWith('tyquill.ai');
        if (!isAllowed) return;
      } catch { return; }

      const data = event.data as any;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'TYQUILL_GET_AUTH_REQUEST' && data.source === 'tyquill-web-client') {
        try {
          const response = await browser.runtime.sendMessage({ action: 'getAuthState' });
          window.postMessage({
            type: 'TYQUILL_AUTH_RESPONSE',
            source: 'tyquill-extension',
            authState: response?.authState || null,
          }, event.origin);
        } catch (_error) {
          window.postMessage({
            type: 'TYQUILL_AUTH_RESPONSE',
            source: 'tyquill-extension',
            authState: null,
          }, event.origin);
        }
      }
    };

    window.addEventListener('message', handleAuthHandshake);
    return () => window.removeEventListener('message', handleAuthHandshake);
  }, []);

  // Web client -> Extension: 사이드패널 열기 브리지 (설치 감지 ACK 포함)
  useEffect(() => {
    const handleWebClientOpenRequest = async (event: MessageEvent) => {
      // Only accept messages from our SaaS domains: localhost or *.tyquill.ai
      try {
        const originHost = new URL(event.origin).hostname;
        const isAllowed = originHost === 'localhost' || originHost.endsWith('tyquill.ai');
        if (!isAllowed) return;
      } catch { return; }
      const data = event.data as any;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'TYQUILL_OPEN_EXTENSION' && data.source === 'tyquill-web-client') {
        try {
          // 설치 감지용 ACK 반환
          window.postMessage({
            type: 'TYQUILL_EXTENSION_ACK',
            source: 'tyquill-extension',
          }, event.origin);
        } catch {}

        try {
          // 기존 플로팅 버튼과 동일 경로: background에 사이드패널 열기 요청
          await browser.runtime.sendMessage({ action: 'openSidePanel' });
        } catch {}
      }
    };

    window.addEventListener('message', handleWebClientOpenRequest);
    return () => window.removeEventListener('message', handleWebClientOpenRequest);
  }, []);


  // DOM이 준비되면 FloatingButton 표시
  useEffect(() => {
    const showFloatingButton = () => {
      // FloatingButton은 컴포넌트 내에서 자동으로 렌더링됨
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showFloatingButton);
    } else {
      showFloatingButton();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', showFloatingButton);
    };
  }, []);

  // LinkedIn 피드 컨트롤 메뉴에 Tyquill 버튼 주입 (기본 동작만 유지)
  useEffect(() => {
    if (!isLinkedIn) return;

    const cleanup = initLinkedInInjector();

    const handleClick = async () => {
      try {
        await clipAndScrapCurrentPage();
      } catch (e) {}
    };
    window.addEventListener('tyquill:li-button-click', handleClick as EventListener);

    return () => {
      cleanup();
      window.removeEventListener('tyquill:li-button-click', handleClick as EventListener);
    };
  }, [isLinkedIn]);

  // Threads 피드 카드에 Tyquill 버튼 주입
  useEffect(() => {
    if (!isThreads) return;
    let cleanup: (() => void) | undefined;
    try {
      // console.log('[Tyquill][App] initThreadsInjector() start');
      cleanup = initThreadsInjector();
      // console.log('[Tyquill][App] initThreadsInjector() done');
    } catch {}
    return () => {
      try { cleanup && cleanup(); } catch {}
    };
  }, [isThreads]);

  // X(Twitter) 피드 카드에 Tyquill 아이콘 주입
  useEffect(() => {
    if (!isX) return;
    let cleanup: (() => void) | undefined;
    try {
      cleanup = initXInjector();
    } catch {}
    return () => {
      try { cleanup && cleanup(); } catch {}
    };
  }, [isX]);

  // YouTube 동영상 페이지에 Tyquill 버튼 주입 (owner/subscribe 인접)
  useEffect(() => {
    if (!isYouTube) return;
    let cleanup: (() => void) | undefined;
    try {
      cleanup = initYouTubeInjector();
    } catch {}

    const handleClick = async () => {
      try {
        await clipAndScrapCurrentPage();
      } catch (e) {}
    };
    window.addEventListener('tyquill:yt-button-click', handleClick as EventListener);

    return () => {
      try { cleanup && cleanup(); } catch {}
      window.removeEventListener('tyquill:yt-button-click', handleClick as EventListener);
    };
  }, [isYouTube]);

  // Reddit 포스트 카드에 Tyquill 아이콘 주입
  useEffect(() => {
    if (!isReddit) return;
    let cleanup: (() => void) | undefined;
    try {
      cleanup = initRedditInjector();
    } catch {}
    return () => {
      try { cleanup && cleanup(); } catch {}
    };
  }, [isReddit]);

  return (
    <div id="tyquill-main-app" className="tyquill-main-root">
      <FloatingButton />

      {/* 스크랩 완료 토스트 알림 */}
      {showScrapToast && scrapData && (
        <ScrapToast
          title={scrapData.title}
          url={scrapData.url}
          onClose={() => {
            setShowScrapToast(false);
            setScrapData(null);
          }}
        />
      )}

      {/* 향후 확장을 위한 추가 컴포넌트들을 위한 컨테이너 */}
      <div id="tyquill-main-components" style={{ display: 'none' }}>
        {/* 여기에 추가적인 main app UI 컴포넌트들이 들어갈 수 있습니다 */}
      </div>
    </div>
  );
};

export default App;