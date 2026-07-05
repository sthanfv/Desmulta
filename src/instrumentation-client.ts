// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import type { ErrorEvent } from '@sentry/nextjs';
import { applyPIIScrubber } from '@/lib/security/piiScrubber';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: 0.1,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,

  beforeSend(event: ErrorEvent) {
    try {
      return applyPIIScrubber(event);
    } catch (error) {
      console.error(
        '[DevSecOps] Sanitización fallida en Client Sentry. Destruyendo evento.',
        error
      );
      return null;
    }
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
