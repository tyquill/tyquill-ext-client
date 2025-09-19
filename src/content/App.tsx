import React, { useEffect } from 'react';
import { useContentScript } from './hooks/useContentScript';
import { browser } from 'wxt/browser';
import { useLanguageStore } from '../stores/languageStore';
import FloatingButton from '../components/content/FloatingButton/FloatingButton';
import { WebClipper } from '../utils/webClipper';
import { initLinkedInInjector } from '../utils/linkedinInjector';
import { clipAndScrapCurrentPage } from '../utils/scrapHelper';
import { initThreadsInjector } from '../utils/threadsInjector';
import { initYouTubeInjector } from '../utils/youtubeInjector';
import { initXInjector } from '../utils/xInjector';

const App: React.FC = () => {
  const { isReady, currentSelection } = useContentScript();
  const { initializeLanguage } = useLanguageStore();
  const isThreads = (typeof window !== 'undefined') && (
    window.location.hostname.includes('threads.net') ||
    window.location.hostname.includes('threads.com') ||
    window.location.href.startsWith('https://www.instagram.com/threads/')
  );
  const isYouTube = (typeof window !== 'undefined') && (
    window.location.hostname.includes('youtube.com') ||
    window.location.hostname.includes('m.youtube.com')
  );
  const isX = (typeof window !== 'undefined') && (
    window.location.hostname.includes('x.com') ||
    window.location.hostname.includes('twitter.com')
  );

  // 언어 설정 초기화
  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  // Background Script로부터의 메시지 처리
  useEffect(() => {
    const handleMessage = async (request: any, _sender: any, sendResponse: any) => {
      // console.log('Content Script 메시지 수신:', request);

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

      // 스크랩 요청 처리
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
    if (!window.location.hostname.includes('linkedin.com')) return;

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
  }, []);

  // Threads 피드 카드에 Tyquill 버튼 주입
  useEffect(() => {
    if (!isThreads) return;
    let cleanup: (() => void) | undefined;
    try {
      console.log('[Tyquill][App] initThreadsInjector() start');
      cleanup = initThreadsInjector();
      console.log('[Tyquill][App] initThreadsInjector() done');
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

  return (
    <div id="tyquill-content-root">
      <FloatingButton />
      
      {/* 향후 확장을 위한 추가 컴포넌트들을 위한 컨테이너 */}
      <div id="tyquill-content-components" style={{ display: 'none' }}>
        {/* 여기에 추가적인 content-script UI 컴포넌트들이 들어갈 수 있습니다 */}
      </div>
    </div>
  );
};

export default App;