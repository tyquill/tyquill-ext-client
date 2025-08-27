import { v4 as uuidv4 } from 'uuid';

export async function getSharedDistinctId(): Promise<string> {
  try {
    const { posthog_distinct_id } = await browser.storage.local.get(['posthog_distinct_id']);
    
    if (posthog_distinct_id) {
      return posthog_distinct_id;
    }
    
    const id = uuidv4();
    await browser.storage.local.set({ posthog_distinct_id: id });
    return id;
  } catch (error) {
    console.warn('Failed to get/set PostHog distinct ID:', error);
    return uuidv4();
  }
}