import React, { useEffect, useState, useRef } from 'react';
import { browser } from 'wxt/browser';
import { useLanguageStore } from '../stores/languageStore';
import Sidebar from '../components/content/Sidebar/Sidebar';
import { authService } from '../services/auth.service';
import { WebClipper } from '../utils/webClipper';
import type { ExtensionMessage, MessageResponse } from '../types/messages';

const SidebarApp: React.FC = () => {
  const { initializeLanguage } = useLanguageStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarStateRef = useRef(false);

  // Debug logging for state changes
  useEffect(() => {
    console.log('📊 State changed - isSidebarOpen:', isSidebarOpen, 'ref:', sidebarStateRef.current);
  }, [isSidebarOpen]);

  // Helper function to update both state and ref atomically
  const updateSidebarState = (isOpen: boolean) => {
    console.log('🔄 updateSidebarState called with:', isOpen);
    console.log('🔄 Before update - ref:', sidebarStateRef.current, 'state:', isSidebarOpen);

    // Update ref first, then state
    sidebarStateRef.current = isOpen;
    setIsSidebarOpen(isOpen);

    console.log('🔄 After ref update - ref:', sidebarStateRef.current);

    // Dispatch state change event
    window.dispatchEvent(new CustomEvent('tyquill-sidebar-state-changed', {
      detail: { isOpen }
    }));

    // Notify background script
    const action = isOpen ? 'sidebarOpened' : 'sidebarClosed';
    browser.runtime.sendMessage({ action } as ExtensionMessage).catch(() => {
      // Ignore errors if background script is not available
      if (browser.runtime.lastError) {
        void browser.runtime.lastError;
      }
    });
  };

  // Function to close sidebar and notify background script
  const closeSidebar = () => {
    updateSidebarState(false);
  };

  // Function to open sidebar and notify background script
  const openSidebar = () => {
    updateSidebarState(true);
  };

  // 언어 설정 초기화
  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  // Background Script로부터의 메시지 처리
  useEffect(() => {
    const handleMessage = (request: any, _sender: any, sendResponse: any) => {
      console.log('Sidebar App 메시지 수신:', request);

      // PING 요청 처리 (content script 로드 확인용)
      if (request.type === 'PING') {
        sendResponse({ success: true, data: { loaded: true } });
        return true; // async response를 위해 true 반환
      }

      // 사이드바 열기/닫기 처리
      if (request.action === 'openSidebar') {
        openSidebar();
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'closeSidebar') {
        closeSidebar();
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'getSidebarState') {
        // useRef를 통해 최신 상태 참조 - ref는 동기적으로 업데이트되므로 신뢰할 수 있음
        const currentState = sidebarStateRef.current;
        console.log('📍 getSidebarState 요청 받음');
        console.log('📍 sidebarStateRef.current:', currentState, 'type:', typeof currentState);

        const response = { success: true, isOpen: currentState };
        console.log('📍 Sending response:', JSON.stringify(response));
        sendResponse(response);
        return true; // async response를 위해 true 반환
      }

      // 스크랩 요청 처리 (CLIP_PAGE 메시지)
      if (request.type === 'CLIP_PAGE') {
        console.log('📄 Sidebar App: CLIP_PAGE 요청 받음:', request);

        // 비동기 처리를 위해 즉시 true 반환
        (async () => {
          try {
            const clipper = new WebClipper(request.options || {});
            const result = await clipper.clipPage();

            if (sendResponse) {
              sendResponse({ success: true, data: result });
            }
          } catch (error) {
            console.error('📄 Sidebar App: 스크랩 실패:', error);
            if (sendResponse) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        })();

        return true; // 비동기 응답을 위해 true 반환
      }

      return false;
    };

    browser.runtime.onMessage.addListener(handleMessage);

    // Chrome Extension API에서는 removeListener가 지원되지 않으므로
    // cleanup 함수는 비워둠 (컴포넌트 언마운트 시 자동으로 정리됨)
    return () => {
      // browser.runtime.onMessage.removeListener(handleMessage); // 이 메서드는 존재하지 않음
    };
  }, []); // 빈 dependency 배열로 한 번만 등록

  // Handle sidebar open/close via custom events (for FloatingButton communication)
  useEffect(() => {
    const handleOpenSidebar = () => {
      openSidebar();
    };

    const handleCloseSidebar = () => {
      closeSidebar();
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
        onClose={closeSidebar}
      />
    </div>
  );
};

export default SidebarApp;