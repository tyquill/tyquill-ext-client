import React, { useEffect } from 'react';
import { useContentScript } from './hooks/useContentScript';
import FloatingButton from '../components/content/FloatingButton/FloatingButton';

const App: React.FC = () => {
  const { isReady, currentSelection } = useContentScript();

  // Background Script로부터의 메시지 처리
  useEffect(() => {
    const handleMessage = (request: any, sender: any, sendResponse: any) => {
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
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Chrome Extension API에서는 removeListener가 지원되지 않으므로
    // cleanup 함수는 비워둠 (컴포넌트 언마운트 시 자동으로 정리됨)
    return () => {
      // chrome.runtime.onMessage.removeListener(handleMessage); // 이 메서드는 존재하지 않음
    };
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