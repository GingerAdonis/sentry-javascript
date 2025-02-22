import type { BrowserClient } from '@sentry/svelte';
import * as SentrySvelte from '@sentry/svelte';
import {
  SDK_VERSION,
  browserTracingIntegration,
  getClient,
  getCurrentScope,
  getGlobalScope,
  getIsolationScope,
} from '@sentry/svelte';
import { vi } from 'vitest';

import { BrowserTracing, init } from '../../src/client';
import { svelteKitRoutingInstrumentation } from '../../src/client/router';

const svelteInit = vi.spyOn(SentrySvelte, 'init');

describe('Sentry client SDK', () => {
  describe('init', () => {
    afterEach(() => {
      vi.clearAllMocks();

      getGlobalScope().clear();
      getIsolationScope().clear();
      getCurrentScope().clear();
      getCurrentScope().setClient(undefined);
    });

    it('adds SvelteKit metadata to the SDK options', () => {
      expect(svelteInit).not.toHaveBeenCalled();

      init({});

      expect(svelteInit).toHaveBeenCalledTimes(1);
      expect(svelteInit).toHaveBeenCalledWith(
        expect.objectContaining({
          _metadata: {
            sdk: {
              name: 'sentry.javascript.sveltekit',
              version: SDK_VERSION,
              packages: [
                { name: 'npm:@sentry/sveltekit', version: SDK_VERSION },
                { name: 'npm:@sentry/svelte', version: SDK_VERSION },
              ],
            },
          },
        }),
      );
    });

    it('sets the runtime tag on the isolation scope', () => {
      expect(getIsolationScope().getScopeData().tags).toEqual({});

      init({ dsn: 'https://public@dsn.ingest.sentry.io/1337' });

      expect(getIsolationScope().getScopeData().tags).toEqual({ runtime: 'browser' });
    });

    describe('automatically added integrations', () => {
      it.each([
        ['tracesSampleRate', { tracesSampleRate: 0 }],
        ['tracesSampler', { tracesSampler: () => 1.0 }],
        ['enableTracing', { enableTracing: true }],
      ])('adds the BrowserTracing integration if tracing is enabled via %s', (_, tracingOptions) => {
        init({
          dsn: 'https://public@dsn.ingest.sentry.io/1337',
          ...tracingOptions,
        });

        const browserTracing = getClient<BrowserClient>()?.getIntegrationByName('BrowserTracing');
        expect(browserTracing).toBeDefined();
      });

      it.each([
        ['enableTracing', { enableTracing: false }],
        ['no tracing option set', {}],
      ])("doesn't add the BrowserTracing integration if tracing is disabled via %s", (_, tracingOptions) => {
        init({
          dsn: 'https://public@dsn.ingest.sentry.io/1337',
          ...tracingOptions,
        });

        const browserTracing = getClient<BrowserClient>()?.getIntegrationByName('BrowserTracing');
        expect(browserTracing).toBeUndefined();
      });

      it("doesn't add the BrowserTracing integration if `__SENTRY_TRACING__` is set to false", () => {
        // This is the closest we can get to unit-testing the `__SENTRY_TRACING__` tree-shaking guard
        // IRL, the code to add the integration would most likely be removed by the bundler.

        globalThis.__SENTRY_TRACING__ = false;

        init({
          dsn: 'https://public@dsn.ingest.sentry.io/1337',
          enableTracing: true,
        });

        const browserTracing = getClient<BrowserClient>()?.getIntegrationByName('BrowserTracing');
        expect(browserTracing).toBeUndefined();

        delete globalThis.__SENTRY_TRACING__;
      });

      it('Merges a user-provided BrowserTracing integration with the automatically added one', () => {
        init({
          dsn: 'https://public@dsn.ingest.sentry.io/1337',
          // eslint-disable-next-line deprecation/deprecation
          integrations: [new BrowserTracing({ finalTimeout: 10 })],
          enableTracing: true,
        });

        // eslint-disable-next-line deprecation/deprecation
        const browserTracing = getClient<BrowserClient>()?.getIntegrationByName('BrowserTracing') as BrowserTracing;
        const options = browserTracing.options;

        expect(browserTracing).toBeDefined();

        // This shows that the user-configured options are still here
        expect(options.finalTimeout).toEqual(10);

        // But we force the routing instrumentation to be ours
        // eslint-disable-next-line deprecation/deprecation
        expect(options.routingInstrumentation).toEqual(svelteKitRoutingInstrumentation);
      });

      it('Merges a user-provided browserTracingIntegration with the automatically added one', () => {
        init({
          dsn: 'https://public@dsn.ingest.sentry.io/1337',
          integrations: [browserTracingIntegration({ finalTimeout: 10 })],
          enableTracing: true,
        });

        // eslint-disable-next-line deprecation/deprecation
        const browserTracing = getClient<BrowserClient>()?.getIntegrationByName('BrowserTracing') as BrowserTracing;
        const options = browserTracing.options;

        expect(browserTracing).toBeDefined();

        // This shows that the user-configured options are still here
        expect(options.finalTimeout).toEqual(10);

        // But we force the routing instrumentation to be ours
        // eslint-disable-next-line deprecation/deprecation
        expect(options.routingInstrumentation).toEqual(svelteKitRoutingInstrumentation);
      });
    });
  });
});
