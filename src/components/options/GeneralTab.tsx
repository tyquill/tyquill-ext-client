import React from 'react';
import styles from '../../options/App.module.css';

interface GeneralTabProps {
  settings: {
    floatingButtonVisible: boolean;
  };
  onSettingChange: (key: keyof GeneralTabProps['settings'], value: any) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ settings, onSettingChange }) => {
  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>일반 설정</h2>
      
      <div className={styles.settingGroup}>
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingLabel}>플로팅 버튼 표시</h3>
            <p className={styles.settingDescription}>
              웹페이지에서 Tyquill 플로팅 버튼의 표시 여부를 설정합니다
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.floatingButtonVisible}
              onChange={(e) => onSettingChange('floatingButtonVisible', e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default GeneralTab; 