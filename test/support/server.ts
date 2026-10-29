import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import request from 'supertest';

let server: Server | undefined;

export async function startServer() {
  const { default: app } = await import('../../src/app.js');
  server = createServer(app);
  const listening = once(server, 'listening');
  server.listen(0, '127.0.0.1');
  await listening;
}

export function api() {
  if (!server?.listening) throw new Error('The integration HTTP server has not started.');
  return request(server);
}

export async function stopServer() {
  const running = server;
  server = undefined;
  if (!running?.listening) return;
  await new Promise<void>((resolve, reject) => {
    running.close((error) => (error ? reject(error) : resolve()));
    running.closeIdleConnections();
  });
}
