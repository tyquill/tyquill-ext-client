import React from 'react';
import { IoArrowBack, IoGlobe, IoInformationCircle, IoSettings } from 'react-icons/io5';
import { browser } from 'wxt/browser';
import { useAuth } from '../../../hooks/useAuth';
import { LanguageSelector } from '../../common/LanguageSelector';
import styles from './Settings.module.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { user, logout, isLoading: authLoading, isAuthenticated } = useAuth();
  const [floatingButtonVisible, setFloatingButtonVisible] = React.useState<boolean>(true);
  const [authState, setAuthState] = React.useState<any>(null);
  const [isSigningOut, setIsSigningOut] = React.useState<boolean>(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);

  // Load saved preferences and auth state on mount
  React.useEffect(() => {
    const loadPreferences = async () => {
      try {
        const result = await browser.storage.local.get(['floatingButtonVisible', 'authState']);
        if (typeof result.floatingButtonVisible === 'boolean') {
          setFloatingButtonVisible(result.floatingButtonVisible);
        }
        if (result.authState) setAuthState(result.authState);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  // Save floating button preference
  const handleFloatingButtonToggle = async (enabled: boolean) => {
    setFloatingButtonVisible(enabled);
    try {
      await browser.storage.local.set({ floatingButtonVisible: enabled });
    } catch (error) {
      console.error('Failed to save floating button preference:', error);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);

    // Close settings immediately when sign-out is clicked
    onClose();

    try {
      await logout();
      // Auth state change will automatically trigger navigation to LandingPage
      // in the Sidebar component's useEffect
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      setSignOutError(errorMessage);
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const getManifestVersion = (): string => {
    try {
      return browser.runtime.getManifest().version || '1.0.0';
    } catch {
      return '1.0.0';
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

  return (
    <div className={`${styles.settingsOverlay} ${isOpen ? styles.open : ''}`}>
      <div className={styles.settingsContainer}>
        {/* Header */}
        <div className={styles.settingsHeader}>
          <button
            className={styles.backButton}
            onClick={onClose}
            aria-label="Go back to main sidebar"
          >
            <IoArrowBack size={18} />
          </button>
          <h2 className={styles.settingsTitle}>Settings</h2>
        </div>

        {/* Content */}
        <div className={styles.settingsContent}>
          {/* Profile Section */}
          <section className={styles.profileSection}>
            <div className={styles.profileContainer}>
              {authState?.user?.avatarUrl ? (
                <img
                  src={authState.user.avatarUrl}
                  alt="Profile"
                  className={styles.profileImage}
                />
              ) : (
                <div
                  className={styles.profileFallback}
                  style={{ backgroundColor: getAvatarColor(user?.email) }}
                >
                  {getAvatarText(user?.email)}
                </div>
              )}
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{user?.email?.split('@')[0] || 'User'}</div>
                <div className={styles.profileEmailContainer}>
                  <div className={styles.profileEmail}>{user?.email || 'Not signed in'}</div>
                  {/* Sign Out Link - only show when authenticated */}
                  {isAuthenticated && (
                    <button
                      className={styles.signOutLink}
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      aria-label="Sign out of your account"
                    >
                      {isSigningOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  )}
                </div>
                {/* Error message below profile info if exists */}
                {signOutError && (
                  <div className={styles.signOutError}>
                    {signOutError}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* General Settings Section */}
          <section className={styles.settingsSection}>
            <div className={styles.sectionHeader}>
              <IoSettings className={styles.sectionIcon} />
              <h3 className={styles.sectionTitle}>General</h3>
            </div>
            <div className={styles.settingGroup}>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel}>Floating Button</label>
                  <p className={styles.settingDescription}>Show floating button for quick access</p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={floatingButtonVisible}
                    onChange={(e) => handleFloatingButtonToggle(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </section>

          {/* Language Section */}
          <section className={styles.settingsSection}>
            <div className={styles.sectionHeader}>
              <IoGlobe className={styles.sectionIcon} />
              <h3 className={styles.sectionTitle}>Language</h3>
            </div>
            <div className={styles.settingGroup}>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel}>Interface Language</label>
                  <p className={styles.settingDescription}>Select your preferred language</p>
                </div>
                <LanguageSelector />
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className={styles.settingsSection}>
            <div className={styles.sectionHeader}>
              <IoInformationCircle className={styles.sectionIcon} />
              <h3 className={styles.sectionTitle}>About</h3>
            </div>
            <div className={styles.aboutContent}>
              <div className={styles.aboutItem}>
                <span className={styles.aboutLabel}>Version</span>
                <span className={styles.aboutValue}>{getManifestVersion()}</span>
              </div>
              <div className={styles.aboutItem}>
                <span className={styles.aboutLabel}>Developer</span>
                <span className={styles.aboutValue}>Tyquill Team</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;