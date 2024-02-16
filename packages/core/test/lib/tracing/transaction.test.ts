import { SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE, SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, Transaction } from '../../../src';

describe('transaction', () => {
  describe('name', () => {
    /* eslint-disable deprecation/deprecation */
    it('works with name', () => {
      const transaction = new Transaction({ name: 'span name' });
      expect(transaction.name).toEqual('span name');
    });

    it('allows to update the name via setter', () => {
      const transaction = new Transaction({ name: 'span name' });
      transaction.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, 'route');
      expect(transaction.name).toEqual('span name');

      transaction.name = 'new name';

      expect(transaction.name).toEqual('new name');
      expect(transaction.metadata.source).toEqual('custom');
    });

    it('allows to update the name via setName', () => {
      const transaction = new Transaction({ name: 'span name' });
      transaction.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, 'route');
      expect(transaction.name).toEqual('span name');

      transaction.updateName('new name');

      expect(transaction.name).toEqual('new name');
      expect(transaction.metadata.source).toEqual('custom');
    });

    it('allows to update the name via updateName', () => {
      const transaction = new Transaction({ name: 'span name' });
      transaction.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, 'route');
      expect(transaction.name).toEqual('span name');

      transaction.updateName('new name');

      expect(transaction.name).toEqual('new name');
      expect(transaction.metadata.source).toEqual('route');
    });
    /* eslint-enable deprecation/deprecation */
  });

  describe('metadata', () => {
    /* eslint-disable deprecation/deprecation */
    it('works with defaults', () => {
      const transaction = new Transaction({ name: 'span name' });
      expect(transaction.metadata).toEqual({
        source: 'custom',
        spanMetadata: {},
      });
    });

    it('allows to set metadata in constructor', () => {
      const transaction = new Transaction({ name: 'span name', metadata: { source: 'url', request: {} } });
      expect(transaction.metadata).toEqual({
        source: 'url',
        spanMetadata: {},
        request: {},
      });
    });

    it('allows to set source & sample rate data in constructor', () => {
      const transaction = new Transaction({
        name: 'span name',
        metadata: { request: {} },
        attributes: {
          [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
          [SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE]: 0.5,
        },
      });
      expect(transaction.metadata).toEqual({
        source: 'url',
        sampleRate: 0.5,
        spanMetadata: {},
        request: {},
      });
    });

    it('allows to update metadata via setMetadata', () => {
      const transaction = new Transaction({ name: 'span name', metadata: { source: 'url', request: {} } });

      transaction.setMetadata({ source: 'route' });

      expect(transaction.metadata).toEqual({
        source: 'route',
        spanMetadata: {},
        request: {},
      });
    });

    it('allows to update metadata via setAttribute', () => {
      const transaction = new Transaction({ name: 'span name', metadata: { source: 'url', request: {} } });

      transaction.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, 'route');

      expect(transaction.metadata).toEqual({
        source: 'route',
        spanMetadata: {},
        request: {},
      });
    });
    /* eslint-enable deprecation/deprecation */
  });
});
