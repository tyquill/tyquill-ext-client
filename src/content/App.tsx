import React, { useEffect } from 'react';
import { useContentScript } from './hooks/useContentScript';
import FloatingButton from '../components/content/FloatingButton/FloatingButton';

const App: React.FC = () => {
  const { isReady, currentSelection } = useContentScript();

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