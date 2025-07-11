import React, { useState, useEffect } from 'react';
import { IoClipboard, IoDocument, IoSparkles, IoArchive } from 'react-icons/io5';
import { IconType } from 'react-icons';
import styles from './Header.module.css';

interface HeaderProps {
  activeMenu: string;
  onMenuClick: (menu: string) => void;
}

interface MenuItem {
  key: string;
  label: string;
  icon: IconType;
}

const Header: React.FC<HeaderProps> = ({ activeMenu, onMenuClick }) => {
  const [userEmail, setUserEmail] = useState<string>('Loading...');

  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const userInfo = await chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' });
        if (userInfo.email) {
          setUserEmail(userInfo.email);
        } else {
          setUserEmail('Unknown User');
        }
      } catch (error) {
        console.error('Failed to get user email:', error);
        setUserEmail('Guest User');
      }
    };

    getUserEmail();
  }, []);

  const menuItems: MenuItem[] = [
    { key: 'scrap', label: '스크랩', icon: IoClipboard },
    { key: 'template', label: '템플릿', icon: IoDocument },
    { key: 'draft', label: '초안생성', icon: IoSparkles },
    { key: 'archive', label: '보관함', icon: IoArchive }
  ];

  return (
    <div className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Tyquill</span>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userEmail}>{userEmail}</span>
        </div>
      </div>
      
      <div className={styles.headerMenu}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.key}
              className={`${styles.menuItem} ${activeMenu === item.key ? styles.active : ''}`}
              onClick={() => onMenuClick(item.key)}
            >
              <span className={styles.menuIcon}>
                <IconComponent size={20} />
              </span>
              <span className={styles.menuLabel}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Header; 