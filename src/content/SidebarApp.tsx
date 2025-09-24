import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { useLanguageStore } from '../stores/languageStore';
import Sidebar from '../components/content/Sidebar/Sidebar';
import { authService } from '../services/auth.service';

const SidebarApp: React.FC = () => {
  const { initializeLanguage } = useLanguageStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 언어 설정 초기화
  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  // Background Script로부터의 메시지 처리
  useEffect(() => {
    const handleMessage = async (request: any, _sender: any, sendResponse: any) => {
      // console.log('Sidebar App 메시지 수신:', request);

      // PING 요청 처리 (content script 로드 확인용)
      if (request.type === 'PING') {
        if (sendResponse) {
          sendResponse({ success: true, loaded: true });
        }
        return;
      }

      // 사이드바 열기/닫기 처리
      if (request.action === 'openSidebar') {
        setIsSidebarOpen(true);
        // State change event 발송
        window.dispatchEvent(new CustomEvent('tyquill-sidebar-state-changed', {
          detail: { isOpen: true }
        }));
        if (sendResponse) {
          sendResponse({ success: true });
        }
      }

      if (request.action === 'closeSidebar') {
        setIsSidebarOpen(false);
        // State change event 발송
        window.dispatchEvent(new CustomEvent('tyquill-sidebar-state-changed', {
          detail: { isOpen: false }
        }));
        if (sendResponse) {
          sendResponse({ success: true });
        }
      }

      if (request.action === 'getSidebarState') {
        if (sendResponse) {
          sendResponse({ success: true, isOpen: isSidebarOpen });
        }
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    // Chrome Extension API에서는 removeListener가 지원되지 않으므로
    // cleanup 함수는 비워둠 (컴포넌트 언마운트 시 자동으로 정리됨)
    return () => {
      // browser.runtime.onMessage.removeListener(handleMessage); // 이 메서드는 존재하지 않음
    };
  }, []);

  // Handle sidebar open/close via custom events (for FloatingButton communication)
  useEffect(() => {
    const handleOpenSidebar = () => {
      setIsSidebarOpen(true);
    };

    const handleCloseSidebar = () => {
      setIsSidebarOpen(false);
    };

    window.addEventListener('tyquill-open-sidebar', handleOpenSidebar);
    window.addEventListener('tyquill-close-sidebar', handleCloseSidebar);

    return () => {
      window.removeEventListener('tyquill-open-sidebar', handleOpenSidebar);
      window.removeEventListener('tyquill-close-sidebar', handleCloseSidebar);
    };
  }, []);

  // Chrome storage 변경 감지 (언어 설정 동기화)
  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      if (changes['tyquill-language-preference']) {
        // 언어 설정이 변경되면 sidebar app에서도 동기화
        initializeLanguage();
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [initializeLanguage]);

  // 웹 클라이언트로부터 인증 정보 요청 및 로그아웃 알림 처리
  useEffect(() => {
    const handleWebClientMessage = async (event: MessageEvent) => {
      // 웹 클라이언트로부터 인증 요청인지 확인
      if ((event.origin === 'http://localhost:5173' || event.origin === 'https://app.tyquill.ai') &&
          typeof event.data === 'object' && event.data !== null &&
          event.data.type === 'TYQUILL_GET_AUTH_REQUEST' &&
          event.data.source === 'tyquill-web-client') {

        try {
          // Background script에 인증 정보 요청
          const response = await browser.runtime.sendMessage({
            action: 'getAuthState'
          });

          // 웹 클라이언트에 응답
          window.postMessage({
            type: 'TYQUILL_AUTH_RESPONSE',
            source: 'tyquill-extension',
            authState: response?.authState || null
          }, event.origin);
        } catch (error) {
          console.error('Failed to get auth state from extension:', error);
          // 에러 발생 시에도 응답
          window.postMessage({
            type: 'TYQUILL_AUTH_RESPONSE',
            source: 'tyquill-extension',
            authState: null
          }, event.origin);
        }
      }

      // 웹 클라이언트로부터 로그아웃 알림 처리
      if ((event.origin === 'http://localhost:5173' || event.origin === 'https://app.tyquill.ai') &&
          typeof event.data === 'object' && event.data !== null &&
          event.data.type === 'TYQUILL_LOGOUT_NOTIFICATION' &&
          event.data.source === 'tyquill-web-client') {

        console.log('📤 Received logout notification from web client');

        try {
          // Background script에 로그아웃 요청
          await browser.runtime.sendMessage({
            action: 'logoutFromWebClient'
          });

          console.log('✅ Extension logout triggered from web client');
        } catch (error) {
          console.error('Failed to trigger extension logout:', error);
        }
      }
    };

    window.addEventListener('message', handleWebClientMessage);

    return () => {
      window.removeEventListener('message', handleWebClientMessage);
    };
  }, []);

  return (
    <div id="tyquill-sidebar-app" className="tyquill-sidebar-root">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
};

export default SidebarApp;