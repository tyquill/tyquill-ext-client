import React, { useState } from 'react';
import { IoClipboard, IoDocument, IoSparkles, IoArchive, IoLogOut } from 'react-icons/io5';
import { IconType } from 'react-icons';
import { useAuth } from '../../hooks/useAuth';
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
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

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
          <span className={styles.userEmail}>{user?.email || 'Loading...'}</span>
          <button 
            className={styles.logoutButton}
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="로그아웃"
          >
            <IoLogOut size={16} />
          </button>
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