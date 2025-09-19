import { createAnalytics } from '@wxt-dev/analytics';
import { useAppConfig } from '#imports';

export const analytics = createAnalytics(useAppConfig().analytics);
