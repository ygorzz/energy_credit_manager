import 'vitest';

// Type the destination metadata passed from the Vitest coordinator to isolated workers.
declare module 'vitest' {
  export interface ProvidedContext {
    testDatabaseUrl: string;
    applicationDatabaseUrl: string;
  }
}
