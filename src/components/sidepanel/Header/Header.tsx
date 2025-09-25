import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSparkles, IoArchive } from 'react-icons/io5';
import { FaBookmark } from 'react-icons/fa6';
import { IconBaseProps } from 'react-icons';

function TablerMasksTheater({ size = 20, ...props }: IconBaseProps) {
  const iconSize = typeof size === 'string' ? parseInt(size) : size || 20;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M13.192 9h6.616a2 2 0 0 1 1.992 2.183l-.567 6.182A4 4 0 0 1 17.25 21h-1.5a4 4 0 0 1-3.983-3.635l-.567-6.182A2 2 0 0 1 13.192 9M15 13h.01M18 13h.01"></path>
        <path d="M15 16.5q1.5 1 3 0m-9.368-.518A4 4 0 0 1 8.25 16h-1.5a4 4 0 0 1-3.983-3.635L2.2 6.183A2 2 0 0 1 4.192 4h6.616a2 2 0 0 1 2 2M6 8h.01M9 8h.01"></path>
        <path d="M6 12q1.146-.765 2.291-.36"></path>
      </g>
    </svg>
  )
}
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
    { key: 'scrap', label: t('menu_scrap'), icon: FaBookmark },
    { key: 'style-management', label: t('menu_styleManagement'), icon: TablerMasksTheater },
    { key: 'draft', label: t('menu_draft'), icon: IoSparkles },
    { key: 'archive', label: t('menu_archive'), icon: IoArchive },
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