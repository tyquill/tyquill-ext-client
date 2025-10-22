import React from 'react';
import { motion } from 'framer-motion';
import { IconoirSelectFace3d } from './IconoirSelectFace3d';

interface AnimatedContent3DProps {
  size?: number;
  isActive?: boolean;
  className?: string;
}

export const AnimatedContent3D: React.FC<AnimatedContent3DProps> = ({
  size = 20,
  isActive = false,
  className
}) => {
  return (
    <motion.div
      className={className}
      style={{ display: 'inline-flex', fontSize: size }}
      whileHover={{
        scale: 1.1,
        transition: {
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1]
        }
      }}
    >
      <IconoirSelectFace3d />
    </motion.div>
  );
};
