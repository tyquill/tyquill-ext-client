import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import styles from './Tooltip.module.css';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delay?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, delay = 0, side = 'top' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inject global styles for Radix UI tooltip
  useEffect(() => {
    const styleId = 'tyquill-tooltip-global-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        [data-radix-popper-content-wrapper] {
          z-index: 2147483647 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(true);
      }, delay);
    } else {
      setIsOpen(true);
    }
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  }, []);

  // Don't render tooltip if content is empty
  if (!content) {
    return <>{children}</>;
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ display: 'inline-block' }}
        >
          {children}
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.tooltipContent}
          side={side}
          sideOffset={8}
          avoidCollisions={true}
          sticky="always"
          style={{
            backgroundColor: '#2c2c2c',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: 1.4,
            zIndex: 2147483647,
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.25)',
            maxWidth: '250px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            pointerEvents: 'none',
            border: 'none',
            outline: 'none'
          }}
        >
          {content}
          <Popover.Arrow
            className={styles.tooltipArrow}
            style={{ fill: '#2c2c2c' }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default Tooltip;
