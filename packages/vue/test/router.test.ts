import * as SentryBrowser from '@sentry/browser';
import { SEMANTIC_ATTRIBUTE_SENTRY_SOURCE } from '@sentry/core';
import type { Transaction } from '@sentry/types';

import { vueRouterInstrumentation } from '../src';
import type { Route } from '../src/router/types';
import * as vueTracing from '../src/tracing';

const captureExceptionSpy = jest.spyOn(SentryBrowser, 'captureException');

const mockVueRouter = {
  onError: jest.fn<void, [(error: Error) => void]>(),
  beforeEach: jest.fn<void, [(from: Route, to: Route, next?: () => void) => void]>(),
};

const mockStartTransaction = jest.fn();
const mockNext = jest.fn();

const testRoutes: Record<string, Route> = {
  initialPageloadRoute: { matched: [], params: {}, path: '', query: {} },
  normalRoute1: {
    matched: [{ path: '/books/:bookId/chapter/:chapterId' }],
    params: {
      bookId: '12',
      chapterId: '3',
    },
    path: '/books/12/chapter/3',
    query: {
      utm_source: 'google',
    },
  },
  normalRoute2: {
    matched: [{ path: '/accounts/:accountId' }],
    params: {
      accountId: '4',
    },
    path: '/accounts/4',
    query: {},
  },
  namedRoute: {
    matched: [{ path: '/login' }],
    name: 'login-screen',
    params: {},
    path: '/login',
    query: {},
  },
  unmatchedRoute: {
    matched: [],
    params: {},
    path: '/e8733846-20ac-488c-9871-a5cbcb647294',
    query: {},
  },
};

describe('vueRouterInstrumentation()', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return instrumentation that instruments VueRouter.onError', () => {
    // create instrumentation
    const instrument = vueRouterInstrumentation(mockVueRouter);

    // instrument
    instrument(mockStartTransaction);

    // check
    expect(mockVueRouter.onError).toHaveBeenCalledTimes(1);

    const onErrorCallback = mockVueRouter.onError.mock.calls[0][0];

    const testError = new Error();
    onErrorCallback(testError);

    expect(captureExceptionSpy).toHaveBeenCalledTimes(1);
    expect(captureExceptionSpy).toHaveBeenCalledWith(testError, { mechanism: { handled: false } });
  });

  it.each([
    ['normalRoute1', 'normalRoute2', '/accounts/:accountId', 'route'],
    ['normalRoute2', 'namedRoute', 'login-screen', 'custom'],
    ['normalRoute2', 'unmatchedRoute', '/e8733846-20ac-488c-9871-a5cbcb647294', 'url'],
  ])(
    'should return instrumentation that instruments VueRouter.beforeEach(%s, %s) for navigations',
    (fromKey, toKey, transactionName, transactionSource) => {
      // create instrumentation
      const instrument = vueRouterInstrumentation(mockVueRouter);

      // instrument
      instrument(mockStartTransaction, true, true);

      // check
      expect(mockVueRouter.beforeEach).toHaveBeenCalledTimes(1);
      const beforeEachCallback = mockVueRouter.beforeEach.mock.calls[0][0];

      const from = testRoutes[fromKey];
      const to = testRoutes[toKey];
      beforeEachCallback(to, from, mockNext);

      // first startTx call happens when the instrumentation is initialized (for pageloads)
      expect(mockStartTransaction).toHaveBeenCalledTimes(2);
      expect(mockStartTransaction).toHaveBeenCalledWith({
        name: transactionName,
        data: {
          [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: transactionSource,
          params: to.params,
          query: to.query,
        },
        op: 'navigation',
        origin: 'auto.navigation.vue',
        tags: {
          'routing.instrumentation': 'vue-router',
        },
      });

      expect(mockNext).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ['initialPageloadRoute', 'normalRoute1', '/books/:bookId/chapter/:chapterId', 'route'],
    ['initialPageloadRoute', 'namedRoute', 'login-screen', 'custom'],
    ['initialPageloadRoute', 'unmatchedRoute', '/e8733846-20ac-488c-9871-a5cbcb647294', 'url'],
  ])(
    'should return instrumentation that instruments VueRouter.beforeEach(%s, %s) for pageloads',
    (fromKey, toKey, transactionName, transactionSource) => {
      const mockedTxn = {
        updateName: jest.fn(),
        setData: jest.fn(),
        setAttribute: jest.fn(),
        metadata: {},
      };
      const customMockStartTxn = { ...mockStartTransaction }.mockImplementation(_ => {
        return mockedTxn;
      });
      jest.spyOn(vueTracing, 'getActiveTransaction').mockImplementation(() => mockedTxn as unknown as Transaction);

      // create instrumentation
      const instrument = vueRouterInstrumentation(mockVueRouter);

      // instrument
      instrument(customMockStartTxn, true, true);

      // check for transaction start
      expect(customMockStartTxn).toHaveBeenCalledTimes(1);
      expect(customMockStartTxn).toHaveBeenCalledWith({
        name: '/',
        data: {
          [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
        },
        op: 'pageload',
        origin: 'auto.pageload.vue',
        tags: {
          'routing.instrumentation': 'vue-router',
        },
      });

      const beforeEachCallback = mockVueRouter.beforeEach.mock.calls[0][0];

      const from = testRoutes[fromKey];
      const to = testRoutes[toKey];

      beforeEachCallback(to, from, mockNext);
      expect(mockVueRouter.beforeEach).toHaveBeenCalledTimes(1);

      expect(mockedTxn.updateName).toHaveBeenCalledWith(transactionName);
      expect(mockedTxn.setAttribute).toHaveBeenCalledWith(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, transactionSource);
      expect(mockedTxn.setData).toHaveBeenNthCalledWith(1, 'params', to.params);
      expect(mockedTxn.setData).toHaveBeenNthCalledWith(2, 'query', to.query);

      expect(mockNext).toHaveBeenCalledTimes(1);
    },
  );

  it('allows to configure routeLabel=path', () => {
    // create instrumentation
    const instrument = vueRouterInstrumentation(mockVueRouter, { routeLabel: 'path' });

    // instrument
    instrument(mockStartTransaction, true, true);

    // check
    const beforeEachCallback = mockVueRouter.beforeEach.mock.calls[0][0];

    const from = testRoutes.normalRoute1;
    const to = testRoutes.namedRoute;
    beforeEachCallback(to, from, mockNext);

    // first startTx call happens when the instrumentation is initialized (for pageloads)
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: '/login',
      data: {
        [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'route',
        params: to.params,
        query: to.query,
      },
      op: 'navigation',
      origin: 'auto.navigation.vue',
      tags: {
        'routing.instrumentation': 'vue-router',
      },
    });
  });

  it('allows to configure routeLabel=name', () => {
    // create instrumentation
    const instrument = vueRouterInstrumentation(mockVueRouter, { routeLabel: 'name' });

    // instrument
    instrument(mockStartTransaction, true, true);

    // check
    const beforeEachCallback = mockVueRouter.beforeEach.mock.calls[0][0];

    const from = testRoutes.normalRoute1;
    const to = testRoutes.namedRoute;
    beforeEachCallback(to, from, mockNext);

    // first startTx call happens when the instrumentation is initialized (for pageloads)
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: 'login-screen',
      data: {
        [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'custom',
        params: to.params,
        query: to.query,
      },
      op: 'navigation',
      origin: 'auto.navigation.vue',
      tags: {
        'routing.instrumentation': 'vue-router',
      },
    });
  });

  it("doesn't overwrite a pageload transaction name it was set to custom before the router resolved the route", () => {
    const mockedTxn = {
      updateName: jest.fn(),
      setData: jest.fn(),
      setAttribute: jest.fn(),
      name: '',
      toJSON: () => ({
        data: {
          [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
        },
      }),
    };
    const customMockStartTxn = { ...mockStartTransaction }.mockImplementation(_ => {
      return mockedTxn;
    });
    jest.spyOn(vueTracing, 'getActiveTransaction').mockImplementation(() => mockedTxn as unknown as Transaction);

    // create instrumentation
    const instrument = vueRouterInstrumentation(mockVueRouter);

    // instrument
    instrument(customMockStartTxn, true, true);

    // check for transaction start
    expect(customMockStartTxn).toHaveBeenCalledTimes(1);
    expect(customMockStartTxn).toHaveBeenCalledWith({
      name: '/',
      data: {
        [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
      },
      op: 'pageload',
      origin: 'auto.pageload.vue',
      tags: {
        'routing.instrumentation': 'vue-router',
      },
    });

    // now we give the transaction a custom name, thereby simulating what would
    // happen when users use the `beforeNavigate` hook
    mockedTxn.name = 'customTxnName';
    mockedTxn.toJSON = () => ({
      data: {
        [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'custom',
      },
    });

    const beforeEachCallback = mockVueRouter.beforeEach.mock.calls[0][0];
    beforeEachCallback(testRoutes['normalRoute1'], testRoutes['initialPageloadRoute'], mockNext);

    expect(mockVueRouter.beforeEach).toHaveBeenCalledTimes(1);

    expect(mockedTxn.updateName).not.toHaveBeenCalled();
    expect(mockedTxn.setAttribute).not.toHaveBeenCalled();
    expect(mockedTxn.name).toEqual('customTxnName');
  });

  test.each([
    [undefined, 1],
    [false, 0],
    [true, 1],
  ])(
    'should return instrumentation that considers the startTransactionOnPageLoad option = %p',
    (startTransactionOnPageLoad, expectedCallsAmount) => {
      // create instrumentation
      const instrument = vueRouterInstrumentation(mockVueRouter);

      // instrument
      instrument(mockStartTransaction, startTransactionOnPageLoad, true);

      // check
      expect(mockVueRouter.beforeEach).toHaveBeenCalledTimes(1);

      const beforeEachCallback = mockVueRouter.beforeEach.mock.calls[0][0];
      beforeEachCallback(testRoutes['normalRoute1'], testRoutes['initialPageloadRoute'], mockNext);

      expect(mockStartTransaction).toHaveBeenCalledTimes(expectedCallsAmount);
    },
  );

  test.each([
    [undefined, 1],
    [false, 0],
    [true, 1],
  ])(
    'should return instrumentation that considers the startTransactionOnLocationChange option = %p',
    (startTransactionOnLocationChange, expectedCallsAmount) => {
      // create instrumentation
      const instrument = vueRouterInstrumentation(mockVueRouter);

      // instrument (this will call startTrransaction once for pageloads but we can ignore that)
      instrument(mockStartTransaction, true, startTransactionOnLocationChange);

      // check
      expect(mockVueRouter.beforeEach).toHaveBeenCalledTimes(1);

      const beforeEachCallback = mockVueRouter.beforeEach.mock.calls[0][0];
      beforeEachCallback(testRoutes['normalRoute2'], testRoutes['normalRoute1'], mockNext);

      expect(mockStartTransaction).toHaveBeenCalledTimes(expectedCallsAmount + 1);
    },
  );

  it("doesn't throw when `next` is not available in the beforeEach callback (Vue Router 4)", () => {
    const instrument = vueRouterInstrumentation(mockVueRouter, { routeLabel: 'path' });
    instrument(mockStartTransaction, true, true);
    const beforeEachCallback = mockVueRouter.beforeEach.mock.calls[0][0];

    const from = testRoutes.normalRoute1;
    const to = testRoutes.namedRoute;
    beforeEachCallback(to, from, undefined);

    // first startTx call happens when the instrumentation is initialized (for pageloads)
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: '/login',
      data: {
        [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'route',
        params: to.params,
        query: to.query,
      },
      op: 'navigation',
      origin: 'auto.navigation.vue',
      tags: {
        'routing.instrumentation': 'vue-router',
      },
    });
  });
});
