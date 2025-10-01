import React, { useState, useEffect, SVGProps } from 'react';
import { IoArrowUpCircle, IoDocument } from 'react-icons/io5';
import { SiSubstack, SiLinkedin } from 'react-icons/si';
import { MdEmail } from 'react-icons/md';
import styles from './ExportButton.module.css';
import { useToastHelpers } from '../../../hooks/useToast';
import { useI18n } from '../../../hooks/useI18n';
import { detectPlatform, ExportPlatform, PlatformInfo, isSupportedPlatform, getPlatformDisplayName } from '../../../utils/platformDetection';
import { browser } from 'wxt/browser';

// Ghost icon component
function SimpleIconsGhost(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12s12-5.373 12-12S18.627 0 12 0m.256 2.313c2.47.005 5.116 2.008 5.898 2.962l.244.3c1.64 1.994 3.569 4.34 3.569 6.966c0 3.719-2.98 5.808-6.158 7.508c-1.433.766-2.98 1.508-4.748 1.508c-4.543 0-8.366-3.569-8.366-8.112c0-.706.17-1.425.342-2.15c.122-.515.244-1.033.307-1.549c.548-4.539 2.967-6.795 8.422-7.408a4 4 0 0 1 .49-.026Z" />
    </svg>
  );
}

interface ExportButtonProps {
  title: string;
  content: string;
  onExportSuccess?: (platform: string) => void;
  forceVisible?: boolean; // Force the button to be visible regardless of platform detection
}

const ExportButton: React.FC<ExportButtonProps> = ({ title, content, onExportSuccess, forceVisible = false }) => {
  const { showSuccess, showError } = useToastHelpers();
  const { t } = useI18n();
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessState, setShowSuccessState] = useState(false);

  // Platform detection - get active tab URL from background script for side panel
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        // For side panel context, get the active tab URL from background script
        const response = await browser.runtime.sendMessage({ action: 'getActiveTabInfo' });

        if (response?.success && response.data?.url) {
          const currentUrl = response.data.url;
          const detectedPlatform = detectPlatform(currentUrl);
          setPlatformInfo(detectedPlatform);
        } else {
          setPlatformInfo(null);
        }
      } catch (error) {
        console.error('Error detecting platform in ExportButton:', error);
        setPlatformInfo(null);
      }
    };

    // Initial platform check
    checkPlatform();

    // Listen for tab updates - check platform periodically
    const intervalId = setInterval(checkPlatform, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Only render button if on a supported platform editor page (unless forceVisible is true)
  if (!forceVisible && (!platformInfo || !platformInfo.isEditorPage || !isSupportedPlatform(platformInfo.platform))) {
    return null;
  }

  const handleExport = async () => {
    if (!content || !content.trim()) {
      showError(t('export_failed'), t('export_contentRequired'));
      return;
    }

    // For forceVisible mode or side panel, detect platform dynamically when clicked
    let currentPlatformInfo = platformInfo;
    if (forceVisible && !currentPlatformInfo) {
      try {
        // Get active tab URL from background script
        const response = await browser.runtime.sendMessage({ action: 'getActiveTabInfo' });
        if (response?.success && response.data?.url) {
          currentPlatformInfo = detectPlatform(response.data.url);
        }
      } catch (error) {
        console.error('Error detecting platform during export:', error);
      }
    }

    if (!currentPlatformInfo) {
      showError(t('export_failed'), t('export_tabNotFound'));
      return;
    }

    // Check if the detected platform is supported
    if (!isSupportedPlatform(currentPlatformInfo.platform)) {
      showError(t('export_failed'), t('export_platformNotSupported'));
      return;
    }

    setIsLoading(true);

    try {
      // Send export request to background script, which will forward to content script
      const response = await browser.runtime.sendMessage({
        action: 'exportToEditor',
        title: title || '',
        content: content,
        platform: currentPlatformInfo.platform
      });

      if (response?.success) {
        setShowSuccessState(true);
        setTimeout(() => setShowSuccessState(false), 2000);
        showSuccess(t('export_success'), t('export_success'));
        onExportSuccess?.(currentPlatformInfo.platform);
      } else {
        showError(t('export_failed'), response?.error || t('export_failed'));
      }
    } catch (error) {
      console.error('Export failed:', error);
      showError(t('export_failed'), error instanceof Error ? error.message : t('export_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Platform icon helper
  const getPlatformIcon = (platform: ExportPlatform) => {
    switch (platform) {
      case ExportPlatform.MAILY:
        return <MdEmail size={16} />;
      case ExportPlatform.SUBSTACK:
        return <SiSubstack size={16} />;
      case ExportPlatform.GHOST:
        return <SimpleIconsGhost style={{ fontSize: '16px' }} />;
      case ExportPlatform.LINKEDIN:
        return <SiLinkedin size={16} />;
      default:
        return <IoDocument size={16} />;
    }
  };

  // Tooltip text helper
  const getTooltipText = () => {
    if (!platformInfo || !platformInfo.platform) {
      return t('export_tooltip');
    }

    const platformName = getPlatformDisplayName(platformInfo.platform);
    return `${t('export_to')} ${platformName}`;
  };

  // Button classes helper
  const getButtonClasses = () => {
    const classes = [styles.exportButton];

    const isPlatformAvailable =
      platformInfo &&
      platformInfo.isEditorPage &&
      isSupportedPlatform(platformInfo.platform);

    if (isPlatformAvailable || forceVisible) {
      classes.push(styles.available);
    }

    if (showSuccessState) {
      classes.push(styles.success);
    }

    return classes.join(' ');
  };

  return (
    <div className={styles.tooltipContainer}>
      <button
        className={getButtonClasses()}
        onClick={handleExport}
        disabled={isLoading}
      >
        {/* Button icon */}
        {isLoading ? (
          <IoArrowUpCircle size={16} className={styles.spinning} />
        ) : (
          getPlatformIcon(platformInfo?.platform || ExportPlatform.UNKNOWN)
        )}
      </button>
      <div className={styles.tooltip}>
        {getTooltipText()}
      </div>
    </div>
  );
};

export default ExportButton;
