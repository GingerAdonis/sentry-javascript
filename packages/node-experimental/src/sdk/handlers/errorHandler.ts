import type * as http from 'http';
import { captureException, getClient, getIsolationScope } from '@sentry/core';
import type { NodeClient } from '../client';

interface MiddlewareError extends Error {
  status?: number | string;
  statusCode?: number | string;
  status_code?: number | string;
  output?: {
    statusCode?: number | string;
  };
}

/**
 * An Express-compatible error handler.
 */
export function errorHandler(options?: {
  /**
   * Callback method deciding whether error should be captured and sent to Sentry
   * @param error Captured middleware error
   */
  shouldHandleError?(this: void, error: MiddlewareError): boolean;
}): (
  error: MiddlewareError,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: (error: MiddlewareError) => void,
) => void {
  return function sentryErrorMiddleware(
    error: MiddlewareError,
    _req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (error: MiddlewareError) => void,
  ): void {
    const shouldHandleError = options?.shouldHandleError || defaultShouldHandleError;

    if (shouldHandleError(error)) {
      const client = getClient<NodeClient>();
      if (client && client.getOptions().autoSessionTracking) {
        // Check if the `SessionFlusher` is instantiated on the client to go into this branch that marks the
        // `requestSession.status` as `Crashed`, and this check is necessary because the `SessionFlusher` is only
        // instantiated when the the`requestHandler` middleware is initialised, which indicates that we should be
        // running in SessionAggregates mode
        const isSessionAggregatesMode = client['_sessionFlusher'] !== undefined;
        if (isSessionAggregatesMode) {
          const requestSession = getIsolationScope().getRequestSession();
          // If an error bubbles to the `errorHandler`, then this is an unhandled error, and should be reported as a
          // Crashed session. The `_requestSession.status` is checked to ensure that this error is happening within
          // the bounds of a request, and if so the status is updated
          if (requestSession && requestSession.status !== undefined) {
            requestSession.status = 'crashed';
          }
        }
      }

      const eventId = captureException(error, { mechanism: { type: 'middleware', handled: false } });
      (res as { sentry?: string }).sentry = eventId;
      next(error);

      return;
    }

    next(error);
  };
}

function getStatusCodeFromResponse(error: MiddlewareError): number {
  const statusCode = error.status || error.statusCode || error.status_code || (error.output && error.output.statusCode);
  return statusCode ? parseInt(statusCode as string, 10) : 500;
}

/** Returns true if response code is internal server error */
function defaultShouldHandleError(error: MiddlewareError): boolean {
  const status = getStatusCodeFromResponse(error);
  return status >= 500;
}
