// Animation configurations for consistent motion design across the app
export const animations = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: "easeOut" }
  },

  // Stagger animation for content sections
  staggerContainer: {
    animate: {
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.1
      }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  // Button interactions
  buttonHover: {
    scale: 1.05,
    y: -2,
    transition: { duration: 0.2, ease: "easeOut" }
  },

  buttonTap: {
    scale: 0.95,
    y: 0,
    transition: { duration: 0.1, ease: "easeInOut" }
  },

  // Icon animations
  iconHover: {
    scale: 1.1,
    rotate: 5,
    transition: { duration: 0.2, ease: "easeOut" }
  },

  iconRotate: {
    rotate: 360,
    transition: { duration: 0.6, ease: "easeInOut" }
  },

  // Success feedback
  successPulse: {
    scale: [1, 1.2, 1],
    transition: { duration: 0.4, ease: "easeOut" }
  },

  successCheckmark: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: { duration: 0.5, ease: "easeOut" }
  },

  // Loading states
  loadingSpinner: {
    rotate: 360,
    transition: { duration: 1, ease: "linear", repeat: Infinity }
  },

  pulseLoading: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.5, ease: "easeInOut", repeat: Infinity }
  },

  // Conditional element animations (for export button)
  slideIn: {
    initial: { opacity: 0, x: 20, scale: 0.9 },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      x: 20, 
      scale: 0.9,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  },

  // Version selector dropdown
  dropdownExpand: {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95,
      transition: { duration: 0.15, ease: "easeIn" }
    }
  },

  // Edit mode transitions
  editModeTransition: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.25, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  },

  // Tooltip animations
  tooltipFade: {
    initial: { opacity: 0, y: 10, scale: 0.9 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: 10, 
      scale: 0.9,
      transition: { duration: 0.15, ease: "easeIn" }
    }
  }
};

// Utility function to create a bounce animation
export const createBounceAnimation = (scale = 1.1, duration = 0.3) => ({
  scale: [1, scale, 1],
  transition: { duration, ease: "easeOut" }
});

// Utility function for reduced motion support
export const getReducedMotion = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
};

// Utility function to get animation with reduced motion support
export const getAnimation = (animation: any) => {
  return getReducedMotion() ? {} : animation;
};