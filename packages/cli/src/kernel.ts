import { Kernel } from '@dum-e/core';

let instance: Kernel | null = null;

/** Lazily builds the shared kernel (opens the DB, creating it if missing). */
export function getKernel(): Kernel {
  if (!instance) instance = new Kernel();
  return instance;
}
