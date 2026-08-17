// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import type { ErrorEvent } from '@sentry/nextjs';
import { applyPIIScrubber } from '@/lib/security/piiScrubber';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,
  enableLogs: true,
  sendDefaultPii: false,

  beforeSend(event: ErrorEvent) {
    try {
      return applyPIIScrubber(event);
    } catch (error) {
      console.error(
        '[DevSecOps] Sanitización fallida en Server Sentry. Enviando evento con alerta.',
        error
      );
      event.tags = { ...event.tags, pii_scrub_failed: 'true' };
      return event;
    }
  },
});
