import { PostHog } from 'posthog-js/dist/module.no-external';
import { getSharedDistinctId } from './distinctId';

export const ph = new PostHog();

interface PostHogInitOptions {
  persistence?: 'localStorage' | 'sessionStorage' | 'memory';
}

export async function initPostHog(opts: PostHogInitOptions = {}): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
  
  if (!key) {
    console.warn('PostHog key not found, skipping initialization');
    return;
  }

  try {
    const distinctId = await getSharedDistinctId();
    
    ph.init(key, {
      api_host: host,
      // MV3: Disable external dependency loading for Chrome Web Store compliance
      disable_external_dependency_loading: true,
      // Use static bundle imports only
      advanced_disable_decide: false,
      // Context-specific persistence
      persistence: opts.persistence || (typeof window !== 'undefined' && typeof (window as any).chrome?.storage !== 'undefined' ? 'localStorage' : 'memory'),
      // Bootstrap with shared distinct ID across extension contexts
      bootstrap: { distinctID: distinctId },
      // Basic tracking settings
      autocapture: true,
      capture_pageview: false, // We'll capture page views manually
      capture_pageleave: false,
      // Disable session recording
      disable_session_recording: true,
      // Debug settings (enable for troubleshooting)
      debug: true, // Always enable debug for now to see what's happening
      loaded: (posthog) => {
        console.log('PostHog loaded successfully', {
          key: key.substring(0, 10) + '...',
          host,
          distinctId
        });
        
        // Set user properties if available
        const userInfo = getUserInfo();
        if (userInfo) {
          posthog.identify(userInfo.id, userInfo.properties);
        }
      },
    });

  } catch (error) {
    console.error('Failed to initialize PostHog:', error);
  }
}

function getUserInfo(): { id: string; properties: Record<string, any> } | null {
  try {
    // Try to get user info from chrome storage or other sources
    // This is a placeholder - you should implement based on your auth system
    return null;
  } catch (error) {
    return null;
  }
}

// Utility functions for common tracking patterns
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  try {
    ph.capture(eventName, properties);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

export function trackPageView(pageName: string, properties?: Record<string, any>): void {
  try {
    ph.capture('$pageview', {
      $current_url: pageName,
      ...properties
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

export function identifyUser(userId: string, properties?: Record<string, any>): void {
  try {
    ph.identify(userId, properties);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

export function resetUser(): void {
  try {
    ph.reset();
  } catch (error) {
    console.error('Failed to reset user:', error);
  }
}

