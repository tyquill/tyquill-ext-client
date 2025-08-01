import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClipboard, IoSparkles, IoArchive, IoLogOut } from 'react-icons/io5';
import { IconType } from 'react-icons';
import { useAuth } from '../../../hooks/useAuth';
import styles from './Header.module.css';

interface HeaderProps {}

interface MenuItem {
  key: string;
  label: string;
  icon: IconType;
}

const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      // console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Tyquill</span>
      </div>
      <div className={styles.userInfo}>
        <span className={styles.userEmail}>{user?.email || 'Loading...'}</span>
        <motion.button 
          className={styles.logoutButton}
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="로그아웃"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={isLoggingOut ? { rotate: 360 } : { rotate: 0 }}
          transition={isLoggingOut ? {
            rotate: { duration: 1, ease: "linear", repeat: Infinity }
          } : { duration: 0.2 }}
        >
          <IoLogOut size={16} />
        </motion.button>
      </div>
    </div>
  );
};

interface SidebarProps {
  activeMenu: string;
  onMenuClick: (menu: string) => void;
}

// Animation variants for the sidebar
const sidebarVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { 
    opacity: 1, 
    x: 0
  }
};

const sidebarTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  delayChildren: 0.1,
  staggerChildren: 0.1
};

const menuItemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  hover: { scale: 1.05, y: -2 },
  tap: { scale: 0.98 }
};

export const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onMenuClick }) => {
  const menuItems: MenuItem[] = [
    { key: 'scrap', label: '스크랩', icon: IoClipboard },
    { key: 'draft', label: '초안생성', icon: IoSparkles },
    { key: 'archive', label: '보관함', icon: IoArchive }
  ];

  return (
    <motion.div 
      className={styles.sidebar}
      variants={sidebarVariants}
      initial="initial"
      animate="animate"
      transition={sidebarTransition}
    >
      {menuItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeMenu === item.key;
        
        return (
          <motion.button
            key={item.key}
            className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
            variants={menuItemVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => onMenuClick(item.key)}
            layout
          >
            {/* Active state background indicator */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  className={styles.activeIndicator}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  layoutId="activeIndicator"
                />
              )}
            </AnimatePresence>
            
            <motion.span 
              className={styles.menuIcon}
              whileHover={{ scale: 1.1, rotate: 5, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
              animate={isActive ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <IconComponent size={20} />
            </motion.span>
            
            <motion.span 
              className={styles.menuLabel}
              animate={{
                color: isActive ? '#ffffff' : '#666666',
                fontWeight: isActive ? 600 : 500
              }}
              transition={{ duration: 0.2 }}
            >
              {item.label}
            </motion.span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default Header; 