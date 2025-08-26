// WXT/Vite 환경에 맞는 Mixpanel 초기화
import mixpanel from 'mixpanel-browser';

// 환경변수 또는 하드코딩 토큰
let token: string;
let isProd: boolean;

try {
  token = import.meta.env.VITE_MIXPANEL_TOKEN || '';
  isProd = import.meta.env.MODE === 'production';
} catch (error) {
  token = '';
  isProd = false;
}

// 토큰이 있을 때만 초기화
if (token) {
  mixpanel.init(token, {
    debug: !isProd,
    persistence: 'localStorage',
    track_pageview: false,
    api_host: 'https://api-js.mixpanel.com',
  });
} else {
  console.warn('Mixpanel token not found. Analytics tracking disabled.');
}

// 공통 래퍼 export
export const mp = {
  track: (name: string, props?: Record<string, any>) => {
    if (token) mixpanel.track(name, props);
  },
  identify: (id: string) => {
    if (token) mixpanel.identify(id);
  },
  peopleSet: (props: Record<string, any>) => {
    if (token) mixpanel.people.set(props);
  },
  reset: () => {
    if (token) mixpanel.reset();
  },
};

export default mp;