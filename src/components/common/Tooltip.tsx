import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import styles from './Tooltip.module.css';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delay?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, delay = 300, side = 'top' }) => {
  const [isOpen, setIsOpen] = useState(false);
  let timeoutId: NodeJS.Timeout;

  const handleMouseEnter = () => {
    timeoutId = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutId);
    setIsOpen(false);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ display: 'inline-block' }}>
          {children}
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.tooltipContent} side={side} sideOffset={5}>
          {content}
          <Popover.Arrow className={styles.tooltipArrow} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default Tooltip;
