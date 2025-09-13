import PostHog from 'posthog-js-lite'
type PostHogEventProperties = Record<string, any>
import { browser } from 'wxt/browser'

// PostHog configuration sourced from Vite envs (WXT uses Vite)
const PH_API_KEY = (import.meta as any)?.env?.VITE_POSTHOG_KEY as string | undefined
const PH_HOST = ((import.meta as any)?.env?.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com'
const MODE = ((import.meta as any)?.env?.MODE as string | undefined) || 'production'
const PH_ENABLED_ENV = (import.meta as any)?.env?.VITE_POSTHOG_ENABLED as string | undefined
const PH_DEBUG_ENV = (import.meta as any)?.env?.VITE_POSTHOG_DEBUG as string | undefined

// Parse boolean-like envs ("true"/"1" enable, "false"/"0" disable)
function parseBoolEnv(v?: string): boolean | undefined {
  if (v === undefined) return undefined
  const s = String(v).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true
  if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false
  return undefined
}

const ENV_ENABLED = parseBoolEnv(PH_ENABLED_ENV)
const ENV_DEBUG = parseBoolEnv(PH_DEBUG_ENV)

// Enabled default: env override takes precedence; else prod-only
const DEFAULT_ENABLED = ENV_ENABLED ?? (MODE === 'production')
const DEFAULT_DEBUG = ENV_DEBUG ?? false

const STORAGE_KEY = 'analytics:ph:distinctId'

let client: PostHog | null = null
let initialized = false
let lastIdentifiedId: string | null = null

function uuidv4(): string {
  // RFC4122 v4
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)

  // Set version and variant bits
  buf[6] = (buf[6] & 0x0f) | 0x40
  buf[8] = (buf[8] & 0x3f) | 0x80

  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0'))
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  )
}

async function getOrCreateDistinctId(): Promise<string> {
  try {
    const stored = await browser.storage.local.get([STORAGE_KEY])
    const existing = stored?.[STORAGE_KEY]
    if (typeof existing === 'string' && existing.length > 0) return existing
  } catch {
    // ignore and fallback to generating a new one
  }
  const id = uuidv4()
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: id })
  } catch {
    // ignore (best effort persistence)
  }
  return id
}

export type InitOptions = {
  enabled?: boolean
  debug?: boolean
  host?: string
  apiKey?: string
}

/**
 * Prepare a singleton PostHog client for MV3 contexts (service worker, pages, content).
 * - Uses in-memory persistence to avoid MV3 storage limitations
 * - Persists distinctId separately in extension storage for stability
 * - Does not auto-capture or send any events by itself
 */
export async function initPostHog(options: InitOptions = {}): Promise<PostHog | null> {
  if (initialized) return client
  initialized = true

  const enabled = options.enabled ?? DEFAULT_ENABLED
  const apiKey = options.apiKey ?? PH_API_KEY
  const host = options.host ?? PH_HOST
  const debug = options.debug ?? DEFAULT_DEBUG

  if (!apiKey || !enabled) {
    client = null
    return null
  }

  // Create client with safe defaults for MV3
  const ph = new PostHog(apiKey, {
    host,
    persistence: 'memory',
    preloadFeatureFlags: false,
    disableSurveys: true,
    disabled: !enabled,
    requestTimeout: 8000,
    // Flush immediately in MV3 to avoid SW lifecycle drops
    flushAt: 1,
    flushInterval: 200,
  })

  // Prepare a stable, extension-scoped distinctId for later use (without identifying yet)
  try {
    await getOrCreateDistinctId()
  } catch {
    // ignore
  }

  if (debug) {
    try {
      ;(ph as any).debug?.(true)
    } catch {}
  }

  client = ph
  return ph
}

export function getPostHog(): PostHog | null {
  return client
}

export function isInitialized(): boolean {
  return !!client
}

export function capture(event: string, properties?: PostHogEventProperties): void {
  ;(client as any)?.capture?.(event, properties)
}

export function identify(distinctId: string, properties?: PostHogEventProperties): void {
  ;(client as any)?.identify?.(distinctId, properties)
  try { lastIdentifiedId = distinctId } catch {}
}

export async function shutdown(timeoutMs?: number): Promise<void> {
  if (!client) return
  try {
    await (client as any).shutdown?.(timeoutMs)
  } catch {
    // ignore
  }
}

export async function reset(): Promise<void> {
  if (!client) return
  try {
    // keep nothing by default
    ;(client as any).reset?.()
  } catch {
    // ignore
  }
}

// =============== Event Names & Helpers ===============

export const EVENT_NAMES = {
  ACQUISITION_SIGNUP_COMPLETED: 'acquisition_signup_completed',
  ACTIVITY_SCRAP_CREATED: 'activity_scrap_created',
  ACTIVITY_AI_DRAFT_COMPLETED: 'activity_ai_draft_completed',
  AUTH_LOGIN: 'auth_login',
} as const

export type EventName = typeof EVENT_NAMES[keyof typeof EVENT_NAMES]

// Storage key helper for one-off events per user
function oneOffKey(name: EventName, id: string) {
  return `analytics:ph:once:${name}:${id}`
}

async function markOnce(name: EventName, id: string) {
  try {
    await browser.storage.local.set({ [oneOffKey(name, id)]: true })
  } catch {}
}

async function isMarked(name: EventName, id: string): Promise<boolean> {
  try {
    const r = await browser.storage.local.get([oneOffKey(name, id)])
    return !!r?.[oneOffKey(name, id)]
  } catch {
    return false
  }
}

async function tryIdentify(distinctId: string, properties?: PostHogEventProperties) {
  try {
    const current = (client as any)?.getDistinctId?.() || null
    if (lastIdentifiedId === distinctId || current === distinctId) return
    identify(distinctId, properties)
    lastIdentifiedId = distinctId
  } catch {}
}

// Ensure we have an extension-scoped anonymous identity for capture when user isn't logged in
export async function ensureAnonymousIdentity(): Promise<string | null> {
  try {
    const id = await getOrCreateDistinctId()
    const current = (client as any)?.getDistinctId?.() || (client as any)?.getAnonymousId?.() || null
    if (lastIdentifiedId === id || current === id) {
      return id
    }
    // Only identify if the SDK doesn't already have this id
    try {
      identify(id)
      lastIdentifiedId = id
    } catch {}
    return id
  } catch {
    return null
  }
}

async function trackSignupCompleted(distinctId: string, props?: { email?: string; fullName?: string; provider?: string }) {
  if (!distinctId) return
  const already = await isMarked(EVENT_NAMES.ACQUISITION_SIGNUP_COMPLETED, distinctId)
  if (already) return
  await tryIdentify(distinctId, { email: props?.email, fullName: props?.fullName })
  // Use $set_once to ensure account-level signup attribution across devices
  capture(EVENT_NAMES.ACQUISITION_SIGNUP_COMPLETED, {
    $set_once: {
      signed_up: new Date().toISOString(),
    },
    provider: props?.provider,
  })
  await markOnce(EVENT_NAMES.ACQUISITION_SIGNUP_COMPLETED, distinctId)
}

function trackScrapCreated(properties?: PostHogEventProperties) {
  capture(EVENT_NAMES.ACTIVITY_SCRAP_CREATED, properties)
}

function trackAiDraftCompleted(properties?: PostHogEventProperties) {
  capture(EVENT_NAMES.ACTIVITY_AI_DRAFT_COMPLETED, properties)
}

function trackLogin(properties?: PostHogEventProperties) {
  capture(EVENT_NAMES.AUTH_LOGIN, properties)
}

export const posthogClient = {
  init: initPostHog,
  get: getPostHog,
  capture,
  identify,
  shutdown,
  reset,
  events: {
    EVENT_NAMES,
    trackSignupCompleted,
    trackScrapCreated,
    trackAiDraftCompleted,
    trackLogin,
  },
}
