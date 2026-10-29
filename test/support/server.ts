import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import request from 'supertest';

let server: Server | undefined;

// Import after test configuration is installed and let the OS choose an available local port.
export async function startServer() {
  const { default: app } = await import('../../src/app.js');
  server = createServer(app);
  const listening = once(server, 'listening');
  server.listen(0, '127.0.0.1');
  await listening;
}

// All requests share the listening server, including its real middleware and rate limiters.
export function api() {
  if (!server?.listening) throw new Error('The integration HTTP server has not started.');
  return request(server);
}

// Close idle sockets as well as the listener so HTTP connections cannot keep Vitest running.
export async function stopServer() {
  const running = server;
  server = undefined;
  if (!running?.listening) return;
  await new Promise<void>((resolve, reject) => {
    running.close((error) => (error ? reject(error) : resolve()));
    running.closeIdleConnections();
  });
}
