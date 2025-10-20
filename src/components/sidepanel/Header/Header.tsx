import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSparkles, IoArchive } from 'react-icons/io5';
import { FaBookmark } from 'react-icons/fa6';
import { IconType } from 'react-icons';
import { useI18n } from '../../../hooks/useI18n';
import styles from './Header.module.css';

interface HeaderProps {}

interface MenuItem {
  key: string;
  label: string;
  icon: IconType;
}

const Header: React.FC<HeaderProps> = () => {




  return (
    <div className={styles.header}>
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
  const { t } = useI18n();
  const menuItems: MenuItem[] = [
    { key: 'content', label: t('menu_content'), icon: FaBookmark },
    { key: 'draft', label: t('menu_draft'), icon: IoSparkles },
  ];


  return (
    <motion.div 
      className={styles.sidebar}
      variants={sidebarVariants}
      initial="initial"
      animate="animate"
      transition={sidebarTransition}
    >
      {/* 메인 메뉴 아이템들 */}
      <div className={styles.menuItemsContainer}>
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
                <IconComponent size={item.key === 'style-management' ? 26 : 20} />
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
      </div>
    </motion.div>
  );
};

export default Header; 