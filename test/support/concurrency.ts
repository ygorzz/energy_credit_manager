import { setTimeout } from 'node:timers/promises';
import type { Response } from 'supertest';
import { connectTestPostgres } from './postgres.js';

// Hold the shared balance until PostgreSQL confirms both HTTP transactions are blocked.
export async function raceOnBalance(balanceId: string, requests: () => PromiseLike<Response>[]) {
  const gate = await connectTestPostgres();
  let transactionOpen = false;
  let pending: Promise<PromiseSettledResult<Response>[]> | undefined;
  try {
    await gate.query('BEGIN');
    transactionOpen = true;
    await gate.query("SET LOCAL lock_timeout = '3s'");
    const locked = await gate.query(
      'SELECT id FROM "MonthlyDistributorBalance" WHERE id = $1 FOR UPDATE',
      [balanceId],
    );
    if (locked.rowCount !== 1) throw new Error('The concurrency gate needs an existing balance.');
    const session = await gate.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    const pid = session.rows[0]?.pid;
    const calls = requests();
    if (calls.length !== 2) throw new Error('Each coordinated race requires two HTTP operations.');
    // Attach handlers immediately; awaiting Supertest starts the actual HTTP requests.
    pending = Promise.allSettled(calls.map((call) => Promise.resolve(call)));
    const deadline = Date.now() + 3_000;
    let blocked = 0;
    while (Date.now() < deadline) {
      await gate.query('SELECT pg_stat_clear_snapshot()');
      // A second edit may wait behind the first edit, so include indirect blockers as well.
      const result = await gate.query<{ count: number }>(
        `
        WITH RECURSIVE blocked AS (
          SELECT pid FROM pg_stat_activity
          WHERE datname = current_database() AND $1 = ANY(pg_blocking_pids(pid))
          UNION
          SELECT activity.pid FROM pg_stat_activity activity
          JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
          WHERE activity.datname = current_database()
        )
        SELECT COUNT(DISTINCT pid)::int AS count FROM blocked
      `,
        [pid],
      );
      blocked = result.rows[0]?.count ?? 0;
      if (blocked >= 2) break;
      await setTimeout(20);
    }
    if (blocked < 2) throw new Error('Both transactions must overlap before releasing the gate.');
    await gate.query('COMMIT');
    transactionOpen = false;
    const results = await pending;
    return results.map((result) => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    });
  } finally {
    try {
      if (transactionOpen) await gate.query('ROLLBACK');
      // Settle outstanding requests before the test harness truncates any business tables.
      if (pending) await pending;
    } finally {
      await gate.end();
    }
  }
}
