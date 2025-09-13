import { browser } from 'wxt/browser'
import { EVENT_NAMES, posthogClient } from './posthog'

export async function captureInBackground(event: string, properties?: Record<string, any>): Promise<void> {
  try {
    await browser.runtime.sendMessage({ action: 'analytics:capture', event, properties })
    return
  } catch {
    // Fallback to direct capture in current context
    try {
      await posthogClient.init()
      posthogClient.capture(event, properties)
    } catch {}
  }
}

export async function trackAiDraftCompletedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ACTIVITY_AI_DRAFT_COMPLETED, properties)
}

export async function trackLoginBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.AUTH_LOGIN, properties)
}

export async function trackScrapCreatedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ACTIVITY_SCRAP_CREATED, properties)
}

