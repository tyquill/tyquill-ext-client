import React, { useState, useEffect } from 'react';
import { IoClipboard, IoDocument, IoSparkles, IoArchive } from 'react-icons/io5';
import { IconType } from 'react-icons';
import './Header.css';

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
    <div className="header">
      <div className="header-top">
        <div className="brand">
          <span className="brand-name">Tyquill</span>
        </div>
        <div className="user-info">
          <span className="user-email">{userEmail}</span>
        </div>
      </div>
      
      <div className="header-menu">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.key}
              className={`menu-item ${activeMenu === item.key ? 'active' : ''}`}
              onClick={() => onMenuClick(item.key)}
            >
              <span className="menu-icon">
                <IconComponent size={20} />
              </span>
              <span className="menu-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Header; 