
import * as Sentry from '@sentry/react';

export const initSentry = () => {
  Sentry.init({
    dsn: 'https://<YOUR_SENTRY_DSN>.ingest.sentry.io/<YOUR_SENTRY_PROJECT_ID>',
    integrations: [],
    tracesSampleRate: 1.0,
  });
};
