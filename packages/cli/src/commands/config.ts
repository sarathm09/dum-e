import { stringify as stringifyYaml } from 'yaml';
import { configPath } from '@dum-e/core';
import { getKernel } from '../kernel.js';
import { isJson } from '../format.js';

export function configShow(): void {
  const cfg = getKernel().loadConfig();
  console.log(isJson() ? JSON.stringify(cfg, null, 2) : stringifyYaml(cfg));
}

export function configPathCommand(): void {
  console.log(isJson() ? JSON.stringify({ path: configPath() }, null, 2) : configPath());
}
