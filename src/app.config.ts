import { googleAnalytics4 } from '@wxt-dev/analytics/providers/google-analytics-4';
import { storage } from '@wxt-dev/storage';

export default defineAppConfig({
  analytics: {
    // 개발 환경에서 디버그 로그 활성화
    debug: import.meta.env.MODE === 'development',

    // Analytics 활성화 여부 (기본값: true)
    enabled: storage.defineItem('local:analytics-enabled', {
      fallback: true,
    }),

    // 사용자 ID - 익명 UUID 자동 생성
    userId: storage.defineItem('local:analytics-user-id', {
      init: () => crypto.randomUUID(),
    }),

    // 사용자 속성 저장 (무료/유료 분류 등)
    userProperties: storage.defineItem('local:analytics-user-properties', {
      fallback: {},
    }),

    providers: [
      googleAnalytics4({
        apiSecret: import.meta.env.WXT_GA_API_SECRET,
        measurementId: import.meta.env.WXT_GA_MEASUREMENT_ID,
      }),
    ],
  },
});