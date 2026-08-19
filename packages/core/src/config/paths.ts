import { homedir } from 'node:os';
import { join } from 'node:path';

/** Root runtime dir. Override with $DUM_E_HOME (used by tests for isolation). */
export function configDir(): string {
  return process.env.DUM_E_HOME ?? join(homedir(), '.config', 'dum-e');
}

export function configPath(): string {
  return join(configDir(), 'config.yaml');
}

export function dbPath(): string {
  return join(configDir(), 'db');
}

export function attachmentsDir(): string {
  return join(configDir(), 'attachments');
}
