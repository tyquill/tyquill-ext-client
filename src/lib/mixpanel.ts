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
    try {
      if (token) mixpanel.track(name, props);
    } catch (e) {
      console.warn('mp.track failed:', e);
    }
  },
  identify: (id: string) => {
    try {
      if (token) mixpanel.identify(id);
    } catch (e) {
      console.warn('mp.identify failed:', e);
    }
  },
  peopleSet: (props: Record<string, any>) => {
    try {
      if (token) mixpanel.people.set(props);
    } catch (e) {
      console.warn('mp.peopleSet failed:', e);
    }
  },
  reset: () => {
    try {
      if (token) mixpanel.reset();
    } catch (e) {
      console.warn('mp.reset failed:', e);
    }
  },
};

export default mp;