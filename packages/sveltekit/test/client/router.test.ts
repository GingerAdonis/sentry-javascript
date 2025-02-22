/* eslint-disable @typescript-eslint/unbound-method */
import type { Transaction } from '@sentry/types';
import { writable } from 'svelte/store';
import type { SpyInstance } from 'vitest';
import { vi } from 'vitest';

import { navigating, page } from '$app/stores';

import { SEMANTIC_ATTRIBUTE_SENTRY_SOURCE } from '@sentry/core';
import { svelteKitRoutingInstrumentation } from '../../src/client/router';

// we have to overwrite the global mock from `vitest.setup.ts` here to reset the
// `navigating` store for each test.
vi.mock('$app/stores', async () => {
  return {
    get navigating() {
      return navigatingStore;
    },
    page: writable(),
  };
});

let navigatingStore = writable();

describe('sveltekitRoutingInstrumentation', () => {
  let returnedTransaction: (Transaction & { returnedTransaction: SpyInstance }) | undefined;
  const mockedStartTransaction = vi.fn().mockImplementation(txnCtx => {
    returnedTransaction = {
      ...txnCtx,
      updateName: vi.fn(),
      setAttribute: vi.fn(),
      startChild: vi.fn().mockImplementation(ctx => {
        return { ...mockedRoutingSpan, ...ctx };
      }),
      setTag: vi.fn(),
    };
    return returnedTransaction;
  });

  const mockedRoutingSpan = {
    end: () => {},
  };

  const routingSpanFinishSpy = vi.spyOn(mockedRoutingSpan, 'end');

  beforeEach(() => {
    navigatingStore = writable();
    vi.clearAllMocks();
  });

  it("starts a pageload transaction when it's called with default params", () => {
    // eslint-disable-next-line deprecation/deprecation
    svelteKitRoutingInstrumentation(mockedStartTransaction);

    expect(mockedStartTransaction).toHaveBeenCalledTimes(1);
    expect(mockedStartTransaction).toHaveBeenCalledWith({
      name: '/',
      op: 'pageload',
      origin: 'auto.pageload.sveltekit',
      description: '/',
      tags: {
        'routing.instrumentation': '@sentry/sveltekit',
      },
      attributes: {
        [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
      },
    });

    // We emit an update to the `page` store to simulate the SvelteKit router lifecycle
    page.set({ route: { id: 'testRoute' } });

    // This should update the transaction name with the parameterized route:
    expect(returnedTransaction?.updateName).toHaveBeenCalledTimes(1);
    expect(returnedTransaction?.updateName).toHaveBeenCalledWith('testRoute');
    expect(returnedTransaction?.setAttribute).toHaveBeenCalledWith(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, 'route');
  });

  it("doesn't start a pageload transaction if `startTransactionOnPageLoad` is false", () => {
    // eslint-disable-next-line deprecation/deprecation
    svelteKitRoutingInstrumentation(mockedStartTransaction, false);
    expect(mockedStartTransaction).toHaveBeenCalledTimes(0);
  });

  it("doesn't start a navigation transaction when `startTransactionOnLocationChange` is false", () => {
    // eslint-disable-next-line deprecation/deprecation
    svelteKitRoutingInstrumentation(mockedStartTransaction, false, false);

    // We emit an update to the `navigating` store to simulate the SvelteKit navigation lifecycle
    navigating.set({
      from: { route: { id: '/users' }, url: { pathname: '/users' } },
      to: { route: { id: '/users/[id]' }, url: { pathname: '/users/7762' } },
    });

    // This should update the transaction name with the parameterized route:
    expect(mockedStartTransaction).toHaveBeenCalledTimes(0);
  });

  it('starts a navigation transaction when `startTransactionOnLocationChange` is true', () => {
    // eslint-disable-next-line deprecation/deprecation
    svelteKitRoutingInstrumentation(mockedStartTransaction, false, true);

    // We emit an update to the `navigating` store to simulate the SvelteKit navigation lifecycle
    navigating.set({
      from: { route: { id: '/users' }, url: { pathname: '/users' } },
      to: { route: { id: '/users/[id]' }, url: { pathname: '/users/7762' } },
    });

    // This should update the transaction name with the parameterized route:
    expect(mockedStartTransaction).toHaveBeenCalledTimes(1);
    expect(mockedStartTransaction).toHaveBeenCalledWith({
      name: '/users/[id]',
      op: 'navigation',
      origin: 'auto.navigation.sveltekit',
      attributes: { [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'route' },
      tags: {
        'routing.instrumentation': '@sentry/sveltekit',
      },
    });

    // eslint-disable-next-line deprecation/deprecation
    expect(returnedTransaction?.startChild).toHaveBeenCalledWith({
      op: 'ui.sveltekit.routing',
      origin: 'auto.ui.sveltekit',
      description: 'SvelteKit Route Change',
    });

    // eslint-disable-next-line deprecation/deprecation
    expect(returnedTransaction?.setTag).toHaveBeenCalledWith('from', '/users');

    // We emit `null` here to simulate the end of the navigation lifecycle
    navigating.set(null);

    expect(routingSpanFinishSpy).toHaveBeenCalledTimes(1);
  });

  describe('handling same origin and destination navigations', () => {
    it("doesn't start a navigation transaction if the raw navigation origin and destination are equal", () => {
      // eslint-disable-next-line deprecation/deprecation
      svelteKitRoutingInstrumentation(mockedStartTransaction, false, true);

      // We emit an update to the `navigating` store to simulate the SvelteKit navigation lifecycle
      navigating.set({
        from: { route: { id: '/users/[id]' }, url: { pathname: '/users/7762' } },
        to: { route: { id: '/users/[id]' }, url: { pathname: '/users/7762' } },
      });

      expect(mockedStartTransaction).toHaveBeenCalledTimes(0);
    });

    it('starts a navigation transaction if the raw navigation origin and destination are not equal', () => {
      // eslint-disable-next-line deprecation/deprecation
      svelteKitRoutingInstrumentation(mockedStartTransaction, false, true);

      navigating.set({
        from: { route: { id: '/users/[id]' }, url: { pathname: '/users/7762' } },
        to: { route: { id: '/users/[id]' }, url: { pathname: '/users/223412' } },
      });

      expect(mockedStartTransaction).toHaveBeenCalledTimes(1);
      expect(mockedStartTransaction).toHaveBeenCalledWith({
        name: '/users/[id]',
        op: 'navigation',
        origin: 'auto.navigation.sveltekit',
        attributes: { [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'route' },
        tags: {
          'routing.instrumentation': '@sentry/sveltekit',
        },
      });

      // eslint-disable-next-line deprecation/deprecation
      expect(returnedTransaction?.startChild).toHaveBeenCalledWith({
        op: 'ui.sveltekit.routing',
        origin: 'auto.ui.sveltekit',
        description: 'SvelteKit Route Change',
      });

      // eslint-disable-next-line deprecation/deprecation
      expect(returnedTransaction?.setTag).toHaveBeenCalledWith('from', '/users/[id]');
    });

    it('falls back to `window.location.pathname` to determine the raw origin', () => {
      // eslint-disable-next-line deprecation/deprecation
      svelteKitRoutingInstrumentation(mockedStartTransaction, false, true);

      // window.location.pathame is "/" in tests

      navigating.set({
        to: { route: {}, url: { pathname: '/' } },
      });

      expect(mockedStartTransaction).toHaveBeenCalledTimes(0);
    });
  });
});
