import React, { useState, useRef, useEffect } from 'react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authState, setAuthState] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

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

  const getAvatarText = (email: string | undefined) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  const getAvatarColor = (email: string | undefined) => {
    if (!email) return '#6b7280';
    
    // Generate a consistent color based on email
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Load auth state from chrome storage
  useEffect(() => {
    const loadAuthState = () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['authState'], (result) => {
          if (result.authState) {
            setAuthState(result.authState);
          }
        });
      }
    };
    
    loadAuthState();
  }, []);

  // Close menu when clicking outside or handle hover behavior
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        avatarRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMouseEnter = () => {
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className={styles.header}>
      <div className={styles.spacer}></div>
      
      <div 
        className={styles.userSection}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          ref={avatarRef}
          className={styles.avatarContainer}
          whileHover={{ scale: 1.05 }}
          title={user?.email || 'User menu'}
        >
          {authState?.user?.avatarUrl ? (
            <img 
              src={authState.user.avatarUrl} 
              alt="Profile" 
              className={styles.avatarImage}
            />
          ) : (
            <div 
              className={styles.avatarFallback}
              style={{ backgroundColor: getAvatarColor(user?.email) }}
            >
              {getAvatarText(user?.email)}
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              ref={menuRef}
              className={styles.userMenu}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.menuHeader}>
                {authState?.user?.avatarUrl ? (
                  <img 
                    src={authState.user.avatarUrl} 
                    alt="Profile" 
                    className={styles.menuAvatarImage}
                  />
                ) : (
                  <div 
                    className={styles.menuAvatar}
                    style={{ backgroundColor: getAvatarColor(user?.email) }}
                  >
                    {getAvatarText(user?.email)}
                  </div>
                )}
                <div className={styles.userDetails}>
                  <span className={styles.userEmail}>
                    {user?.email || 'Loading...'}
                  </span>
                </div>
              </div>
              
              <div className={styles.menuDivider}></div>
              
              <motion.button
                className={styles.menuItem}
                onClick={handleLogout}
                disabled={isLoggingOut}
                whileHover={{ backgroundColor: '#f3f4f6' }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.span
                  className={styles.menuItemIcon}
                  animate={isLoggingOut ? { rotate: 360 } : { rotate: 0 }}
                  transition={isLoggingOut ? {
                    rotate: { duration: 1, ease: "linear", repeat: Infinity }
                  } : { duration: 0.2 }}
                >
                  <IoLogOut size={16} />
                </motion.span>
                <span className={styles.menuItemText}>
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
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