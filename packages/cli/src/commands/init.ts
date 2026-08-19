import { configPath, dbPath } from '@dum-e/core';
import { getKernel } from '../kernel.js';
import { emit, info, ok } from '../format.js';

/** Materializes config + db (both auto-created by the kernel) and reports where. */
export function initCommand(): void {
  const kernel = getKernel();
  kernel.loadConfig();
  emit({ config: configPath(), db: dbPath() }, () => {
    ok('dum-e initialized');
    info(`config: ${configPath()}`);
    info(`db:     ${dbPath()}`);
  });
}
