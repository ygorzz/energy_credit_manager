import { Prisma } from './generated/prisma/client.js';

// This function was created to cover the two cases that throw a transaction error (Prisma and Adapters) instead only the P2034 error
export default function isTransactionConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return true;
  }
  // Adapters may expose a structured write conflict directly instead of P2034.
  return (
    error instanceof Error &&
    error.name === 'DriverAdapterError' &&
    typeof error.cause === 'object' &&
    error.cause !== null &&
    'kind' in error.cause &&
    error.cause.kind === 'TransactionWriteConflict'
  );
}
