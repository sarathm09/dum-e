import { serve } from '@hono/node-server';
import { Kernel } from '@dum-e/core';
import { createApp } from './app.js';

export { createApp } from './app.js';

export interface StartServerOptions {
  host?: string;
  port?: string | number;
}

/**
 * Boots the dum-e HTTP server: builds a Kernel, resolves host/port from config
 * (overridable via opts), and starts listening. Returns a stop() to shut down cleanly.
 */
export function startServer(opts: StartServerOptions = {}): { stop: () => void } {
  const kernel = new Kernel();
  const cfg = kernel.loadConfig();

  const host = opts.host ?? cfg.server.host;
  const port = Number(opts.port ?? cfg.server.port);

  const app = createApp(kernel);
  const server = serve({ fetch: app.fetch, hostname: host, port }, (info) => {
    console.log(`[dum-e/server] listening on http://${host}:${info.port}`);
  });

  const shutdown = () => {
    console.log('[dum-e/server] shutting down...');
    server.close(() => {
      kernel.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return {
    stop: () => {
      server.close();
      kernel.close();
    },
  };
}
