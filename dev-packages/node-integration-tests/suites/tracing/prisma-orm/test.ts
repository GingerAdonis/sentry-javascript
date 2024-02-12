import { TestEnv, assertSentryTransaction } from '../../../utils';

describe('Prisma ORM Integration', () => {
  test('should instrument Prisma client for tracing.', async () => {
    const env = await TestEnv.init(__dirname);
    const envelope = await env.getEnvelopeRequest({ envelopeType: 'transaction' });

    assertSentryTransaction(envelope[2], {
      transaction: 'Test Transaction',
      spans: [
        {
          description: 'User create',
          op: 'db.prisma',
          data: { 'db.system': 'postgresql', 'db.operation': 'create', 'db.prisma.version': '5.9.1' },
        },
        {
          description: 'User findMany',
          op: 'db.prisma',
          data: { 'db.system': 'postgresql', 'db.operation': 'findMany', 'db.prisma.version': '5.9.1' },
        },
        {
          description: 'User deleteMany',
          op: 'db.prisma',
          data: { 'db.system': 'postgresql', 'db.operation': 'deleteMany', 'db.prisma.version': '5.9.1' },
        },
      ],
    });
  });
});
