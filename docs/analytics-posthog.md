PostHog (MV3) Setup

- Library: `posthog-js-lite` (MV3-safe, no DOM requirements)
- Config: uses `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, and toggle via `VITE_POSTHOG_ENABLED` from `.env`
- Persistence: in-memory for the SDK, distinctId persisted in `browser.storage.local`
- Wired events (tracked client-side):
  - acquisition_signup_completed (once per user)
  - activity_scrap_created (on successful scrap create)
  - activity_ai_draft_completed (on AI draft completion v1/v2/v3)

Usage

- Initialize once per context (background, sidepanel, options, webviewer, or content) where you want to emit events. No code changes required between dev/prod; use env flags.

```ts
import { posthogClient } from '../src/analytics/posthog'

await posthogClient.init() // reads envs for key/host/enabled/debug

// Later when you want to add events
posthogClient.capture('event_name', { foo: 'bar' })
// To identify a logged-in user
posthogClient.identify(userId, { email })
```

Notes

- The helper does not auto-capture or send anything by itself.
- Distinct ID is generated once and stored under `analytics:ph:distinctId` in extension local storage.
- Enabling behavior:
  - By default: enabled only in production builds.
  - Override via env: set `VITE_POSTHOG_ENABLED=true` to enable in dev (or `false` to disable in prod).
  - Optional debug logs: `VITE_POSTHOG_DEBUG=true`.
- You can safely import and call `init` from MV3 service worker and any extension page without inline scripts.

Quick setup

- In `tyquill-ext-client/.env.local`:

```
VITE_POSTHOG_KEY=phc_...
# optional
VITE_POSTHOG_HOST=https://us.i.posthog.com
# enable analytics in dev
VITE_POSTHOG_ENABLED=true
# verbose SDK logs
VITE_POSTHOG_DEBUG=true
```
