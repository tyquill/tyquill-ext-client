import React, { Suspense, useMemo } from 'react';

const ScrapView = React.lazy(() => import('./ScrapView'));
const UploadView = React.lazy(() => import('./UploadView'));

type ViewTarget = { kind: 'SCRAP' | 'UPLOAD'; id: number } | null;

const parseViewTarget = (): ViewTarget => {
  const hash = window.location.hash?.replace(/^#/, '') || '';
  const h = new URLSearchParams(hash);
  const s = new URLSearchParams(window.location.search || '');

  const type = (h.get('type') || s.get('type') || '').toUpperCase();
  const idStr = h.get('id') || s.get('id');
  if ((type === 'SCRAP' || type === 'UPLOAD') && idStr && /^\d+$/.test(idStr)) {
    return { kind: type as 'SCRAP' | 'UPLOAD', id: parseInt(idStr, 10) };
  }
  return null;
};

const ViewerShell: React.FC = () => {
  const target = useMemo(() => parseViewTarget(), []);

  if (!target) {
    return <div style={{ padding: 16, color: 'red' }}>유효하지 않은 요청입니다 (type, id 필요)</div>;
  }

  return (
    <Suspense fallback={<div style={{ padding: 16 }}>불러오는 중...</div>}>
      {target.kind === 'SCRAP' ? (
        <ScrapView id={target.id} />
      ) : (
        <UploadView id={target.id} />
      )}
    </Suspense>
  );
};

export default ViewerShell;

