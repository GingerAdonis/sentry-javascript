export type {
  Breadcrumb,
  BreadcrumbHint,
  Request,
  SdkInfo,
  Event,
  EventHint,
  Exception,
  SeverityLevel,
  StackFrame,
  Stacktrace,
  Thread,
  Transaction,
  User,
  Session,
} from '@sentry/types';

export type { BrowserOptions } from './client';

export type { ReportDialogOptions } from './sdk';

export {
  // eslint-disable-next-line deprecation/deprecation
  addGlobalEventProcessor,
  addEventProcessor,
  addBreadcrumb,
  addIntegration,
  captureException,
  captureEvent,
  captureMessage,
  close,
  createTransport,
  flush,
  // eslint-disable-next-line deprecation/deprecation
  getCurrentHub,
  getClient,
  isInitialized,
  getCurrentScope,
  getIsolationScope,
  getGlobalScope,
  Hub,
  // eslint-disable-next-line deprecation/deprecation
  makeMain,
  setCurrentClient,
  Scope,
  // eslint-disable-next-line deprecation/deprecation
  startTransaction,
  getActiveSpan,
  startSpan,
  startInactiveSpan,
  startSpanManual,
  continueTrace,
  SDK_VERSION,
  setContext,
  setExtra,
  setExtras,
  setTag,
  setTags,
  setUser,
  withScope,
  withIsolationScope,
  // eslint-disable-next-line deprecation/deprecation
  FunctionToString,
  // eslint-disable-next-line deprecation/deprecation
  InboundFilters,
  functionToStringIntegration,
  inboundFiltersIntegration,
  parameterize,
  startSession,
  captureSession,
  endSession,
} from '@sentry/core';

export {
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN,
  SEMANTIC_ATTRIBUTE_SENTRY_SOURCE,
  SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE,
} from '@sentry/core';

export * from './metrics';

export { WINDOW } from './helpers';
export { BrowserClient } from './client';
export { makeFetchTransport, makeXHRTransport } from './transports';
export {
  defaultStackParser,
  defaultStackLineParsers,
  chromeStackLineParser,
  geckoStackLineParser,
  opera10StackLineParser,
  opera11StackLineParser,
  winjsStackLineParser,
} from './stack-parsers';
export { eventFromException, eventFromMessage, exceptionFromError } from './eventbuilder';
export { createUserFeedbackEnvelope } from './userfeedback';
export {
  // eslint-disable-next-line deprecation/deprecation
  defaultIntegrations,
  getDefaultIntegrations,
  forceLoad,
  init,
  onLoad,
  showReportDialog,
  captureUserFeedback,
  // eslint-disable-next-line deprecation/deprecation
  wrap,
} from './sdk';

export { breadcrumbsIntegration } from './integrations/breadcrumbs';
export { dedupeIntegration } from './integrations/dedupe';
export { globalHandlersIntegration } from './integrations/globalhandlers';
export { httpContextIntegration } from './integrations/httpcontext';
export { linkedErrorsIntegration } from './integrations/linkederrors';
export { browserApiErrorsIntegration } from './integrations/trycatch';

// eslint-disable-next-line deprecation/deprecation
export { TryCatch, Breadcrumbs, LinkedErrors, HttpContext, Dedupe } from './integrations';
