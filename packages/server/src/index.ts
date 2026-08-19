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

  // Node http.Server under @hono/node-server. Long-lived SSE (`/events`)
  // connections keep server.close()'s callback from ever firing, so on
  // shutdown we drop open sockets and hard-exit with a short fallback timer.
  const httpServer = server as unknown as {
    close: (cb?: () => void) => void;
    closeAllConnections?: () => void;
  };

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) {
      // Second Ctrl-C: exit now.
      process.exit(0);
    }
    shuttingDown = true;
    console.log('[dum-e/server] shutting down...');
    httpServer.closeAllConnections?.();
    httpServer.close(() => {
      kernel.close();
      process.exit(0);
    });
    // Fallback in case a connection refuses to drain.
    setTimeout(() => {
      kernel.close();
      process.exit(0);
    }, 1000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return {
    stop: () => {
      httpServer.closeAllConnections?.();
      httpServer.close();
      kernel.close();
    },
  };
}
