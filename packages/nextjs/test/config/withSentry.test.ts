import * as SentryCore from '@sentry/core';
import { SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, addTracingExtensions } from '@sentry/core';
import type { NextApiRequest, NextApiResponse } from 'next';

import type { AugmentedNextApiResponse, NextApiHandler } from '../../src/common/types';
import { wrapApiHandlerWithSentry } from '../../src/server';

// The wrap* functions require the hub to have tracing extensions. This is normally called by the NodeClient
// constructor but the client isn't used in these tests.
addTracingExtensions();

const startSpanManualSpy = jest.spyOn(SentryCore, 'startSpanManual');

describe('withSentry', () => {
  let req: NextApiRequest, res: NextApiResponse;

  const origHandlerNoError: NextApiHandler = async (_req, res) => {
    res.send('Good dog, Maisey!');
  };

  const wrappedHandlerNoError = wrapApiHandlerWithSentry(origHandlerNoError, '/my-parameterized-route');

  beforeEach(() => {
    req = { url: 'http://dogs.are.great' } as NextApiRequest;
    res = {
      send: function (this: AugmentedNextApiResponse) {
        this.end();
      },
      end: function (this: AugmentedNextApiResponse) {
        this.finished = true;
      },
    } as unknown as AugmentedNextApiResponse;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('tracing', () => {
    it('starts a transaction and sets metadata when tracing is enabled', async () => {
      await wrappedHandlerNoError(req, res);
      expect(startSpanManualSpy).toHaveBeenCalledWith(
        {
          name: 'GET /my-parameterized-route',
          op: 'http.server',
          attributes: {
            [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'route',
            [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.nextjs',
          },
          metadata: {
            request: expect.objectContaining({ url: 'http://dogs.are.great' }),
          },
        },
        expect.any(Function),
      );
    });
  });
});
