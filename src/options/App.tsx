import React, { useState, useEffect, useCallback } from 'react';
import { IoInformationCircle, IoSettingsSharp } from 'react-icons/io5';
import { browser } from 'wxt/browser';
import { useI18n } from '../hooks/useI18n';
import { useLanguageStore } from '../stores/languageStore';
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
  const { t } = useI18n();
  const { initializeLanguage } = useLanguageStore();
  const [settings, setSettings] = useState<Settings>({
    floatingButtonVisible: true
  });

  const [activeTab, setActiveTab] = useState<TabId>('general');

  // 언어 설정 초기화
  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  // Chrome storage 변경 감지 (언어 설정 동기화)
  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      if (changes['tyquill-language-preference']) {
        // 언어 설정이 변경되면 options에서도 동기화
        initializeLanguage();
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [initializeLanguage]);

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await browser.storage.sync.get(['tyquillSettings']);
        if (result.tyquillSettings) {
          setSettings(prev => ({ ...prev, ...result.tyquillSettings }));
        }
      } catch (error) {
        console.error(t('options_settingsLoadError'), error);
      }
    };

    loadSettings();
  }, []);

  // 설정 저장
  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await browser.storage.sync.set({ tyquillSettings: updatedSettings });
    } catch (error) {
      console.error(t('options_settingsSaveError'), error);
    }
  }, [settings]);

  const handleSettingChange = useCallback((key: keyof Settings, value: any) => {
    saveSettings({ [key]: value });
  }, [saveSettings]);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  const tabs: Tab[] = [
    { id: 'general', label: t('options_generalTab'), icon: IoSettingsSharp },
    { id: 'about', label: t('options_aboutTab'), icon: IoInformationCircle }
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
            <p className={styles.subtitle}>{t('options_subtitle')}</p>
          </div>
          
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => handleTabChange(tab.id)}
              aria-label={tab.id === 'general' ? t('options_generalTabLabel') : t('options_aboutTabLabel')}
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