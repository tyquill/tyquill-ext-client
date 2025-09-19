import { useEffect, useRef } from 'react';
import { trackPageViewBridge, trackPageExitBridge } from '../analytics/bridge';

export interface PageTrackingOptions {
  pageName: string;
  previousPage?: string;
  metadata?: Record<string, any>;
}

export function usePageTracking({ pageName, previousPage, metadata = {} }: PageTrackingOptions) {
  const startTimeRef = useRef<number>(0);
  const hasTrackedViewRef = useRef<boolean>(false);

  useEffect(() => {
    // 페이지 진입 추적 (한 번만)
    if (!hasTrackedViewRef.current) {
      startTimeRef.current = Date.now();
      hasTrackedViewRef.current = true;

      trackPageViewBridge({
        page: pageName,
        previous_page: previousPage,
        timestamp: startTimeRef.current,
        ...metadata
      }).catch(() => {});
    }

    // 페이지 이탈 추적 (cleanup)
    return () => {
      if (hasTrackedViewRef.current && startTimeRef.current > 0) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000); // seconds

        trackPageExitBridge({
          page: pageName,
          duration,
          timestamp: Date.now(),
          ...metadata
        }).catch(() => {});
      }
    };
  }, [pageName, previousPage]);
}