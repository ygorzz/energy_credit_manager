import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';

export const TEST_DATABASE_NAME = 'energy_credit_manager_test';
export const TEST_LOCK_KEY = 20261027;

// Compare database destinations independently of credentials and loopback address spelling.
function databaseIdentity(value: string): string {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const host = ['localhost', '127.0.0.1', '::1'].includes(hostname) ? 'loopback' : hostname;
  return `${host}:${url.port || '5432'}/${decodeURIComponent(url.pathname.slice(1))}`;
}

// Validate the destination before migrations, connections or cleanup can touch any data.
export function validateTestDatabaseUrl(
  value: string | undefined,
  applicationDatabaseUrl?: string,
): string {
  if (!value)
    throw new Error('TEST_DATABASE_URL is required; no application database fallback is allowed.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('TEST_DATABASE_URL must use PostgreSQL.');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    throw new Error('Integration tests require a local PostgreSQL server.');
  }
  if (decodeURIComponent(url.pathname.slice(1)) !== TEST_DATABASE_NAME) {
    throw new Error(`Integration tests only accept the database ${TEST_DATABASE_NAME}.`);
  }
  // Connection-string query parameters must not override the guarded host/database.
  const allowed = ['schema', 'sslmode', 'application_name'];
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key)) {
      throw new Error('TEST_DATABASE_URL contains an unsupported connection override.');
    }
  }
  if (url.searchParams.has('schema') && url.searchParams.get('schema') !== 'public') {
    throw new Error('Integration tests require the public schema.');
  }
  if (applicationDatabaseUrl) {
    let applicationIdentity: string;
    try {
      applicationIdentity = databaseIdentity(applicationDatabaseUrl);
    } catch {
      throw new Error('The application database URL could not be checked safely.');
    }
    if (databaseIdentity(value) === applicationIdentity) {
      throw new Error('The integration database must differ from the application database.');
    }
  }
  // An explicit default prevents PGPORT from silently changing the checked destination.
  url.port ||= '5432';
  return url.toString();
}

// Read local configuration without installing application credentials into the process environment.
function readEnvironmentFile(file: string): Record<string, string> {
  return existsSync(file) ? parse(readFileSync(file)) : {};
}

// Prefer explicit test configuration and generate a fresh signing secret for each run.
export function loadTestEnvironment() {
  const application = readEnvironmentFile('.env');
  const test = readEnvironmentFile('.env.test');
  const applicationDatabaseUrl = process.env.DATABASE_URL ?? application.DATABASE_URL;
  const databaseUrl = validateTestDatabaseUrl(
    process.env.TEST_DATABASE_URL ?? test.TEST_DATABASE_URL ?? application.TEST_DATABASE_URL,
    applicationDatabaseUrl,
  );
  return {
    databaseUrl,
    // Workers only need the destination identity, never the application's credentials.
    applicationDatabaseUrl: applicationDatabaseUrl
      ? `postgresql://${new URL(applicationDatabaseUrl).host}${new URL(applicationDatabaseUrl).pathname}`
      : '',
    jwtSecret: randomBytes(32).toString('hex'),
  };
}
