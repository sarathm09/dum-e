import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Kernel } from '@dum-e/core';
import { registerTools } from './tools.js';

/** Boots the dum-e MCP server over stdio. Called by the CLI via dynamic import. */
export async function startMcp(): Promise<void> {
  const kernel = new Kernel();
  const server = new McpServer({ name: 'dum-e', version: '0.1.0' });

  registerTools(server, kernel);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', () => {
    kernel.close();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    kernel.close();
    process.exit(0);
  });
}
