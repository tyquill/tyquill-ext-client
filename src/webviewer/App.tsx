import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { trackPageViewBridge, trackPageExitBridge } from '../analytics/bridge';
import { useI18n } from '../hooks/useI18n';

const ScrapView = React.lazy(() => import('./ScrapView'));
const UploadView = React.lazy(() => import('./UploadView'));

type ViewTarget = { kind: 'SCRAP' | 'UPLOAD'; id: string } | null;

const parseViewTarget = (): ViewTarget => {
  const hash = window.location.hash?.replace(/^#/, '') || '';
  const h = new URLSearchParams(hash);
  const s = new URLSearchParams(window.location.search || '');

  const type = (h.get('type') || s.get('type') || '').toUpperCase();
  const idStr = h.get('id') || s.get('id');
  // Support both UUID (string) and legacy numeric IDs
  if ((type === 'SCRAP' || type === 'UPLOAD') && idStr && idStr.trim() !== '') {
    return { kind: type as 'SCRAP' | 'UPLOAD', id: idStr };
  }
  return null;
};

const ViewerShell: React.FC = () => {
  const { t } = useI18n();
  const target = useMemo(() => parseViewTarget(), []);
  const pageStartTimeRef = useRef<number>(Date.now());

  // Page view tracking
  useEffect(() => {
    if (target) {
      pageStartTimeRef.current = Date.now();

      trackPageViewBridge({
        page: 'webviewer',
        page_detail: `${target.kind.toLowerCase()}-${target.id}`,
        view_type: target.kind,
        item_id: target.id,
        url: window.location.href
      }).catch(() => {});
    }

    // Page exit tracking on cleanup
    return () => {
      if (target && pageStartTimeRef.current > 0) {
        const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);

        if (duration > 0) {
          trackPageExitBridge({
            page: 'webviewer',
            page_detail: `${target.kind.toLowerCase()}-${target.id}`,
            view_type: target.kind,
            item_id: target.id,
            duration,
            url: window.location.href
          }).catch(() => {});
        }
      }
    };
  }, [target]);

  if (!target) {
    return <div style={{ padding: 16, color: 'red' }}>Invalid request (type and id required)</div>;
  }

  return (
    <Suspense fallback={<div style={{ padding: 16 }}>{t('common_loading')}</div>}>
      {target.kind === 'SCRAP' ? (
        <ScrapView id={target.id} />
      ) : (
        <UploadView id={target.id} />
      )}
    </Suspense>
  );
};

export default ViewerShell;

