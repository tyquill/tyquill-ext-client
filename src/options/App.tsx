import React, { useState, useEffect, useCallback } from 'react';
import { IoInformationCircle, IoSettingsSharp } from 'react-icons/io5';
import styles from './App.module.css';
import GeneralTab from '../components/options/GeneralTab';
import AboutTab from '../components/options/AboutTab';

interface Settings {
  floatingButtonVisible: boolean;
}

type TabId = 'general' | 'about';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size: number }>;
}

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    floatingButtonVisible: true
  });

  const [activeTab, setActiveTab] = useState<TabId>('general');

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.sync.get(['tyquillSettings']);
        if (result.tyquillSettings) {
          setSettings(prev => ({ ...prev, ...result.tyquillSettings }));
        }
      } catch (error) {
        console.error('설정 로드 실패:', error);
      }
    };

    loadSettings();
  }, []);

  // 설정 저장
  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await chrome.storage.sync.set({ tyquillSettings: updatedSettings });
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }
  }, [settings]);

  const handleSettingChange = useCallback((key: keyof Settings, value: any) => {
    saveSettings({ [key]: value });
  }, [saveSettings]);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  const tabs: Tab[] = [
    { id: 'general', label: '일반', icon: IoSettingsSharp },
    { id: 'about', label: '정보', icon: IoInformationCircle }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralTab 
            settings={settings} 
            onSettingChange={handleSettingChange} 
          />
        );
      case 'about':
        return <AboutTab />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        {/* Sidebar */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h1 className={styles.logo}>Tyquill</h1>
            <p className={styles.subtitle}>뉴스레터 생성 도구 설정</p>
          </div>
          
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => handleTabChange(tab.id)}
              aria-label={`${tab.label} 탭으로 이동`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <main className={styles.content}>
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

export default App;